using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("Name", Name = "IX_Projects_Name")]
[Index("Status", Name = "IX_Projects_Status")]
public partial class Project
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    [StringLength(500)]
    public string Address { get; set; } = null!;

    [StringLength(20)]
    public string Status { get; set; } = null!;

    [StringLength(200)]
    public string CustomerName { get; set; } = null!;

    [StringLength(50)]
    public string CustomerPhone { get; set; } = null!;

    [StringLength(200)]
    public string? CustomerEmail { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [InverseProperty("Project")]
    public virtual ICollection<ProjectCustomDatum> ProjectCustomData { get; set; } = new List<ProjectCustomDatum>();

    [InverseProperty("Project")]
    public virtual ICollection<ProjectItem> ProjectItems { get; set; } = new List<ProjectItem>();

    [InverseProperty("Project")]
    public virtual ICollection<ProjectPhoto> ProjectPhotos { get; set; } = new List<ProjectPhoto>();

    [InverseProperty("Project")]
    public virtual ICollection<ProjectWorker> ProjectWorkers { get; set; } = new List<ProjectWorker>();
}
