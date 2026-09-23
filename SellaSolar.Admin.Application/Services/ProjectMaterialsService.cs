using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

/// <summary>
/// Assigns warehouse materials to projects with stock check / purchase flagging.
/// ASSUMPTION: QuantityFromStock is deducted from WarehouseItem.QuantityInStock immediately on assign.
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

        var warehouseItem = await _db.WarehouseItems.FirstOrDefaultAsync(w => w.Id == request.WarehouseItemId, ct)
            ?? throw new NotFoundException($"Warehouse item {request.WarehouseItemId} was not found.");

        var alreadyAssigned = await _db.ProjectItems
            .AnyAsync(pi => pi.ProjectId == projectId && pi.WarehouseItemId == request.WarehouseItemId, ct);
        if (alreadyAssigned)
            throw new ConflictException("This warehouse item is already assigned to the project. Remove it first or choose another item.");

        var available = warehouseItem.QuantityInStock;
        var fromStock = Math.Min(available, request.QuantityNeeded);
        var toPurchase = request.QuantityNeeded - fromStock;
        var needsPurchase = toPurchase > 0;

        // Immediate stock deduction (documented MVP assumption).
        warehouseItem.QuantityInStock -= fromStock;

        var entity = new ProjectItem
        {
            ProjectId = project.Id,
            WarehouseItemId = warehouseItem.Id,
            QuantityNeeded = request.QuantityNeeded,
            QuantityFromStock = fromStock,
            QuantityToPurchase = toPurchase,
            NeedsPurchase = needsPurchase
        };

        _db.ProjectItems.Add(entity);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Map(entity, warehouseItem);
    }

    public async Task RemoveItemAsync(int projectId, int projectItemId, CancellationToken ct = default)
    {
        var item = await _db.ProjectItems
            .Include(pi => pi.WarehouseItem)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId && pi.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        // Restore previously deducted stock.
        item.WarehouseItem.QuantityInStock += item.QuantityFromStock;

        var project = await _db.Projects.FirstAsync(p => p.Id == projectId, ct);
        project.UpdatedAt = DateTime.UtcNow;

        _db.ProjectItems.Remove(item);
        await _db.SaveChangesAsync(ct);
    }

    private static ProjectItemDto Map(ProjectItem entity, WarehouseItem warehouseItem) =>
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
            warehouseItem.QuantityInStock);
}
