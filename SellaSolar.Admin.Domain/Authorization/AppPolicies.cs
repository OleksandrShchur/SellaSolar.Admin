namespace SellaSolar.Admin.Domain.Authorization;

public static class AppPolicies
{
    public const string CanManageUsers = nameof(CanManageUsers);
    public const string CanManageProjects = nameof(CanManageProjects);
    public const string CanManageWarehouse = nameof(CanManageWarehouse);
    public const string CanViewAssignedJobs = nameof(CanViewAssignedJobs);
}
