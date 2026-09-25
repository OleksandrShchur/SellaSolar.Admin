using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("ProjectId", "UserId", Name = "UQ_ProjectWorkers_Project_User", IsUnique = true)]
public partial class ProjectWorker
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    [StringLength(100)]
    public string? RoleOnProject { get; set; }

    public DateTime AssignedAt { get; set; }

    public string UserId { get; set; } = null!;

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectWorkers")]
    public virtual Project Project { get; set; } = null!;
}
