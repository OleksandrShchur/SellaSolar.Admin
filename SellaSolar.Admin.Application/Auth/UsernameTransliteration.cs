using System.Globalization;
using System.Text;

namespace SellaSolar.Admin.Application.Auth;

public static class UsernameTransliteration
{
    private static readonly Dictionary<char, string> UkrainianMap = new()
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "h", ['ґ'] = "g",
        ['д'] = "d", ['е'] = "e", ['є'] = "ie", ['ж'] = "zh", ['з'] = "z",
        ['и'] = "y", ['і'] = "i", ['ї'] = "i", ['й'] = "i", ['к'] = "k",
        ['л'] = "l", ['м'] = "m", ['н'] = "n", ['о'] = "o", ['п'] = "p",
        ['р'] = "r", ['с'] = "s", ['т'] = "t", ['у'] = "u", ['ф'] = "f",
        ['х'] = "kh", ['ц'] = "ts", ['ч'] = "ch", ['ш'] = "sh", ['щ'] = "shch",
        ['ь'] = "", ['ю'] = "iu", ['я'] = "ia",
        ['’'] = "", ['\''] = "", [' '] = ".", ['-'] = "-", ['_'] = "_",
    };

    public static string SuggestFromFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return "user";
        }

        var normalized = fullName.Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        foreach (var ch in normalized.Normalize(NormalizationForm.FormD))
        {
            if (char.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (UkrainianMap.TryGetValue(ch, out var mapped))
            {
                sb.Append(mapped);
                continue;
            }

            if (char.IsAsciiLetterOrDigit(ch))
            {
                sb.Append(ch);
            }
            else if (ch == '.' || ch == '-' || ch == '_')
            {
                sb.Append(ch);
            }
            else if (char.IsWhiteSpace(ch))
            {
                sb.Append('.');
            }
        }

        var result = sb.ToString().Trim('.');
        while (result.Contains("..", StringComparison.Ordinal))
        {
            result = result.Replace("..", ".", StringComparison.Ordinal);
        }

        return string.IsNullOrEmpty(result) ? "user" : result;
    }
}
