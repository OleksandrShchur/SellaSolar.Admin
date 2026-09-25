using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("ProjectId", Name = "IX_ProjectExpenses_ProjectId")]
public partial class ProjectExpense
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    [StringLength(200)]
    public string Category { get; set; } = null!;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Amount { get; set; }

    public DateTime? ExpenseDate { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectExpenses")]
    public virtual Project Project { get; set; } = null!;
}
