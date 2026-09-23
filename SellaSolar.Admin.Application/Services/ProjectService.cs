using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

public class ProjectService
{
    private readonly SellaSolarAdminContext _db;
    private readonly ProjectMaterialsService _materials;

    public ProjectService(SellaSolarAdminContext db, ProjectMaterialsService materials)
    {
        _db = db;
        _materials = materials;
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> GetAllAsync(
        string? status = null,
        string? search = null,
        CancellationToken ct = default)
    {
        var query = _db.Projects.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!ProjectStatuses.IsValid(status))
                throw new ValidationException("Status must be InProgress or Completed.");
            query = query.Where(p => p.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p =>
                p.Name.Contains(term) ||
                p.Address.Contains(term) ||
                p.CustomerName.Contains(term) ||
                p.CustomerPhone.Contains(term));
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectListItemDto(
                p.Id,
                p.Name,
                p.Address,
                p.Status,
                p.CustomerName,
                p.CustomerPhone,
                p.StartDate,
                p.EndDate,
                p.CreatedAt,
                p.ProjectWorkers.Count,
                p.ProjectItems.Any(i => i.NeedsPurchase)))
            .ToListAsync(ct);
    }

    public async Task<ProjectDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var project = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ProjectCustomData)
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectWorkers).ThenInclude(w => w.Worker)
            .Include(p => p.ProjectPhotos)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return project is null ? null : MapDetail(project);
    }

    public async Task<ProjectDetailDto> CreateAsync(CreateProjectRequest request, CancellationToken ct = default)
    {
        ValidateProjectWrite(request.Name, request.Address, request.Status, request.CustomerName, request.CustomerPhone);

        var now = DateTime.UtcNow;
        var project = new Project
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            Address = request.Address.Trim(),
            Status = request.Status,
            CustomerName = request.CustomerName.Trim(),
            CustomerPhone = request.CustomerPhone.Trim(),
            CustomerEmail = NormalizeEmail(request.CustomerEmail),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedAt = now,
            UpdatedAt = now
        };

        ApplyCustomData(project, request.CustomData);

        _db.Projects.Add(project);
        await _db.SaveChangesAsync(ct);

        return (await GetByIdAsync(project.Id, ct))!;
    }

    public async Task<ProjectDetailDto> UpdateAsync(int id, UpdateProjectRequest request, CancellationToken ct = default)
    {
        ValidateProjectWrite(request.Name, request.Address, request.Status, request.CustomerName, request.CustomerPhone);

        var project = await _db.Projects
            .Include(p => p.ProjectCustomData)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Project {id} was not found.");

        project.Name = request.Name.Trim();
        project.Description = request.Description;
        project.Address = request.Address.Trim();
        project.Status = request.Status;
        project.CustomerName = request.CustomerName.Trim();
        project.CustomerPhone = request.CustomerPhone.Trim();
        project.CustomerEmail = NormalizeEmail(request.CustomerEmail);
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.UpdatedAt = DateTime.UtcNow;

        _db.ProjectCustomData.RemoveRange(project.ProjectCustomData);
        project.ProjectCustomData.Clear();
        ApplyCustomData(project, request.CustomData);

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task<ProjectDetailDto> UpdateStatusAsync(int id, string status, CancellationToken ct = default)
    {
        if (!ProjectStatuses.IsValid(status))
            throw new ValidationException("Status must be InProgress or Completed.");

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Project {id} was not found.");

        project.Status = status;
        if (status == ProjectStatuses.Completed && project.EndDate is null)
            project.EndDate = DateTime.UtcNow;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var project = await _db.Projects
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectPhotos)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Project {id} was not found.");

        // Restore stock for all materials before cascade delete.
        foreach (var item in project.ProjectItems)
            item.WarehouseItem.QuantityInStock += item.QuantityFromStock;

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync(ct);
    }

    public Task<ProjectItemDto> AddItemAsync(int projectId, AssignProjectItemRequest request, CancellationToken ct = default) =>
        _materials.AddItemAsync(projectId, request, ct);

    public Task RemoveItemAsync(int projectId, int projectItemId, CancellationToken ct = default) =>
        _materials.RemoveItemAsync(projectId, projectItemId, ct);

    public async Task<ProjectWorkerDto> AssignWorkerAsync(int projectId, AssignProjectWorkerRequest request, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        var worker = await _db.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, ct)
            ?? throw new NotFoundException($"Worker {request.WorkerId} was not found.");

        if (!worker.IsActive)
            throw new ValidationException("Cannot assign an inactive worker.");

        var exists = await _db.ProjectWorkers
            .AnyAsync(pw => pw.ProjectId == projectId && pw.WorkerId == request.WorkerId, ct);
        if (exists)
            throw new ConflictException("Worker is already assigned to this project.");

        var entity = new ProjectWorker
        {
            ProjectId = project.Id,
            WorkerId = worker.Id,
            RoleOnProject = string.IsNullOrWhiteSpace(request.RoleOnProject) ? null : request.RoleOnProject.Trim(),
            AssignedAt = DateTime.UtcNow
        };

        _db.ProjectWorkers.Add(entity);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ProjectWorkerDto(
            entity.Id,
            worker.Id,
            worker.FullName,
            worker.Type,
            worker.Phone,
            entity.RoleOnProject,
            entity.AssignedAt);
    }

    public async Task RemoveWorkerAsync(int projectId, int projectWorkerId, CancellationToken ct = default)
    {
        var entity = await _db.ProjectWorkers
            .FirstOrDefaultAsync(pw => pw.Id == projectWorkerId && pw.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project worker assignment {projectWorkerId} was not found.");

        var project = await _db.Projects.FirstAsync(p => p.Id == projectId, ct);
        project.UpdatedAt = DateTime.UtcNow;

        _db.ProjectWorkers.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ProjectPhotoDto> AddPhotoAsync(
        int projectId,
        string relativeUrl,
        string? caption,
        CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        var photo = new ProjectPhoto
        {
            ProjectId = project.Id,
            FilePathOrUrl = relativeUrl,
            Caption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim(),
            UploadedAt = DateTime.UtcNow
        };

        _db.ProjectPhotos.Add(photo);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ProjectPhotoDto(photo.Id, photo.FilePathOrUrl, photo.Caption, photo.UploadedAt);
    }

    public async Task<string> RemovePhotoAsync(int projectId, int photoId, CancellationToken ct = default)
    {
        var photo = await _db.ProjectPhotos
            .FirstOrDefaultAsync(p => p.Id == photoId && p.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Photo {photoId} was not found.");

        var path = photo.FilePathOrUrl;
        var project = await _db.Projects.FirstAsync(p => p.Id == projectId, ct);
        project.UpdatedAt = DateTime.UtcNow;

        _db.ProjectPhotos.Remove(photo);
        await _db.SaveChangesAsync(ct);
        return path;
    }

    private static void ValidateProjectWrite(
        string name,
        string address,
        string status,
        string customerName,
        string customerPhone)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("Name is required.");
        if (string.IsNullOrWhiteSpace(address))
            throw new ValidationException("Address is required.");
        if (string.IsNullOrWhiteSpace(customerName))
            throw new ValidationException("CustomerName is required.");
        if (string.IsNullOrWhiteSpace(customerPhone))
            throw new ValidationException("CustomerPhone is required.");
        if (!ProjectStatuses.IsValid(status))
            throw new ValidationException("Status must be InProgress or Completed.");
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim();

    private static void ApplyCustomData(Project project, IReadOnlyList<CustomDataDto>? customData)
    {
        if (customData is null) return;

        foreach (var item in customData.Where(c => !string.IsNullOrWhiteSpace(c.Key)))
        {
            project.ProjectCustomData.Add(new ProjectCustomDatum
            {
                Key = item.Key.Trim(),
                Value = item.Value ?? string.Empty
            });
        }
    }

    private static ProjectDetailDto MapDetail(Project project) =>
        new(
            project.Id,
            project.Name,
            project.Description,
            project.Address,
            project.Status,
            project.CustomerName,
            project.CustomerPhone,
            project.CustomerEmail,
            project.StartDate,
            project.EndDate,
            project.CreatedAt,
            project.UpdatedAt,
            project.ProjectCustomData
                .OrderBy(c => c.Key)
                .Select(c => new CustomDataDto(c.Key, c.Value))
                .ToList(),
            project.ProjectItems
                .OrderBy(i => i.WarehouseItem.Name)
                .Select(i => new ProjectItemDto(
                    i.Id,
                    i.WarehouseItemId,
                    i.WarehouseItem.Name,
                    i.WarehouseItem.Category,
                    i.WarehouseItem.Unit,
                    i.QuantityNeeded,
                    i.QuantityFromStock,
                    i.QuantityToPurchase,
                    i.NeedsPurchase,
                    i.WarehouseItem.QuantityInStock))
                .ToList(),
            project.ProjectWorkers
                .OrderBy(w => w.Worker.FullName)
                .Select(w => new ProjectWorkerDto(
                    w.Id,
                    w.WorkerId,
                    w.Worker.FullName,
                    w.Worker.Type,
                    w.Worker.Phone,
                    w.RoleOnProject,
                    w.AssignedAt))
                .ToList(),
            project.ProjectPhotos
                .OrderByDescending(p => p.UploadedAt)
                .Select(p => new ProjectPhotoDto(p.Id, p.FilePathOrUrl, p.Caption, p.UploadedAt))
                .ToList());
}
