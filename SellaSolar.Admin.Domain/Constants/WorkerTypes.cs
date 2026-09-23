namespace SellaSolar.Admin.Domain.Constants;

public static class WorkerTypes
{
    public const string Assembler = "Assembler";
    public const string Installer = "Installer";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Assembler,
        Installer
    };

    public static bool IsValid(string? type) =>
        !string.IsNullOrWhiteSpace(type) && All.Contains(type);
}
