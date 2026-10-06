using Microsoft.AspNetCore.Identity;
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

        // Keep string keys under SQL Server's 900-byte clustered index limit (see database/004).
        const int keyLen = 128;
        builder.Entity<ApplicationUser>().Property(u => u.Id).HasMaxLength(keyLen);
        builder.Entity<IdentityRole>().Property(r => r.Id).HasMaxLength(keyLen);
        builder.Entity<IdentityUserRole<string>>(e =>
        {
            e.Property(r => r.UserId).HasMaxLength(keyLen);
            e.Property(r => r.RoleId).HasMaxLength(keyLen);
        });
        builder.Entity<IdentityUserLogin<string>>(e =>
        {
            e.Property(l => l.LoginProvider).HasMaxLength(keyLen);
            e.Property(l => l.ProviderKey).HasMaxLength(keyLen);
            e.Property(l => l.UserId).HasMaxLength(keyLen);
        });
        builder.Entity<IdentityUserToken<string>>(e =>
        {
            e.Property(t => t.LoginProvider).HasMaxLength(keyLen);
            e.Property(t => t.Name).HasMaxLength(keyLen);
            e.Property(t => t.UserId).HasMaxLength(keyLen);
        });
        builder.Entity<IdentityUserClaim<string>>().Property(c => c.UserId).HasMaxLength(keyLen);
        builder.Entity<IdentityRoleClaim<string>>().Property(c => c.RoleId).HasMaxLength(keyLen);

        builder.Entity<ApplicationUser>(entity =>
        {
            // Phone-only auth: unused Identity columns are not mapped (see database/008).
            entity.Ignore(u => u.Email);
            entity.Ignore(u => u.NormalizedEmail);
            entity.Ignore(u => u.EmailConfirmed);
            entity.Ignore(u => u.PhoneNumberConfirmed);
            entity.Ignore(u => u.TwoFactorEnabled);

            foreach (var index in entity.Metadata.GetIndexes()
                         .Where(i => i.GetDatabaseName() == "EmailIndex")
                         .ToList())
            {
                entity.Metadata.RemoveIndex(index);
            }

            entity.Property(u => u.FullName).HasMaxLength(200);
            entity.Property(u => u.IsActive).HasDefaultValue(true);
            entity.Property(u => u.IsBlocked).HasDefaultValue(false);
            entity.Property(u => u.FailedLoginCount).HasDefaultValue(0);
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(u => u.WorkerType).HasMaxLength(20);
            entity.Property(u => u.CardNumber).HasMaxLength(16);
        });

        builder.Entity<AuthSecurityLog>(entity =>
        {
            entity.ToTable("AuthSecurityLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventType).HasMaxLength(50);
            entity.Property(e => e.ActorUserId).HasMaxLength(keyLen);
            entity.Property(e => e.TargetUserId).HasMaxLength(keyLen);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        });
    }
}
