using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

public partial class ProjectItem
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    public int? WarehouseItemId { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityNeeded { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityFromStock { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityToPurchase { get; set; }

    public bool NeedsPurchase { get; set; }

    /// <summary>
    /// Persisted Σ allocation qty × lot unit cost. Survives stock consume on Completed.
    /// </summary>
    [Column(TypeName = "decimal(18, 2)")]
    public decimal? CostFromStock { get; set; }

    [StringLength(200)]
    public string? RequestedName { get; set; }

    [StringLength(100)]
    public string? RequestedCategory { get; set; }

    [StringLength(50)]
    public string? RequestedUnit { get; set; }

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectItems")]
    public virtual Project Project { get; set; } = null!;

    [InverseProperty("ProjectItem")]
    public virtual ICollection<ProjectItemLotAllocation> ProjectItemLotAllocations { get; set; } = new List<ProjectItemLotAllocation>();

    [ForeignKey("WarehouseItemId")]
    [InverseProperty("ProjectItems")]
    public virtual WarehouseItem? WarehouseItem { get; set; }
}
