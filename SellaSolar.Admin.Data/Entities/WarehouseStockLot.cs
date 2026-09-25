using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("WarehouseItemId", "ReceivedAt", Name = "IX_WarehouseStockLots_WarehouseItem_ReceivedAt")]
public partial class WarehouseStockLot
{
    [Key]
    public int Id { get; set; }

    public int WarehouseItemId { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal UnitCost { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityOnHand { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal QuantityReceived { get; set; }

    public DateTime ReceivedAt { get; set; }

    [StringLength(200)]
    public string? Supplier { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    [InverseProperty("WarehouseStockLot")]
    public virtual ICollection<ProjectItemLotAllocation> ProjectItemLotAllocations { get; set; } = new List<ProjectItemLotAllocation>();

    [ForeignKey("WarehouseItemId")]
    [InverseProperty("WarehouseStockLots")]
    public virtual WarehouseItem WarehouseItem { get; set; } = null!;
}
