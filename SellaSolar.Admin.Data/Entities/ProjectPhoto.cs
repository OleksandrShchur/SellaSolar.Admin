using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

public partial class ProjectPhoto
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    [StringLength(1000)]
    public string FilePathOrUrl { get; set; } = null!;

    [StringLength(500)]
    public string? Caption { get; set; }

    public DateTime UploadedAt { get; set; }

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectPhotos")]
    public virtual Project Project { get; set; } = null!;
}
