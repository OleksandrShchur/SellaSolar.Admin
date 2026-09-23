using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Auth;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Infrastructure.Identity;
using SellaSolar.Admin.Infrastructure.Services;

namespace SellaSolar.Admin.Application.Services;

public class UserManagementService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly AuthSecurityLogger _securityLogger;

    public UserManagementService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        AuthSecurityLogger securityLogger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _securityLogger = securityLogger;
    }

    public async Task<IReadOnlyList<UserListItemDto>> GetAllAsync(
        bool? isActive,
        bool? isBlocked,
        string? search,
        CancellationToken ct)
    {
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
                u.FullName.Contains(term));
        }

        var users = await query.OrderBy(u => u.FullName).ToListAsync(ct);
        var result = new List<UserListItemDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(Map(user, roles.FirstOrDefault() ?? AppRoles.Worker));
        }

        return result;
    }

    public async Task<UserListItemDto> CreateAsync(CreateUserRequest request, CancellationToken ct)
    {
        ValidateUsername(request.Username);
        ValidatePassword(request.Password);
        ValidateRole(request.Role);

        if (!UsernameValidator.IsValid(request.Username))
        {
            throw new ValidationException(
                "Ім'я користувача може містити лише латинські літери, цифри та символи .-_");
        }

        var normalized = UsernameValidator.NormalizeForLookup(request.Username);
        if (await _userManager.Users.AnyAsync(u => u.NormalizedUserName == normalized, ct))
        {
            throw new ConflictException("Користувач з таким ім'ям уже існує.");
        }

        var user = new ApplicationUser
        {
            UserName = request.Username.Trim(),
            FullName = request.FullName.Trim(),
            IsActive = true,
            Email = null,
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
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new NotFoundException("Користувача не знайдено.");

        user.FullName = request.FullName.Trim();
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

        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            await EnsureNotLastActiveAdminAsync(user.Id, ct);
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

    public async Task<string> SuggestUsernameAsync(string fullName, CancellationToken ct)
    {
        var baseName = UsernameTransliteration.SuggestFromFullName(fullName);
        var candidate = baseName;
        var suffix = 2;
        while (await _userManager.Users.AnyAsync(
                   u => u.NormalizedUserName == UsernameValidator.NormalizeForLookup(candidate), ct))
        {
            candidate = $"{baseName}{suffix}";
            suffix++;
        }

        return candidate;
    }

    private async Task EnsureNotLastActiveAdminAsync(string excludingUserId, CancellationToken ct)
    {
        var admins = await _userManager.GetUsersInRoleAsync(AppRoles.Admin);
        var activeOthers = admins.Count(a => a.IsActive && a.Id != excludingUserId);
        if (activeOthers == 0)
        {
            throw new ConflictException("Не можна деактивувати останнього активного адміністратора.");
        }
    }

    private static UserListItemDto Map(ApplicationUser user, string role) =>
        new(
            user.Id,
            user.UserName!,
            user.FullName,
            role,
            user.IsActive,
            user.IsBlocked,
            user.BlockedAt,
            user.FailedLoginCount,
            user.CreatedAt);

    private static void ValidateUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            throw new ValidationException("Ім'я користувача обов'язкове.");
        }
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
}
