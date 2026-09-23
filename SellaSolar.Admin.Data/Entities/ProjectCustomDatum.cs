using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SellaSolar.Admin.Data.Entities;

public partial class ProjectCustomDatum
{
    [Key]
    public int Id { get; set; }

    public int ProjectId { get; set; }

    [StringLength(200)]
    public string Key { get; set; } = null!;

    public string Value { get; set; } = null!;

    [ForeignKey("ProjectId")]
    [InverseProperty("ProjectCustomData")]
    public virtual Project Project { get; set; } = null!;
}
