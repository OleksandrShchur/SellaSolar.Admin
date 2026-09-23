using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

[Index("Type", Name = "IX_Workers_Type")]
public partial class Worker
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string FullName { get; set; } = null!;

    [StringLength(20)]
    public string Type { get; set; } = null!;

    [StringLength(50)]
    public string Phone { get; set; } = null!;

    public bool IsActive { get; set; }

    [InverseProperty("Worker")]
    public virtual ICollection<ProjectWorker> ProjectWorkers { get; set; } = new List<ProjectWorker>();
}
