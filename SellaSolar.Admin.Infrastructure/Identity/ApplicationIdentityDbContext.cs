using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Infrastructure.Identity;

public class ApplicationIdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationIdentityDbContext(DbContextOptions<ApplicationIdentityDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AuthSecurityLog> AuthSecurityLogs { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(u => u.FullName).HasMaxLength(200);
            entity.Property(u => u.IsActive).HasDefaultValue(true);
            entity.Property(u => u.IsBlocked).HasDefaultValue(false);
            entity.Property(u => u.FailedLoginCount).HasDefaultValue(0);
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(u => u.WorkerType).HasMaxLength(20);
        });

        builder.Entity<AuthSecurityLog>(entity =>
        {
            entity.ToTable("AuthSecurityLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).HasMaxLength(50);
            entity.Property(e => e.ActorUserId).HasMaxLength(450);
            entity.Property(e => e.TargetUserId).HasMaxLength(450);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        });
    }
}
