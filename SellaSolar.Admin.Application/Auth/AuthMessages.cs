namespace SellaSolar.Admin.Application.Auth;

public static class AuthMessages
{
    public const string InvalidCredentials = "Невірне ім'я користувача або пароль.";
    public const string AccountBlocked =
        "Обліковий запис заблоковано. Зверніться до адміністратора.";
    public const string AccountInactive =
        "Обліковий запис деактивовано. Зверніться до адміністратора.";
    public const string RateLimitExceeded =
        "Забагато спроб входу. Спробуйте пізніше.";
    public const string SessionExpired =
        "Сесію завершено. Увійдіть знову.";
    public const string Forbidden = "Недостатньо прав для цієї дії.";
}
