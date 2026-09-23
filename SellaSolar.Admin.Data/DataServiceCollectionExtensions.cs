using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SellaSolar.Admin.Data.Context;

namespace SellaSolar.Admin.Data;

public static class DataServiceCollectionExtensions
{
    public static IServiceCollection AddSellaSolarData(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SellaSolarAdminContext>(options =>
            options.UseSqlServer(connectionString));

        return services;
    }
}
