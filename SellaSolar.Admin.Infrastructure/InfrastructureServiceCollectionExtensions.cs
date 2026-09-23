using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Infrastructure.Identity;
using SellaSolar.Admin.Infrastructure.Options;
using SellaSolar.Admin.Infrastructure.Services;

namespace SellaSolar.Admin.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddSellaSolarInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        string connectionString)
    {
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.AddDbContext<ApplicationIdentityDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                options.User.RequireUniqueEmail = false;
                options.SignIn.RequireConfirmedEmail = false;
                options.SignIn.RequireConfirmedAccount = false;
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.AllowedForNewUsers = false;
                options.Lockout.MaxFailedAccessAttempts = int.MaxValue;
            })
            .AddEntityFrameworkStores<ApplicationIdentityDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<AuthSecurityLogger>();

        services.AddAuthorizationBuilder()
            .AddPolicy(AppPolicies.CanManageUsers, p => p.RequireRole(AppRoles.Admin))
            .AddPolicy(AppPolicies.CanManageProjects, p => p.RequireRole(AppRoles.Admin, AppRoles.Manager))
            .AddPolicy(AppPolicies.CanManageWarehouse, p => p.RequireRole(AppRoles.Admin, AppRoles.Manager))
            .AddPolicy(AppPolicies.CanManageFieldWorkers, p => p.RequireRole(AppRoles.Admin, AppRoles.Manager))
            .AddPolicy(AppPolicies.CanViewAssignedJobs, p => p.RequireRole(AppRoles.Admin, AppRoles.Manager, AppRoles.Worker));

        return services;
    }
}
