using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Application.Services;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize(Policy = AppPolicies.CanManageProjects)]
public class ProjectsController : ControllerBase
{
    private readonly ProjectService _projects;
    private readonly IWebHostEnvironment _env;

    public ProjectsController(ProjectService projects, IWebHostEnvironment env)
    {
        _projects = projects;
        _env = env;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectListItemDto>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.GetAllAsync(status, search, ct));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProjectDetailDto>> GetById(int id, CancellationToken ct)
    {
        var project = await _projects.GetByIdAsync(id, ct);
        return project is null ? NotFound() : Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDetailDto>> Create([FromBody] CreateProjectRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _projects.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProjectDetailDto>> Update(int id, [FromBody] UpdateProjectRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.UpdateAsync(id, request, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ProjectDetailDto>> UpdateStatus(
        int id,
        [FromBody] UpdateProjectStatusRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.UpdateStatusAsync(id, request.Status, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            await _projects.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:int}/items")]
    public async Task<ActionResult<ProjectItemDto>> AddItem(
        int id,
        [FromBody] AssignProjectItemRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.AddItemAsync(id, request, ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/items/{itemId:int}")]
    public async Task<ActionResult<ProjectItemDto>> UpdateItem(
        int id,
        int itemId,
        [FromBody] UpdateProjectItemRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.UpdateItemAsync(id, itemId, request, ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/items/{itemId:int}/allocations")]
    public async Task<ActionResult<ProjectItemDto>> SetItemAllocations(
        int id,
        int itemId,
        [FromBody] SetProjectItemAllocationsRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.SetItemAllocationsAsync(id, itemId, request, ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> RemoveItem(int id, int itemId, CancellationToken ct)
    {
        try
        {
            await _projects.RemoveItemAsync(id, itemId, ct);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:int}/workers")]
    public async Task<ActionResult<ProjectWorkerDto>> AssignWorker(
        int id,
        [FromBody] AssignProjectWorkerRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _projects.AssignWorkerAsync(id, request, ct));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}/workers/{assignmentId:int}")]
    public async Task<IActionResult> RemoveWorker(int id, int assignmentId, CancellationToken ct)
    {
        try
        {
            await _projects.RemoveWorkerAsync(id, assignmentId, ct);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:int}/photos")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<ProjectPhotoDto>> UploadPhoto(
        int id,
        IFormFile file,
        [FromForm] string? caption,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "File is required." });

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"
        };
        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext) || !allowed.Contains(ext))
            return BadRequest(new { message = "Only image files are allowed." });

        var uploadsRoot = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", "projects", id.ToString());
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var physicalPath = Path.Combine(uploadsRoot, fileName);
        await using (var stream = System.IO.File.Create(physicalPath))
        {
            await file.CopyToAsync(stream, ct);
        }

        var relativeUrl = $"/uploads/projects/{id}/{fileName}";

        try
        {
            var photo = await _projects.AddPhotoAsync(id, relativeUrl, caption, ct);
            return Ok(photo);
        }
        catch (NotFoundException)
        {
            if (System.IO.File.Exists(physicalPath))
                System.IO.File.Delete(physicalPath);
            return NotFound();
        }
    }

    [HttpDelete("{id:int}/photos/{photoId:int}")]
    public async Task<IActionResult> DeletePhoto(int id, int photoId, CancellationToken ct)
    {
        try
        {
            var relativeUrl = await _projects.RemovePhotoAsync(id, photoId, ct);
            var physicalPath = Path.Combine(
                _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
                relativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(physicalPath))
                System.IO.File.Delete(physicalPath);

            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }
}
