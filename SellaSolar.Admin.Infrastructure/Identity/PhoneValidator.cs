using System.Text.RegularExpressions;

namespace SellaSolar.Admin.Infrastructure.Identity;

/// <summary>Ukrainian mobile phone in canonical form: 0XXXXXXXXX (10 digits).</summary>
public static partial class PhoneValidator
{
    private static readonly Regex CanonicalPattern = PhoneRegex();

    public static bool IsValid(string? phone) =>
        !string.IsNullOrWhiteSpace(phone) &&
        CanonicalPattern.IsMatch(phone.Trim());

    public static string NormalizeForLookup(string phone) =>
        phone.Trim().ToUpperInvariant();

    /// <summary>
    /// Converts common UA forms (+380… / 380…) to canonical 0XXXXXXXXX.
    /// Returns null if the value cannot be normalized to a valid phone.
    /// </summary>
    public static string? TryNormalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var digits = DigitsOnly(phone);
        if (digits.Length == 12 && digits.StartsWith("380", StringComparison.Ordinal))
        {
            digits = "0" + digits[3..];
        }
        else if (digits.Length == 11 && digits.StartsWith("80", StringComparison.Ordinal))
        {
            digits = "0" + digits[2..];
        }

        return IsValid(digits) ? digits : null;
    }

    private static string DigitsOnly(string value) =>
        string.Concat(value.Where(char.IsDigit));

    [GeneratedRegex("^0\\d{9}$")]
    private static partial Regex PhoneRegex();
}
