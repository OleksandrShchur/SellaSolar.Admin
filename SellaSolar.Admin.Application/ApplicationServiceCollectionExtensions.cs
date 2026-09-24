using Microsoft.Extensions.DependencyInjection;
using SellaSolar.Admin.Application.Services;

namespace SellaSolar.Admin.Application;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddSellaSolarApplication(this IServiceCollection services)
    {
        services.AddScoped<ProjectMaterialsService>();
        services.AddScoped<ProjectService>();
        services.AddScoped<WarehouseService>();
        services.AddScoped<AuthService>();
        services.AddScoped<UserManagementService>();
        return services;
    }
}
