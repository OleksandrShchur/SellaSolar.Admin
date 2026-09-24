using Microsoft.AspNetCore.Identity;

namespace SellaSolar.Admin.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; }
    public DateTimeOffset? BlockedAt { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Assembler / Installer when role is Worker; otherwise null.</summary>
    public string? WorkerType { get; set; }
}
