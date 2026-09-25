using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

/// <summary>
/// Assigns warehouse materials to projects with stock check / purchase flagging.
/// Open projects (Awaiting/InProgress) reserve stock but do not reduce QuantityInStock.
/// Completing a project consumes QuantityFromStock from the warehouse.
/// Non-catalog requests are fully flagged as NeedsPurchase.
/// </summary>
public class ProjectMaterialsService
{
    private readonly SellaSolarAdminContext _db;

    public ProjectMaterialsService(SellaSolarAdminContext db)
    {
        _db = db;
    }

    public async Task<ProjectItemDto> AddItemAsync(int projectId, AssignProjectItemRequest request, CancellationToken ct = default)
    {
        if (request.QuantityNeeded <= 0)
            throw new ValidationException("QuantityNeeded must be greater than zero.");

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        var hasCatalog = request.WarehouseItemId is > 0;
        var hasRequested =
            !string.IsNullOrWhiteSpace(request.RequestedName) &&
            !string.IsNullOrWhiteSpace(request.RequestedCategory) &&
            !string.IsNullOrWhiteSpace(request.RequestedUnit);

        if (hasCatalog == hasRequested)
            throw new ValidationException(
                "Provide either WarehouseItemId or RequestedName/RequestedCategory/RequestedUnit (not both, not neither).");

        if (hasCatalog)
            return await AddCatalogItemAsync(project, request.WarehouseItemId!.Value, request.QuantityNeeded, ct);

        return await AddNonCatalogItemAsync(
            project,
            request.RequestedName!.Trim(),
            request.RequestedCategory!.Trim(),
            request.RequestedUnit!.Trim(),
            request.QuantityNeeded,
            ct);
    }

