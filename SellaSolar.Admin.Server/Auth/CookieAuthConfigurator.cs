using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using SellaSolar.Admin.Infrastructure.Identity;
using SellaSolar.Admin.Infrastructure.Options;

namespace SellaSolar.Admin.Server.Auth;

public static class CookieAuthConfigurator
{
    public static void ConfigureIdentityCookies(IServiceCollection services)
    {
        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.SlidingExpiration = true;

            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };

            options.Events.OnValidatePrincipal = async context =>
            {
                var userManager = context.HttpContext.RequestServices
                    .GetRequiredService<UserManager<ApplicationUser>>();
                var userId = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (userId is null)
                {
                    context.RejectPrincipal();
                    await context.HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
                    return;
                }

                var user = await userManager.FindByIdAsync(userId);
                if (user is null || !user.IsActive || user.IsBlocked)
                {
                    context.RejectPrincipal();
                    await context.HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
                }
            };
        });

        services.AddOptions<SecurityStampValidatorOptions>()
            .Configure<IOptions<AuthOptions>>((stampOptions, authOptions) =>
            {
                stampOptions.ValidationInterval = TimeSpan.FromMinutes(
                    authOptions.Value.SecurityStampValidationMinutes);
            });
    }
}
