using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

/// <summary>
/// Assigns warehouse materials to projects. Catalog lines soft-reserve via manual lot allocations.
/// Completing a project consumes allocated lot QuantityOnHand (and catalog QuantityInStock).
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
            throw new ValidationException("Потрібна кількість повинна бути більшою за нуль.");

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new NotFoundException($"Project {projectId} was not found.");

        var hasCatalog = request.WarehouseItemId is > 0;
        var hasRequested =
            !string.IsNullOrWhiteSpace(request.RequestedName) &&
            !string.IsNullOrWhiteSpace(request.RequestedCategory) &&
            !string.IsNullOrWhiteSpace(request.RequestedUnit);

        if (hasCatalog == hasRequested)
            throw new ValidationException(
                "Вкажіть або позицію складу (WarehouseItemId), або назву/категорію/одиницю поза каталогом.");

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
            .Include(pi => pi.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId && pi.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        // Stock was only consumed if the project is already Completed.
        if (item.WarehouseItem is not null && item.Project.Status == ProjectStatuses.Completed)
            RestoreConsumedAllocations(item);

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
            throw new ValidationException("Потрібна кількість повинна бути більшою за нуль.");

        var item = await _db.ProjectItems
            .Include(pi => pi.WarehouseItem)
            .Include(pi => pi.Project)
            .Include(pi => pi.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId && pi.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        if (item.Project.Status == ProjectStatuses.Completed)
            throw new ConflictException(
                "Неможливо змінити кількість матеріалу на завершеному проекті. Спочатку поверніть проект у роботу.");

        if (item.WarehouseItemId is null)
        {
            item.QuantityNeeded = request.QuantityNeeded;
            item.QuantityFromStock = 0;
            item.QuantityToPurchase = request.QuantityNeeded;
            item.NeedsPurchase = true;
            item.Project.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return MapNonCatalog(item);
        }

        var allocated = item.ProjectItemLotAllocations.Sum(a => a.Quantity);
        if (request.QuantityNeeded < allocated)
            throw new ValidationException(
                $"Потрібна кількість ({request.QuantityNeeded}) менша за вже розподілені партії ({allocated}). Спочатку зменшіть розподіл партій.");

        var maxFromStock = await GetUnreservedStockAsync(item.WarehouseItemId.Value, excludeProjectId: projectId, ct);
        item.QuantityNeeded = request.QuantityNeeded;
        ApplyDerivedStockFields(item, allocated, maxFromStock);
        item.Project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return await MapCatalogAsync(item, item.WarehouseItem!, ct);
    }

    public async Task<ProjectItemDto> SetAllocationsAsync(
        int projectId,
        int projectItemId,
        SetProjectItemAllocationsRequest request,
        CancellationToken ct = default)
    {
        var item = await _db.ProjectItems
            .Include(pi => pi.WarehouseItem)
            .Include(pi => pi.Project)
            .Include(pi => pi.ProjectItemLotAllocations)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId && pi.ProjectId == projectId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        if (item.WarehouseItemId is null || item.WarehouseItem is null)
            throw new ValidationException("Розподіл партій доступний лише для матеріалів зі складу.");

        if (!ProjectStatuses.IsOpen(item.Project.Status))
            throw new ConflictException(
                "Розподіл партій можливий лише для відкритих проектів (очікує / у роботі).");

        var inputs = (request.Allocations ?? Array.Empty<ProjectItemLotAllocationInput>())
            .Where(a => a.Quantity > 0)
            .ToList();

        if (inputs.GroupBy(a => a.WarehouseStockLotId).Any(g => g.Count() > 1))
            throw new ValidationException("Кожну партію можна вказати лише один раз.");

        foreach (var input in inputs)
        {
            if (input.Quantity <= 0)
                throw new ValidationException("Кількість розподілу повинна бути більшою за нуль.");
        }

        var total = inputs.Sum(a => a.Quantity);
        if (total > item.QuantityNeeded)
            throw new ValidationException(
                $"Сума розподілу ({total}) перевищує потрібну кількість ({item.QuantityNeeded}).");

        var lotIds = inputs.Select(a => a.WarehouseStockLotId).Distinct().ToList();
        var lots = await _db.WarehouseStockLots
            .Where(l => lotIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, ct);

        if (lots.Count != lotIds.Count)
            throw new NotFoundException("Одну або кілька партій не знайдено.");

        foreach (var lot in lots.Values)
        {
            if (lot.WarehouseItemId != item.WarehouseItemId)
                throw new ValidationException("Партія не належить до цієї позиції складу.");
        }

        var reservedByOthers = await GetLotReservedByOthersAsync(lotIds, excludeProjectItemId: item.Id, ct);

        foreach (var input in inputs)
        {
            var lot = lots[input.WarehouseStockLotId];
            var free = Math.Max(0, lot.QuantityOnHand - reservedByOthers.GetValueOrDefault(lot.Id));
            if (input.Quantity > free)
                throw new ValidationException(
                    $"Недостатньо вільного залишку в партії #{lot.Id}: доступно {free}, запитано {input.Quantity}.");
        }

        _db.ProjectItemLotAllocations.RemoveRange(item.ProjectItemLotAllocations);
        item.ProjectItemLotAllocations.Clear();

        foreach (var input in inputs)
        {
            item.ProjectItemLotAllocations.Add(new ProjectItemLotAllocation
            {
                ProjectItemId = item.Id,
                WarehouseStockLotId = input.WarehouseStockLotId,
                Quantity = input.Quantity,
                WarehouseStockLot = lots[input.WarehouseStockLotId]
            });
        }

        var maxFromStock = await GetUnreservedStockAsync(
            item.WarehouseItemId.Value,
            excludeProjectId: projectId,
            ct);
        ApplyDerivedStockFields(item, total, maxFromStock);
        ApplyCostFromStock(item);
        item.Project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // Reload allocations with lots for mapping.
        await _db.Entry(item).Collection(i => i.ProjectItemLotAllocations).Query()
            .Include(a => a.WarehouseStockLot)
            .LoadAsync(ct);

        return await MapCatalogAsync(item, item.WarehouseItem, ct);
    }

    /// <summary>
    /// After receiving a new lot, optionally allocate part of it onto an open project line.
    /// </summary>
    public async Task AllocateFromNewLotAsync(
        int projectItemId,
        int lotId,
        decimal quantity,
        int expectedWarehouseItemId,
        CancellationToken ct)
    {
        if (quantity <= 0)
            throw new ValidationException("Кількість розподілу повинна бути більшою за нуль.");

        var item = await _db.ProjectItems
            .Include(pi => pi.WarehouseItem)
            .Include(pi => pi.Project)
            .Include(pi => pi.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .FirstOrDefaultAsync(pi => pi.Id == projectItemId, ct)
            ?? throw new NotFoundException($"Project item {projectItemId} was not found.");

        if (item.WarehouseItemId != expectedWarehouseItemId)
            throw new ValidationException("Позиція проекту не відповідає цій позиції складу.");

        if (!ProjectStatuses.IsOpen(item.Project.Status))
            throw new ConflictException(
                "Розподіл партій можливий лише для відкритих проектів (очікує / у роботі).");

        var lot = await _db.WarehouseStockLots.FirstOrDefaultAsync(l => l.Id == lotId, ct)
            ?? throw new NotFoundException($"Lot {lotId} was not found.");

        if (lot.WarehouseItemId != item.WarehouseItemId)
            throw new ValidationException("Партія не належить до цієї позиції складу.");

        var currentOnLot = item.ProjectItemLotAllocations
            .Where(a => a.WarehouseStockLotId == lotId)
            .Sum(a => a.Quantity);
        var otherAllocated = item.ProjectItemLotAllocations
            .Where(a => a.WarehouseStockLotId != lotId)
            .Sum(a => a.Quantity);
        var newTotal = otherAllocated + currentOnLot + quantity;
        if (newTotal > item.QuantityNeeded)
            throw new ValidationException(
                $"Сума розподілу ({newTotal}) перевищує потрібну кількість ({item.QuantityNeeded}).");

        var reservedByOthers = await GetLotReservedByOthersAsync(
            new[] { lotId },
            excludeProjectItemId: item.Id,
            ct);
        var free = Math.Max(0, lot.QuantityOnHand - reservedByOthers.GetValueOrDefault(lotId));
        // Current allocation on this lot is already excluded via excludeProjectItemId,
        // so free includes room previously held by this item; requested is only the delta.
        if (quantity > free - currentOnLot)
        {
            var availableForDelta = Math.Max(0, free - currentOnLot);
            throw new ValidationException(
                $"Недостатньо вільного залишку в партії #{lot.Id}: доступно {availableForDelta}, запитано {quantity}.");
        }

        var existing = item.ProjectItemLotAllocations.FirstOrDefault(a => a.WarehouseStockLotId == lotId);
        if (existing is null)
        {
            item.ProjectItemLotAllocations.Add(new ProjectItemLotAllocation
            {
                ProjectItemId = item.Id,
                WarehouseStockLotId = lotId,
                Quantity = quantity
            });
        }
        else
        {
            existing.Quantity += quantity;
        }

        ApplyDerivedStockFields(item, newTotal, maxFromStock: await GetUnreservedStockAsync(
            item.WarehouseItemId.Value,
            excludeProjectId: item.ProjectId,
            ct));
        ApplyCostFromStock(item);
        item.Project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Applies warehouse / lot side effects when project status changes.
    /// Completed consumes allocated lot on-hand; leaving Completed restores it.
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
            if (item.WarehouseItem is null)
                continue;

            if (becomingCompleted)
                ConsumeAllocations(item);
            else
                RestoreConsumedAllocations(item);
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
            if (item.WarehouseItem is not null)
                RestoreConsumedAllocations(item);
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
            throw new ConflictException(
                "Ця позиція складу вже додана до проекту. Видаліть її або оберіть іншу.");

        // Manual allocation: no auto-reserve from free stock.
        var maxFromStock = await GetUnreservedStockAsync(warehouseItemId, excludeProjectId: project.Id, ct);
        var entity = new ProjectItem
        {
            ProjectId = project.Id,
            WarehouseItemId = warehouseItem.Id,
            QuantityNeeded = quantityNeeded,
            QuantityFromStock = 0,
            QuantityToPurchase = quantityNeeded,
            NeedsPurchase = quantityNeeded > maxFromStock
        };

        _db.ProjectItems.Add(entity);
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return await MapCatalogAsync(entity, warehouseItem, ct);
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
            throw new ConflictException(
                "Цей матеріал уже запрошено для проекту. Видаліть його або оберіть іншу назву.");

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
    /// QuantityToPurchase = not yet allocated. NeedsPurchase = needed exceeds free stock capacity
    /// (must buy; not merely awaiting manual lot allocation).
    /// </summary>
    private static void ApplyDerivedStockFields(ProjectItem item, decimal fromStock, decimal maxFromStock)
    {
        item.QuantityFromStock = fromStock;
        item.QuantityToPurchase = Math.Max(0, item.QuantityNeeded - fromStock);
        item.NeedsPurchase = item.QuantityNeeded > maxFromStock;
    }

    /// <summary>
    /// Persists project material cost from loaded allocations + lots.
    /// Call after allocations are replaced/updated and lots are available.
    /// </summary>
    private static void ApplyCostFromStock(ProjectItem item)
    {
        var allocations = item.ProjectItemLotAllocations;
        if (allocations is null || allocations.Count == 0)
        {
            item.CostFromStock = null;
            return;
        }

        decimal? total = 0;
        foreach (var a in allocations)
        {
            if (a.Quantity <= 0)
                continue;
            if (a.WarehouseStockLot is null)
            {
                // Incomplete graph — leave existing snapshot untouched.
                return;
            }

            total += a.Quantity * a.WarehouseStockLot.UnitCost;
        }

        item.CostFromStock = total == 0 ? null : total;
    }

    private static void ConsumeAllocations(ProjectItem item)
    {
        decimal consumed = 0;
        foreach (var allocation in item.ProjectItemLotAllocations)
        {
            if (allocation.WarehouseStockLot is null || allocation.Quantity <= 0)
                continue;

            allocation.WarehouseStockLot.QuantityOnHand -= allocation.Quantity;
            consumed += allocation.Quantity;
        }

        if (consumed > 0 && item.WarehouseItem is not null)
            item.WarehouseItem.QuantityInStock -= consumed;
    }

    private static void RestoreConsumedAllocations(ProjectItem item)
    {
        decimal restored = 0;
        foreach (var allocation in item.ProjectItemLotAllocations)
        {
            if (allocation.WarehouseStockLot is null || allocation.Quantity <= 0)
                continue;

            allocation.WarehouseStockLot.QuantityOnHand += allocation.Quantity;
            restored += allocation.Quantity;
        }

        // Fallback for legacy lines without allocations (should be rare after migration).
        if (restored == 0 && item.QuantityFromStock > 0 && item.WarehouseItem is not null)
        {
            item.WarehouseItem.QuantityInStock += item.QuantityFromStock;
            return;
        }

        if (restored > 0 && item.WarehouseItem is not null)
            item.WarehouseItem.QuantityInStock += restored;
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

    internal async Task<Dictionary<int, decimal>> GetLotReservedByOthersAsync(
        IReadOnlyCollection<int> lotIds,
        int excludeProjectItemId,
        CancellationToken ct)
    {
        if (lotIds.Count == 0)
            return new Dictionary<int, decimal>();

        return await _db.ProjectItemLotAllocations
            .AsNoTracking()
            .Where(a =>
                lotIds.Contains(a.WarehouseStockLotId) &&
                a.ProjectItemId != excludeProjectItemId &&
                (a.ProjectItem.Project.Status == ProjectStatuses.Awaiting ||
                 a.ProjectItem.Project.Status == ProjectStatuses.InProgress))
            .GroupBy(a => a.WarehouseStockLotId)
            .Select(g => new { LotId = g.Key, Reserved = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.LotId, x => x.Reserved, ct);
    }

    internal async Task<ProjectItemDto> MapCatalogAsync(
        ProjectItem entity,
        WarehouseItem warehouseItem,
        CancellationToken ct)
    {
        var available = await GetUnreservedStockAsync(
            warehouseItem.Id,
            excludeProjectId: entity.ProjectId,
            ct);

        var allocations = entity.ProjectItemLotAllocations?.ToList()
            ?? new List<ProjectItemLotAllocation>();

        // Ensure lots are loaded when present.
        var needLotLoad = allocations.Any(a => a.WarehouseStockLot is null);
        if (needLotLoad && allocations.Count > 0)
        {
            await _db.Entry(entity).Collection(i => i.ProjectItemLotAllocations).Query()
                .Include(a => a.WarehouseStockLot)
                .LoadAsync(ct);
            allocations = entity.ProjectItemLotAllocations?.ToList()
                ?? new List<ProjectItemLotAllocation>();
        }

        var lotIds = allocations.Select(a => a.WarehouseStockLotId).Distinct().ToList();
        var reservedByOthers = await GetLotReservedByOthersAsync(lotIds, excludeProjectItemId: entity.Id, ct);

        var allocationDtos = allocations
            .OrderBy(a => a.WarehouseStockLot?.ReceivedAt ?? DateTime.MinValue)
            .ThenBy(a => a.WarehouseStockLotId)
            .Select(a =>
            {
                var lot = a.WarehouseStockLot!;
                var freeIncludingThis = Math.Max(
                    0,
                    lot.QuantityOnHand - reservedByOthers.GetValueOrDefault(lot.Id));
                return new ProjectItemLotAllocationDto(
                    lot.Id,
                    lot.UnitCost,
                    a.Quantity,
                    lot.ReceivedAt,
                    freeIncludingThis);
            })
            .ToList();

        decimal? costFromStock = allocationDtos.Count > 0
            ? allocationDtos.Sum(a => a.Quantity * a.UnitCost)
            : entity.CostFromStock;

        // NeedsPurchase = must buy (needed exceeds free stock), not merely unallocated.
        var needsPurchase = entity.QuantityNeeded > available;

        return new ProjectItemDto(
            entity.Id,
            warehouseItem.Id,
            warehouseItem.Name,
            warehouseItem.Category,
            warehouseItem.Unit,
            entity.QuantityNeeded,
            entity.QuantityFromStock,
            entity.QuantityToPurchase,
            needsPurchase,
            warehouseItem.QuantityInStock,
            available,
            IsNonCatalog: false,
            allocationDtos,
            costFromStock);
    }

    /// <summary>
    /// Sync mapping when allocations + lots are already loaded (e.g. project detail).
    /// </summary>
    internal static ProjectItemDto MapCatalog(
        ProjectItem entity,
        WarehouseItem warehouseItem,
        decimal quantityAvailable,
        IReadOnlyDictionary<int, decimal>? lotReservedByOthers = null)
    {
        var allocations = entity.ProjectItemLotAllocations ?? Array.Empty<ProjectItemLotAllocation>();
        var allocationDtos = allocations
            .Where(a => a.WarehouseStockLot is not null)
            .OrderBy(a => a.WarehouseStockLot!.ReceivedAt)
            .ThenBy(a => a.WarehouseStockLotId)
            .Select(a =>
            {
                var lot = a.WarehouseStockLot!;
                decimal? free = null;
                if (lotReservedByOthers is not null)
                {
                    free = Math.Max(
                        0,
                        lot.QuantityOnHand - lotReservedByOthers.GetValueOrDefault(lot.Id));
                }

                return new ProjectItemLotAllocationDto(
                    lot.Id,
                    lot.UnitCost,
                    a.Quantity,
                    lot.ReceivedAt,
                    free);
            })
            .ToList();

        // Prefer live allocation math when lots are loaded; else persisted snapshot
        // (Completed projects / legacy lines without navigation loads).
        decimal? costFromStock = allocationDtos.Count > 0
            ? allocationDtos.Sum(a => a.Quantity * a.UnitCost)
            : entity.CostFromStock;

        var needsPurchase = entity.QuantityNeeded > quantityAvailable;

        return new ProjectItemDto(
            entity.Id,
            warehouseItem.Id,
            warehouseItem.Name,
            warehouseItem.Category,
            warehouseItem.Unit,
            entity.QuantityNeeded,
            entity.QuantityFromStock,
            entity.QuantityToPurchase,
            needsPurchase,
            warehouseItem.QuantityInStock,
            quantityAvailable,
            IsNonCatalog: false,
            allocationDtos,
            costFromStock);
    }

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
            IsNonCatalog: true,
            Allocations: Array.Empty<ProjectItemLotAllocationDto>(),
            CostFromStock: null);
}
