using System.Text.RegularExpressions;

namespace SellaSolar.Admin.Infrastructure.Identity;

public static partial class UsernameValidator
{
    private static readonly Regex AllowedPattern = UsernameRegex();

    public static bool IsValid(string username) =>
        !string.IsNullOrWhiteSpace(username) &&
        username.Length <= 256 &&
        AllowedPattern.IsMatch(username);

    public static string NormalizeForLookup(string username) =>
        username.Trim().ToUpperInvariant();

    [GeneratedRegex("^[a-zA-Z0-9._-]+$")]
    private static partial Regex UsernameRegex();
}
