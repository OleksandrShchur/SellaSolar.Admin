using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("ProjectId", "WarehouseItemId", Name = "UQ_ProjectItems_Project_WarehouseItem", IsUnique = true)]
public partial class ProjectItem
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    public int WarehouseItemId { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityNeeded { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityFromStock { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityToPurchase { get; set; }

    public bool NeedsPurchase { get; set; }

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectItems")]
    public virtual Project Project { get; set; } = null!;

    [ForeignKey("WarehouseItemId")]
    [InverseProperty("ProjectItems")]
    public virtual WarehouseItem WarehouseItem { get; set; } = null!;
}
