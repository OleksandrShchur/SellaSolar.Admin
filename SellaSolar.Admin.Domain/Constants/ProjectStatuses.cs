namespace SellaSolar.Admin.Domain.Constants;

public static class ProjectStatuses
{
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        InProgress,
        Completed
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && All.Contains(status);
}
