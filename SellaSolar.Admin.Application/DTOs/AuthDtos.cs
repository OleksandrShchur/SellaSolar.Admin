namespace SellaSolar.Admin.Application.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string UserId, string Username, string FullName, IReadOnlyList<string> Roles);

public record CurrentUserDto(string UserId, string Username, string FullName, IReadOnlyList<string> Roles);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record CreateUserRequest(string Username, string Password, string FullName, string Role);

public record UpdateUserRequest(string FullName, string Role);

public record ResetUserPasswordRequest(string NewPassword);

public record UserListItemDto(
    string Id,
    string Username,
    string FullName,
    string Role,
    bool IsActive,
    bool IsBlocked,
    DateTimeOffset? BlockedAt,
    int FailedLoginCount,
    DateTimeOffset CreatedAt);

public record SuggestUsernameResponse(string SuggestedUsername);
