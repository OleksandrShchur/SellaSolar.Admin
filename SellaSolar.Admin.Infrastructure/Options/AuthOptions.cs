namespace SellaSolar.Admin.Infrastructure.Options;

public class AuthOptions
{
    public const string SectionName = "Auth";

    public int SessionDays { get; set; } = 90;
    public int LoginRateLimitPerMinute { get; set; } = 10;
    public int SecurityStampValidationMinutes { get; set; } = 3;
    public int MaxFailedLoginsBeforeBlock { get; set; } = 3;
    public List<SeedAdminOptions> SeedAdmins { get; set; } = [];
}

public class SeedAdminOptions
{
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
}
