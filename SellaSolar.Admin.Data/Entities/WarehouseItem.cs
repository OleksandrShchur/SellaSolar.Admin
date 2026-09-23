using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("Category", Name = "IX_WarehouseItems_Category")]
public partial class WarehouseItem
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string Name { get; set; } = null!;

    [StringLength(100)]
    public string Category { get; set; } = null!;

    [StringLength(50)]
    public string Unit { get; set; } = null!;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityInStock { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? Price { get; set; }

    [StringLength(200)]
    public string? Supplier { get; set; }

    public string? Notes { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? LowStockThreshold { get; set; }

    [InverseProperty("WarehouseItem")]
    public virtual ICollection<ProjectItem> ProjectItems { get; set; } = new List<ProjectItem>();
}
