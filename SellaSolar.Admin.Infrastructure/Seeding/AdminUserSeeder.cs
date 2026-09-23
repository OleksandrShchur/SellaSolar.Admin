using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Infrastructure.Identity;
using SellaSolar.Admin.Infrastructure.Options;

namespace SellaSolar.Admin.Infrastructure.Seeding;

public static class AdminUserSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("AdminUserSeeder");
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
        var authOptions = sp.GetRequiredService<IOptions<AuthOptions>>().Value;

        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        var adminRoleUsers = await userManager.GetUsersInRoleAsync(AppRoles.Admin);
        if (adminRoleUsers.Count > 0)
        {
            logger.LogInformation("Admin user(s) already exist; skipping seed admins.");
            return;
        }

        foreach (var seed in authOptions.SeedAdmins)
        {
            if (string.IsNullOrWhiteSpace(seed.Username) || string.IsNullOrWhiteSpace(seed.Password))
            {
                logger.LogWarning(
                    "Skipping seed admin {Username}: username or password not configured (use user-secrets).",
                    seed.Username);
                continue;
            }

            if (!UsernameValidator.IsValid(seed.Username))
            {
                logger.LogWarning("Skipping seed admin {Username}: invalid username format.", seed.Username);
                continue;
            }

            var existing = await userManager.Users
                .FirstOrDefaultAsync(u => u.NormalizedUserName == UsernameValidator.NormalizeForLookup(seed.Username), ct);
            if (existing is not null)
            {
                continue;
            }

            var user = new ApplicationUser
            {
                UserName = seed.Username.Trim(),
                FullName = string.IsNullOrWhiteSpace(seed.FullName) ? seed.Username : seed.FullName.Trim(),
                IsActive = true,
                Email = null,
                EmailConfirmed = false,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            var result = await userManager.CreateAsync(user, seed.Password);
            if (!result.Succeeded)
            {
                logger.LogError(
                    "Failed to create seed admin {Username}: {Errors}",
                    seed.Username,
                    string.Join(", ", result.Errors.Select(e => e.Description)));
                continue;
            }

            await userManager.AddToRoleAsync(user, AppRoles.Admin);
            logger.LogInformation("Created seed admin user {UserId} ({Username}).", user.Id, user.UserName);
        }
    }
}
