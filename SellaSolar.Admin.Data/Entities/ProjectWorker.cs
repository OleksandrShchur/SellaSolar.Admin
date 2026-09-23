using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("ProjectId", "WorkerId", Name = "UQ_ProjectWorkers_Project_Worker", IsUnique = true)]
public partial class ProjectWorker
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    public int WorkerId { get; set; }

    [StringLength(100)]
    public string? RoleOnProject { get; set; }

    public DateTime AssignedAt { get; set; }

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectWorkers")]
    public virtual Project Project { get; set; } = null!;

    [ForeignKey("WorkerId")]
    [InverseProperty("ProjectWorkers")]
    public virtual Worker Worker { get; set; } = null!;
}
