using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Domain.Constants;
using SellaSolar.Admin.Infrastructure.Identity;
using SellaSolar.Admin.Infrastructure.Services;

namespace SellaSolar.Admin.Application.Services;

public class UserManagementService
{
    private const string InvalidPhoneMessage =
        "Телефон має бути у форматі 0XXXXXXXXX (10 цифр, починається з 0).";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AuthSecurityLogger _securityLogger;

    public UserManagementService(
        UserManager<ApplicationUser> userManager,
        AuthSecurityLogger securityLogger)
    {
        _userManager = userManager;
        _securityLogger = securityLogger;
    }

    public async Task<IReadOnlyList<UserListItemDto>> GetAllAsync(
        string? role,
        bool? isActive,
        bool? isBlocked,
        string? search,
        CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(role) && !AppRoles.All.Contains(role))
        {
            throw new ValidationException("Невідома роль користувача.");
        }

        var query = _userManager.Users.AsNoTracking().AsQueryable();

        if (isActive is not null)
        {
            query = query.Where(u => u.IsActive == isActive);
        }

        if (isBlocked is not null)
        {
            query = query.Where(u => u.IsBlocked == isBlocked);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u =>
                u.UserName!.Contains(term) ||
                u.FullName.Contains(term) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(term)));
        }

        var users = await query.OrderBy(u => u.FullName).ToListAsync(ct);
        var result = new List<UserListItemDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var userRole = roles.Contains(AppRoles.Admin)
                ? AppRoles.Admin
                : roles.FirstOrDefault() ?? AppRoles.Worker;
            if (!string.IsNullOrWhiteSpace(role) &&
                !roles.Contains(role, StringComparer.Ordinal))
            {
                continue;
            }

            result.Add(Map(user, userRole));
        }

        return result;
    }

    /// <summary>Active field workers for project assignment pickers.</summary>
    public async Task<IReadOnlyList<UserListItemDto>> GetWorkersForAssignmentAsync(CancellationToken ct)
    {
        var workers = await _userManager.GetUsersInRoleAsync(AppRoles.Worker);
        return workers
            .Where(u => u.IsActive && !u.IsBlocked)
            .OrderBy(u => u.FullName)
            .Select(u => Map(u, AppRoles.Worker))
            .ToList();
    }

    public async Task<UserListItemDto> CreateAsync(CreateUserRequest request, CancellationToken ct)
    {
        ValidatePassword(request.Password);
        ValidateRole(request.Role);
        ValidateWorkerType(request.Role, request.WorkerType);
        var phone = RequireCanonicalPhone(request.Phone);

        var normalized = PhoneValidator.NormalizeForLookup(phone);
        if (await _userManager.Users.AnyAsync(u => u.NormalizedUserName == normalized, ct))
        {
            throw new ConflictException("Користувач з таким телефоном уже існує.");
        }

        var user = new ApplicationUser
        {
            UserName = phone,
            FullName = request.FullName.Trim(),
            PhoneNumber = phone,
            WorkerType = request.Role == AppRoles.Worker ? request.WorkerType : null,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            throw new ValidationException(string.Join(" ", createResult.Errors.Select(e => e.Description)));
        }

        await _userManager.AddToRoleAsync(user, request.Role);
        return Map(user, request.Role);
    }

    public async Task<UserListItemDto> UpdateAsync(string id, UpdateUserRequest request, CancellationToken ct)
    {
        ValidateRole(request.Role);
        ValidateWorkerType(request.Role, request.WorkerType);
        var phone = RequireCanonicalPhone(request.Phone);

        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("Користувача не знайдено.");

        var normalized = PhoneValidator.NormalizeForLookup(phone);
        if (await _userManager.Users.AnyAsync(
                u => u.NormalizedUserName == normalized && u.Id != id, ct))
        {
            throw new ConflictException("Користувач з таким телефоном уже існує.");
        }

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = phone;
        user.WorkerType = request.Role == AppRoles.Worker ? request.WorkerType : null;

        if (!string.Equals(user.UserName, phone, StringComparison.Ordinal))
        {
            var setNameResult = await _userManager.SetUserNameAsync(user, phone);
            if (!setNameResult.Succeeded)
            {
                throw new ValidationException(string.Join(" ", setNameResult.Errors.Select(e => e.Description)));
            }
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new ValidationException(string.Join(" ", updateResult.Errors.Select(e => e.Description)));
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        if (!currentRoles.Contains(request.Role))
        {
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            await _userManager.AddToRoleAsync(user, request.Role);
            await _userManager.UpdateSecurityStampAsync(user);
        }

        return Map(user, request.Role);
    }

    public async Task ResetPasswordAsync(string id, ResetUserPasswordRequest request, CancellationToken ct)
    {
        ValidatePassword(request.NewPassword);
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("Користувача не знайдено.");

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new ValidationException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        await _userManager.UpdateSecurityStampAsync(user);
    }

    public async Task ActivateAsync(string id, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("Користувача не знайдено.");

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(AppRoles.Worker) && !roles.Contains(AppRoles.Admin))
        {
            throw new ValidationException("Можна активувати лише виконавців або адміністраторів.");
        }

        user.IsActive = true;
        await _userManager.UpdateAsync(user);
        await _userManager.UpdateSecurityStampAsync(user);
    }

    public async Task DeactivateAsync(string actorUserId, string targetUserId, CancellationToken ct)
    {
        if (actorUserId == targetUserId)
        {
            throw new ValidationException("Не можна деактивувати власний обліковий запис.");
        }

        var user = await _userManager.FindByIdAsync(targetUserId)
            ?? throw new NotFoundException("Користувача не знайдено.");

        if (!await _userManager.IsInRoleAsync(user, AppRoles.Worker))
        {
            throw new ValidationException("Можна деактивувати лише виконавців.");
        }

        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        await _userManager.UpdateSecurityStampAsync(user);
    }

    public async Task UnblockAsync(
        string actorUserId,
        string targetUserId,
        string? ipAddress,
        CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(targetUserId)
            ?? throw new NotFoundException("Користувача не знайдено.");

        user.IsBlocked = false;
        user.BlockedAt = null;
        user.FailedLoginCount = 0;
        await _userManager.UpdateAsync(user);

        await _securityLogger.LogAsync(
            AuthSecurityEventTypes.UserUnblocked,
            actorUserId,
            targetUserId,
            ipAddress,
            ct);
    }

    public Task BlockAsync(string actorUserId, string targetUserId, CancellationToken ct)
    {
        // Manual block is disabled; lockout happens only via failed login attempts in AuthService.
        _ = (actorUserId, targetUserId, ct);
        throw new ValidationException(
            "Ручне блокування недоступне. Обліковий запис блокується лише після невдалих спроб входу.");
    }

    private static UserListItemDto Map(ApplicationUser user, string role) =>
        new(
            user.Id,
            user.UserName!,
            user.FullName,
            role,
            user.PhoneNumber,
            user.WorkerType,
            user.IsActive,
            user.IsBlocked,
            user.BlockedAt,
            user.FailedLoginCount,
            user.CreatedAt);

    private static string RequireCanonicalPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            throw new ValidationException("Телефон обов'язковий.");
        }

        // Create/update accept only canonical form (no +380 auto-cast in API).
        if (!PhoneValidator.IsValid(phone))
        {
            throw new ValidationException(InvalidPhoneMessage);
        }

        return PhoneValidator.NormalizeForLookup(phone);
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            throw new ValidationException("Пароль має містити щонайменше 8 символів.");
        }
    }

    private static void ValidateRole(string role)
    {
        if (!AppRoles.All.Contains(role))
        {
            throw new ValidationException("Невідома роль користувача.");
        }
    }

    private static void ValidateWorkerType(string role, string? workerType)
    {
        if (role != AppRoles.Worker)
        {
            return;
        }

        if (!WorkerTypes.IsValid(workerType))
        {
            throw new ValidationException("Тип працівника має бути Assembler або Installer.");
        }
    }
}
