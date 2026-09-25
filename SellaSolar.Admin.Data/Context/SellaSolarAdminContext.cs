using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Data.Entities;

namespace SellaSolar.Admin.Data.Context;

public partial class SellaSolarAdminContext : DbContext
{
    public SellaSolarAdminContext(DbContextOptions<SellaSolarAdminContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<ProjectCustomDatum> ProjectCustomData { get; set; }

    public virtual DbSet<ProjectItem> ProjectItems { get; set; }

    public virtual DbSet<ProjectPhoto> ProjectPhotos { get; set; }

    public virtual DbSet<ProjectWorker> ProjectWorkers { get; set; }

    public virtual DbSet<WarehouseItem> WarehouseItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())", "DF_Projects_CreatedAt");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())", "DF_Projects_UpdatedAt");
        });

        modelBuilder.Entity<ProjectCustomDatum>(entity =>
        {
            entity.HasOne(d => d.Project).WithMany(p => p.ProjectCustomData).HasConstraintName("FK_ProjectCustomData_Projects");
        });

        modelBuilder.Entity<ProjectItem>(entity =>
        {
            entity.HasIndex(e => new { e.ProjectId, e.RequestedName }, "UQ_ProjectItems_Project_RequestedName")
                .IsUnique()
                .HasFilter("([WarehouseItemId] IS NULL)");

            entity.HasIndex(e => new { e.ProjectId, e.WarehouseItemId }, "UQ_ProjectItems_Project_WarehouseItem")
                .IsUnique()
                .HasFilter("([WarehouseItemId] IS NOT NULL)");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectItems).HasConstraintName("FK_ProjectItems_Projects");

            entity.HasOne(d => d.WarehouseItem).WithMany(p => p.ProjectItems).HasConstraintName("FK_ProjectItems_WarehouseItems");
        });

        modelBuilder.Entity<ProjectPhoto>(entity =>
        {
            entity.Property(e => e.UploadedAt).HasDefaultValueSql("(sysutcdatetime())", "DF_ProjectPhotos_UploadedAt");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectPhotos).HasConstraintName("FK_ProjectPhotos_Projects");
        });

        modelBuilder.Entity<ProjectWorker>(entity =>
        {
            entity.Property(e => e.AssignedAt).HasDefaultValueSql("(sysutcdatetime())", "DF_ProjectWorkers_AssignedAt");

            entity.HasOne(d => d.Project).WithMany(p => p.ProjectWorkers).HasConstraintName("FK_ProjectWorkers_Projects");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
