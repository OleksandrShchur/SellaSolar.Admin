namespace SellaSolar.Admin.Infrastructure.Identity;

public class AuthSecurityLog
{
    public long Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? ActorUserId { get; set; }
    public string? TargetUserId { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
