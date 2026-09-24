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
            if (string.IsNullOrWhiteSpace(seed.Phone) || string.IsNullOrWhiteSpace(seed.Password))
            {
                logger.LogWarning(
                    "Skipping seed admin {Phone}: phone or password not configured (use user-secrets).",
                    seed.Phone);
                continue;
            }

            if (!PhoneValidator.IsValid(seed.Phone))
            {
                logger.LogWarning(
                    "Skipping seed admin {Phone}: phone must be 0XXXXXXXXX.",
                    seed.Phone);
                continue;
            }

            var phone = PhoneValidator.NormalizeForLookup(seed.Phone);
            var existing = await userManager.Users
                .FirstOrDefaultAsync(u => u.NormalizedUserName == phone, ct);
            if (existing is not null)
            {
                continue;
            }

            var user = new ApplicationUser
            {
                UserName = phone,
                PhoneNumber = phone,
                FullName = string.IsNullOrWhiteSpace(seed.FullName) ? phone : seed.FullName.Trim(),
                IsActive = true,
                Email = null,
                EmailConfirmed = false,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            var result = await userManager.CreateAsync(user, seed.Password);
            if (!result.Succeeded)
            {
                logger.LogError(
                    "Failed to create seed admin {Phone}: {Errors}",
                    phone,
                    string.Join(", ", result.Errors.Select(e => e.Description)));
                continue;
            }

            await userManager.AddToRoleAsync(user, AppRoles.Admin);
            logger.LogInformation("Created seed admin user {UserId} ({Phone}).", user.Id, user.UserName);
        }
    }
}
