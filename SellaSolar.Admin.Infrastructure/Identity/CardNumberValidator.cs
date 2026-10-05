using System.Text.RegularExpressions;

namespace SellaSolar.Admin.Infrastructure.Identity;

/// <summary>Bank card number stored as 16 digits (no spaces).</summary>
public static partial class CardNumberValidator
{
    private static readonly Regex CanonicalPattern = CardRegex();

    public static bool IsValid(string? cardNumber) =>
        !string.IsNullOrWhiteSpace(cardNumber) &&
        CanonicalPattern.IsMatch(DigitsOnly(cardNumber));

    /// <summary>Returns 16 digits, or null when input is empty/whitespace.</summary>
    public static string? NormalizeOptional(string? cardNumber)
    {
        if (string.IsNullOrWhiteSpace(cardNumber))
        {
            return null;
        }

        var digits = DigitsOnly(cardNumber);
        return digits.Length == 0 ? null : digits;
    }

    private static string DigitsOnly(string value) =>
        string.Concat(value.Where(char.IsDigit));

    [GeneratedRegex("^\\d{16}$")]
    private static partial Regex CardRegex();
}