    public async Task RemoveItemAsync(int projectId, int projectItemId, CancellationToken ct = default)
    {
        var item = await _db.ProjectItems
            .Include(pi => pi.WarehouseItem)
            .Include(pi => pi.Project)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId && pi.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        // Stock was only consumed if the project is already Completed.
        if (item.WarehouseItem is not null && item.Project.Status == ProjectStatuses.Completed)
            item.WarehouseItem.QuantityInStock += item.QuantityFromStock;

        item.Project.UpdatedAt = DateTime.UtcNow;

        _db.ProjectItems.Remove(item);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ProjectItemDto> UpdateItemAsync(
        int projectId,
        int projectItemId,
        UpdateProjectItemRequest request,
        CancellationToken ct = default)
    {
        if (request.QuantityNeeded <= 0)
            throw new ValidationException("QuantityNeeded must be greater than zero.");

        var item = await _db.ProjectItems
            .Include(pi => pi.WarehouseItem)
            .Include(pi => pi.Project)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId && pi.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        if (item.Project.Status == ProjectStatuses.Completed)
            throw new ConflictException(
                "Cannot change material quantity on a completed project. Reopen the project first.");

        item.QuantityNeeded = request.QuantityNeeded;

        if (item.WarehouseItemId is null)
        {
            item.QuantityFromStock = 0;
            item.QuantityToPurchase = request.QuantityNeeded;
            item.NeedsPurchase = true;
            item.Project.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return MapNonCatalog(item);
        }

        var available = await GetUnreservedStockAsync(item.WarehouseItemId.Value, excludeProjectId: projectId, ct);
        var fromStock = Math.Min(available, request.QuantityNeeded);
        var toPurchase = request.QuantityNeeded - fromStock;

        item.QuantityFromStock = fromStock;
        item.QuantityToPurchase = toPurchase;
        item.NeedsPurchase = toPurchase > 0;
        item.Project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return MapCatalog(item, item.WarehouseItem!, available);
    }

    /// <summary>
    /// Applies warehouse side effects when project status changes.
    /// Completed consumes reserved stock; leaving Completed restores it.
    /// </summary>
    public void ApplyStatusStockTransition(Project project, string previousStatus, string newStatus)
    {
        if (previousStatus == newStatus)
            return;

        var becomingCompleted = newStatus == ProjectStatuses.Completed && previousStatus != ProjectStatuses.Completed;
        var leavingCompleted = previousStatus == ProjectStatuses.Completed && newStatus != ProjectStatuses.Completed;

        if (!becomingCompleted && !leavingCompleted)
            return;

        foreach (var item in project.ProjectItems)
        {
            if (item.WarehouseItem is null || item.QuantityFromStock <= 0)
                continue;

            if (becomingCompleted)
                item.WarehouseItem.QuantityInStock -= item.QuantityFromStock;
            else
                item.WarehouseItem.QuantityInStock += item.QuantityFromStock;
        }
    }

    /// <summary>
    /// Restores stock for a project being deleted only if stock was already consumed (Completed).
    /// </summary>
    public static void RestoreStockIfConsumed(Project project)
    {
        if (project.Status != ProjectStatuses.Completed)
            return;

        foreach (var item in project.ProjectItems)
        {
            if (item.WarehouseItem is not null && item.QuantityFromStock > 0)
                item.WarehouseItem.QuantityInStock += item.QuantityFromStock;
        }
    }

    private async Task<ProjectItemDto> AddCatalogItemAsync(
        Project project,
        int warehouseItemId,
        decimal quantityNeeded,
        CancellationToken ct)
    {
        var warehouseItem = await _db.WarehouseItems.FirstOrDefaultAsync(w => w.Id == warehouseItemId, ct)
            ?? throw new NotFoundException($"Warehouse item {warehouseItemId} was not found.");

        var alreadyAssigned = await _db.ProjectItems
            .AnyAsync(pi => pi.ProjectId == project.Id && pi.WarehouseItemId == warehouseItemId, ct);
        if (alreadyAssigned)
            throw new ConflictException("This warehouse item is already assigned to the project. Remove it first or choose another item.");

        var available = await GetUnreservedStockAsync(warehouseItemId, excludeProjectId: project.Id, ct);
        var fromStock = Math.Min(available, quantityNeeded);
        var toPurchase = quantityNeeded - fromStock;
        var needsPurchase = toPurchase > 0;

        var entity = new ProjectItem
        {
            ProjectId = project.Id,
            WarehouseItemId = warehouseItem.Id,
            QuantityNeeded = quantityNeeded,
            QuantityFromStock = fromStock,
            QuantityToPurchase = toPurchase,
            NeedsPurchase = needsPurchase
        };

        // Only consume immediately if assigning onto an already-completed project.
        if (project.Status == ProjectStatuses.Completed && fromStock > 0)
            warehouseItem.QuantityInStock -= fromStock;

        _db.ProjectItems.Add(entity);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return MapCatalog(entity, warehouseItem, available);
    }

    private async Task<ProjectItemDto> AddNonCatalogItemAsync(
        Project project,
        string name,
        string category,
        string unit,
        decimal quantityNeeded,
        CancellationToken ct)
    {
        var alreadyRequested = await _db.ProjectItems
            .AnyAsync(pi =>
                pi.ProjectId == project.Id &&
                pi.WarehouseItemId == null &&
                pi.RequestedName == name, ct);
        if (alreadyRequested)
            throw new ConflictException("This material is already requested for the project. Remove it first or choose another name.");

        var entity = new ProjectItem
        {
            ProjectId = project.Id,
            WarehouseItemId = null,
            RequestedName = name,
            RequestedCategory = category,
            RequestedUnit = unit,
            QuantityNeeded = quantityNeeded,
            QuantityFromStock = 0,
            QuantityToPurchase = quantityNeeded,
            NeedsPurchase = true
        };

        _db.ProjectItems.Add(entity);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return MapNonCatalog(entity);
    }

    /// <summary>
    /// Stock still on hand minus amounts reserved by other open projects.
    /// </summary>
    private async Task<decimal> GetUnreservedStockAsync(int warehouseItemId, int excludeProjectId, CancellationToken ct)
    {
        var onHand = await _db.WarehouseItems
            .Where(w => w.Id == warehouseItemId)
            .Select(w => w.QuantityInStock)
            .FirstAsync(ct);

        var reservedByOthers = await GetReservedByOthersAsync(
            new[] { warehouseItemId },
            excludeProjectId,
            ct);

        return Math.Max(0, onHand - reservedByOthers.GetValueOrDefault(warehouseItemId));
    }

    /// <summary>
    /// Sum of QuantityFromStock reserved by other open projects, keyed by warehouse item id.
    /// </summary>
    internal async Task<Dictionary<int, decimal>> GetReservedByOthersAsync(
        IReadOnlyCollection<int> warehouseItemIds,
        int excludeProjectId,
        CancellationToken ct)
    {
        if (warehouseItemIds.Count == 0)
            return new Dictionary<int, decimal>();

        return await _db.ProjectItems
            .AsNoTracking()
            .Where(pi =>
                pi.WarehouseItemId != null &&
                warehouseItemIds.Contains(pi.WarehouseItemId.Value) &&
                pi.ProjectId != excludeProjectId &&
                (pi.Project.Status == ProjectStatuses.Awaiting || pi.Project.Status == ProjectStatuses.InProgress))
            .GroupBy(pi => pi.WarehouseItemId!.Value)
            .Select(g => new { WarehouseItemId = g.Key, Reserved = g.Sum(x => x.QuantityFromStock) })
            .ToDictionaryAsync(x => x.WarehouseItemId, x => x.Reserved, ct);
    }

    internal static ProjectItemDto MapCatalog(
        ProjectItem entity,
        WarehouseItem warehouseItem,
        decimal quantityAvailable) =>
        new(
            entity.Id,
            warehouseItem.Id,
            warehouseItem.Name,
            warehouseItem.Category,
            warehouseItem.Unit,
            entity.QuantityNeeded,
            entity.QuantityFromStock,
            entity.QuantityToPurchase,
            entity.NeedsPurchase,
            warehouseItem.QuantityInStock,
            quantityAvailable,
            IsNonCatalog: false);

    internal static ProjectItemDto MapNonCatalog(ProjectItem entity) =>
        new(
            entity.Id,
            null,
            entity.RequestedName ?? string.Empty,
            entity.RequestedCategory ?? string.Empty,
            entity.RequestedUnit ?? string.Empty,
            entity.QuantityNeeded,
            entity.QuantityFromStock,
            entity.QuantityToPurchase,
            entity.NeedsPurchase,
            QuantityInStock: 0,
            QuantityAvailable: 0,
            IsNonCatalog: true);
}
