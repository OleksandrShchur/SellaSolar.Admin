using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("WarehouseStockLotId", Name = "IX_ProjectItemLotAllocations_WarehouseStockLotId")]
[Index("ProjectItemId", "WarehouseStockLotId", Name = "UQ_ProjectItemLotAllocations_Item_Lot", IsUnique = true)]
public partial class ProjectItemLotAllocation
{
    [Key]
    public int Id { get; set; }

    public int ProjectItemId { get; set; }

    public int WarehouseStockLotId { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Quantity { get; set; }

    [ForeignKey("ProjectItemId")]
    [InverseProperty("ProjectItemLotAllocations")]
    public virtual ProjectItem ProjectItem { get; set; } = null!;

    [ForeignKey("WarehouseStockLotId")]
    [InverseProperty("ProjectItemLotAllocations")]
    public virtual WarehouseStockLot WarehouseStockLot { get; set; } = null!;
}
