namespace SellaSolar.Admin.Domain.Constants;

public static class ProjectStatuses
{
    public const string Awaiting = "Awaiting";
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Awaiting,
        InProgress,
        Completed
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && All.Contains(status);

    /// <summary>Projects that still drive warehouse demand (stock reserved / to-order).</summary>
    public static bool IsOpen(string? status) =>
        status == Awaiting || status == InProgress;
}
