using Microsoft.Extensions.Logging;
using SellaSolar.Admin.Infrastructure.Identity;

namespace SellaSolar.Admin.Infrastructure.Services;

public class AuthSecurityLogger
{
    private readonly ApplicationIdentityDbContext _db;
    private readonly ILogger<AuthSecurityLogger> _logger;

    public AuthSecurityLogger(ApplicationIdentityDbContext db, ILogger<AuthSecurityLogger> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task LogAsync(
        string eventType,
        string? actorUserId,
        string? targetUserId,
        string? ipAddress,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Auth security event {EventType}: actor={ActorUserId} target={TargetUserId} ip={IpAddress}",
            eventType, actorUserId, targetUserId, ipAddress);

        _db.AuthSecurityLogs.Add(new AuthSecurityLog
        {
            EventType = eventType,
            ActorUserId = actorUserId,
            TargetUserId = targetUserId,
            IpAddress = ipAddress,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await _db.SaveChangesAsync(ct);
    }
}

public static class AuthSecurityEventTypes
{
    public const string UserBlocked = "UserBlocked";
    public const string UserUnblocked = "UserUnblocked";
    public const string LoginBlocked = "LoginBlocked";
}
