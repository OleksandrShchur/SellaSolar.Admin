namespace SellaSolar.Admin.Application.DTOs;

public record LoginRequest(string Phone, string Password);

public record LoginResponse(string UserId, string Username, string FullName, IReadOnlyList<string> Roles);

public record CurrentUserDto(string UserId, string Username, string FullName, IReadOnlyList<string> Roles);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record CreateUserRequest(
    string Password,
    string FullName,
    string Role,
    string Phone,
    string? WorkerType);

public record UpdateUserRequest(
    string FullName,
    string Role,
    string Phone,
    string? WorkerType);

public record ResetUserPasswordRequest(string NewPassword);

public record UserListItemDto(
    string Id,
    string Username,
    string FullName,
    string Role,
    string? Phone,
    string? WorkerType,
    bool IsActive,
    bool IsBlocked,
    DateTimeOffset? BlockedAt,
    int FailedLoginCount,
    DateTimeOffset CreatedAt);
