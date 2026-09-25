using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Domain.Constants;
using SellaSolar.Admin.Infrastructure.Identity;

namespace SellaSolar.Admin.Application.Services;

public class ProjectService
{
    private readonly SellaSolarAdminContext _db;
    private readonly ProjectMaterialsService _materials;
    private readonly UserManager<ApplicationUser> _userManager;

    public ProjectService(
        SellaSolarAdminContext db,
        ProjectMaterialsService materials,
        UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _materials = materials;
        _userManager = userManager;
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
                throw new ValidationException("Status must be Awaiting, InProgress, or Completed.");
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
                (p.Status == ProjectStatuses.Awaiting || p.Status == ProjectStatuses.InProgress)
                    && p.ProjectItems.Any(i =>
                        i.WarehouseItemId == null
                            ? i.NeedsPurchase
                            : i.QuantityNeeded >
                              i.WarehouseItem!.QuantityInStock
                              - (i.WarehouseItem.ProjectItems
                                  .Where(o =>
                                      o.ProjectId != p.Id
                                      && (o.Project.Status == ProjectStatuses.Awaiting
                                          || o.Project.Status == ProjectStatuses.InProgress))
                                  .Sum(o => (decimal?)o.QuantityFromStock) ?? 0m))))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> GetAssignedToUserAsync(
        string userId,
        CancellationToken ct = default)
    {
        return await _db.Projects
            .AsNoTracking()
            .Where(p => p.ProjectWorkers.Any(pw => pw.UserId == userId))
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
                (p.Status == ProjectStatuses.Awaiting || p.Status == ProjectStatuses.InProgress)
                    && p.ProjectItems.Any(i =>
                        i.WarehouseItemId == null
                            ? i.NeedsPurchase
                            : i.QuantityNeeded >
                              i.WarehouseItem!.QuantityInStock
                              - (i.WarehouseItem.ProjectItems
                                  .Where(o =>
                                      o.ProjectId != p.Id
                                      && (o.Project.Status == ProjectStatuses.Awaiting
                                          || o.Project.Status == ProjectStatuses.InProgress))
                                  .Sum(o => (decimal?)o.QuantityFromStock) ?? 0m))))
            .ToListAsync(ct);
    }

    public async Task<ProjectDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var project = await _db.Projects
            .AsNoTracking()
            .Include(p => p.ProjectCustomData)
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectItems).ThenInclude(i => i.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .Include(p => p.ProjectWorkers)
            .Include(p => p.ProjectPhotos)
            .Include(p => p.ProjectExpenses)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return project is null ? null : await MapDetailAsync(project, ct);
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
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectItems).ThenInclude(i => i.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Project {id} was not found.");

        var previousStatus = project.Status;

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
        _materials.ApplyStatusStockTransition(project, previousStatus, request.Status);

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(project.Id, ct))!;
    }

    public async Task<ProjectDetailDto> UpdateStatusAsync(int id, string status, CancellationToken ct = default)
    {
        if (!ProjectStatuses.IsValid(status))
            throw new ValidationException("Status must be Awaiting, InProgress, or Completed.");

        var project = await _db.Projects
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectItems).ThenInclude(i => i.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Project {id} was not found.");

        var previousStatus = project.Status;
        project.Status = status;
        if (status == ProjectStatuses.Completed && project.EndDate is null)
            project.EndDate = DateTime.UtcNow;
        if (status == ProjectStatuses.InProgress && project.StartDate is null)
            project.StartDate = DateTime.UtcNow;
        project.UpdatedAt = DateTime.UtcNow;

        _materials.ApplyStatusStockTransition(project, previousStatus, status);

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var project = await _db.Projects
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectItems).ThenInclude(i => i.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .Include(p => p.ProjectPhotos)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException($"Project {id} was not found.");

        ProjectMaterialsService.RestoreStockIfConsumed(project);

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync(ct);
    }

    public Task<ProjectItemDto> AddItemAsync(int projectId, AssignProjectItemRequest request, CancellationToken ct = default) =>
        _materials.AddItemAsync(projectId, request, ct);

    public Task<ProjectItemDto> UpdateItemAsync(
        int projectId,
        int projectItemId,
        UpdateProjectItemRequest request,
        CancellationToken ct = default) =>
        _materials.UpdateItemAsync(projectId, projectItemId, request, ct);

    public Task<ProjectItemDto> SetItemAllocationsAsync(
        int projectId,
        int projectItemId,
        SetProjectItemAllocationsRequest request,
        CancellationToken ct = default) =>
        _materials.SetAllocationsAsync(projectId, projectItemId, request, ct);

    public Task RemoveItemAsync(int projectId, int projectItemId, CancellationToken ct = default) =>
        _materials.RemoveItemAsync(projectId, projectItemId, ct);

    public async Task<ProjectWorkerDto> AssignWorkerAsync(int projectId, AssignProjectWorkerRequest request, CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        if (string.IsNullOrWhiteSpace(request.UserId))
            throw new ValidationException("Працівника не вибрано.");

        var user = await _userManager.FindByIdAsync(request.UserId)
            ?? throw new NotFoundException("Працівника не знайдено.");

        if (!await _userManager.IsInRoleAsync(user, AppRoles.Worker))
            throw new ValidationException("Призначати на проект можна лише користувачів з роллю «Виконавець».");

        if (!user.IsActive || user.IsBlocked)
            throw new ValidationException("Не можна призначити неактивного або заблокованого працівника.");

        var exists = await _db.ProjectWorkers
            .AnyAsync(pw => pw.ProjectId == projectId && pw.UserId == request.UserId, ct);
        if (exists)
            throw new ConflictException("Працівника вже призначено на цей проект.");

        var entity = new ProjectWorker
        {
            ProjectId = project.Id,
            UserId = user.Id,
            RoleOnProject = string.IsNullOrWhiteSpace(request.RoleOnProject) ? null : request.RoleOnProject.Trim(),
            AssignedAt = DateTime.UtcNow
        };

        _db.ProjectWorkers.Add(entity);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ProjectWorkerDto(
            entity.Id,
            user.Id,
            user.FullName,
            user.WorkerType,
            user.PhoneNumber,
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

    public async Task<ProjectExpenseDto> AddExpenseAsync(
        int projectId,
        CreateProjectExpenseRequest request,
        CancellationToken ct = default)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        EnsureProjectOpenForExpenseEdits(project.Status);
        ValidateExpenseWrite(request.Category, request.Amount);

        var now = DateTime.UtcNow;
        var entity = new ProjectExpense
        {
            ProjectId = project.Id,
            Category = request.Category.Trim(),
            Amount = request.Amount,
            ExpenseDate = request.ExpenseDate,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.ProjectExpenses.Add(entity);
        project.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        return MapExpense(entity);
    }

    public async Task<ProjectExpenseDto> UpdateExpenseAsync(
        int projectId,
        int expenseId,
        UpdateProjectExpenseRequest request,
        CancellationToken ct = default)
    {
        var entity = await _db.ProjectExpenses
            .Include(e => e.Project)
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Expense {expenseId} was not found.");

        EnsureProjectOpenForExpenseEdits(entity.Project.Status);
        ValidateExpenseWrite(request.Category, request.Amount);

        var now = DateTime.UtcNow;
        entity.Category = request.Category.Trim();
        entity.Amount = request.Amount;
        entity.ExpenseDate = request.ExpenseDate;
        entity.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        entity.UpdatedAt = now;
        entity.Project.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);
        return MapExpense(entity);
    }

    public async Task RemoveExpenseAsync(int projectId, int expenseId, CancellationToken ct = default)
    {
        var entity = await _db.ProjectExpenses
            .Include(e => e.Project)
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Expense {expenseId} was not found.");

        EnsureProjectOpenForExpenseEdits(entity.Project.Status);

        entity.Project.UpdatedAt = DateTime.UtcNow;
        _db.ProjectExpenses.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private static void EnsureProjectOpenForExpenseEdits(string status)
    {
        if (!ProjectStatuses.IsOpen(status))
            throw new ValidationException("Витрати можна змінювати лише для активних проектів.");
    }

    private static void ValidateExpenseWrite(string category, decimal amount)
    {
        if (string.IsNullOrWhiteSpace(category))
            throw new ValidationException("Категорія обов'язкова.");
        if (category.Trim().Length > 200)
            throw new ValidationException("Категорія не може перевищувати 200 символів.");
        if (amount <= 0)
            throw new ValidationException("Сума повинна бути більшою за нуль.");
    }

    private static ProjectExpenseDto MapExpense(ProjectExpense entity) =>
        new(
            entity.Id,
            entity.Category,
            entity.Amount,
            entity.ExpenseDate,
            entity.Notes,
            entity.CreatedAt,
            entity.UpdatedAt);

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
            throw new ValidationException("Status must be Awaiting, InProgress, or Completed.");
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

    private async Task<ProjectDetailDto> MapDetailAsync(Project project, CancellationToken ct)
    {
        var userIds = project.ProjectWorkers.Select(w => w.UserId).Distinct().ToList();
        var users = await _userManager.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var warehouseItemIds = project.ProjectItems
            .Where(i => i.WarehouseItemId is not null)
            .Select(i => i.WarehouseItemId!.Value)
            .Distinct()
            .ToList();

        var reservedByOthers = await _materials.GetReservedByOthersAsync(
            warehouseItemIds,
            excludeProjectId: project.Id,
            ct);

        var lotIds = project.ProjectItems
            .SelectMany(i => i.ProjectItemLotAllocations)
            .Select(a => a.WarehouseStockLotId)
            .Distinct()
            .ToList();

        var allOpenLotReserved = await _db.ProjectItemLotAllocations
            .AsNoTracking()
            .Where(a =>
                lotIds.Contains(a.WarehouseStockLotId) &&
                (a.ProjectItem.Project.Status == ProjectStatuses.Awaiting ||
                 a.ProjectItem.Project.Status == ProjectStatuses.InProgress) &&
                a.ProjectItem.ProjectId != project.Id)
            .GroupBy(a => a.WarehouseStockLotId)
            .Select(g => new { LotId = g.Key, Reserved = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.LotId, x => x.Reserved, ct);

        return new ProjectDetailDto(
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
                .OrderBy(i => i.WarehouseItemId == null
                    ? i.RequestedName
                    : i.WarehouseItem!.Name)
                .Select(i =>
                {
                    if (i.WarehouseItemId is null || i.WarehouseItem is null)
                        return ProjectMaterialsService.MapNonCatalog(i);

                    var available = Math.Max(
                        0,
                        i.WarehouseItem.QuantityInStock - reservedByOthers.GetValueOrDefault(i.WarehouseItemId.Value));
                    return ProjectMaterialsService.MapCatalog(
                        i,
                        i.WarehouseItem,
                        available,
                        allOpenLotReserved);
                })
                .ToList(),
            project.ProjectWorkers
                .OrderBy(w => users.TryGetValue(w.UserId, out var u) ? u.FullName : w.UserId)
                .Select(w =>
                {
                    users.TryGetValue(w.UserId, out var user);
                    return new ProjectWorkerDto(
                        w.Id,
                        w.UserId,
                        user?.FullName ?? w.UserId,
                        user?.WorkerType,
                        user?.PhoneNumber,
                        w.RoleOnProject,
                        w.AssignedAt);
                })
                .ToList(),
            project.ProjectPhotos
                .OrderByDescending(p => p.UploadedAt)
                .Select(p => new ProjectPhotoDto(p.Id, p.FilePathOrUrl, p.Caption, p.UploadedAt))
                .ToList(),
            project.ProjectExpenses
                .OrderByDescending(e => e.ExpenseDate ?? e.CreatedAt)
                .ThenByDescending(e => e.Id)
                .Select(MapExpense)
                .ToList());
    }
}
