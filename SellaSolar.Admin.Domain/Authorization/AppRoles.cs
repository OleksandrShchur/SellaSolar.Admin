namespace SellaSolar.Admin.Domain.Authorization;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Worker = "Worker";

    public static readonly IReadOnlyList<string> All = [Admin, Worker];
}
