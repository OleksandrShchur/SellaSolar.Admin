using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SellaSolar.Admin.Application.Auth;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Infrastructure.Identity;
using SellaSolar.Admin.Infrastructure.Options;
using SellaSolar.Admin.Infrastructure.Services;

namespace SellaSolar.Admin.Application.Services;

public class AuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly AuthSecurityLogger _securityLogger;
    private readonly AuthOptions _authOptions;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        AuthSecurityLogger securityLogger,
        IOptions<AuthOptions> authOptions)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _securityLogger = securityLogger;
        _authOptions = authOptions.Value;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ValidationException(AuthMessages.InvalidCredentials);
        }

        // Login accepts only canonical 0XXXXXXXXX (no auto-normalization of +380).
        if (!PhoneValidator.IsValid(request.Phone))
        {
            throw new ValidationException(AuthMessages.InvalidCredentials);
        }

        var normalized = PhoneValidator.NormalizeForLookup(request.Phone);
        var user = await _userManager.Users
            .FirstOrDefaultAsync(u => u.NormalizedUserName == normalized, ct);

        if (user is null)
        {
            throw new ValidationException(AuthMessages.InvalidCredentials);
        }

        if (user.IsBlocked)
        {
            var blockedPasswordOk = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!blockedPasswordOk)
            {
                throw new ValidationException(AuthMessages.InvalidCredentials);
            }

            throw new ValidationException(AuthMessages.AccountBlocked);
        }

        if (!user.IsActive)
        {
            var inactivePasswordOk = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!inactivePasswordOk)
            {
                throw new ValidationException(AuthMessages.InvalidCredentials);
            }

            throw new ValidationException(AuthMessages.AccountInactive);
        }

        var passwordOk = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordOk)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= _authOptions.MaxFailedLoginsBeforeBlock)
            {
                user.IsBlocked = true;
                user.BlockedAt = DateTimeOffset.UtcNow;
                await _userManager.UpdateAsync(user);
                await _securityLogger.LogAsync(
                    AuthSecurityEventTypes.UserBlocked,
                    actorUserId: null,
                    targetUserId: user.Id,
                    ipAddress,
                    ct);
            }
            else
            {
                await _userManager.UpdateAsync(user);
            }

            throw new ValidationException(AuthMessages.InvalidCredentials);
        }

        user.FailedLoginCount = 0;
        await _userManager.UpdateAsync(user);

        await _signInManager.SignInAsync(user, isPersistent: true);
        var roles = await _userManager.GetRolesAsync(user);
        return new LoginResponse(user.Id, user.UserName!, user.FullName, roles.ToList());
    }

    public async Task LogoutAsync()
    {
        await _signInManager.SignOutAsync();
    }

    public async Task<CurrentUserDto?> GetCurrentUserAsync(System.Security.Claims.ClaimsPrincipal principal)
    {
        var user = await _userManager.GetUserAsync(principal);
        if (user is null || !user.IsActive || user.IsBlocked)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);
        return new CurrentUserDto(user.Id, user.UserName!, user.FullName, roles.ToList());
    }

    public async Task ChangePasswordAsync(
        System.Security.Claims.ClaimsPrincipal principal,
        ChangePasswordRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ValidationException("Поточний і новий пароль обов'язкові.");
        }

        if (request.NewPassword.Length < 8)
        {
            throw new ValidationException("Новий пароль має містити щонайменше 8 символів.");
        }

        var user = await _userManager.GetUserAsync(principal)
            ?? throw new ValidationException(AuthMessages.SessionExpired);

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var msg = result.Errors.FirstOrDefault()?.Description ?? "Не вдалося змінити пароль.";
            throw new ValidationException(msg);
        }

        await _userManager.UpdateSecurityStampAsync(user);
        await _signInManager.RefreshSignInAsync(user);
    }
}
