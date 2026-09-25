using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

public class WarehouseService
{
    private readonly SellaSolarAdminContext _db;

    public WarehouseService(SellaSolarAdminContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<WarehouseItemListDto>> GetAllAsync(
        string? category = null,
        string? search = null,
        bool? lowStockOnly = null,
        bool? needsPurchaseOnly = null,
        CancellationToken ct = default)
    {
        var query = _db.WarehouseItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(w => w.Category == category);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(w =>
                w.Name.Contains(term) ||
                w.Category.Contains(term) ||
                (w.Supplier != null && w.Supplier.Contains(term)));
        }

        var openStatuses = new[] { ProjectStatuses.Awaiting, ProjectStatuses.InProgress };

        var items = await query
            .OrderBy(w => w.Name)
            .Select(w => new
            {
                Item = w,
                UsedCount = w.ProjectItems.Count(pi => openStatuses.Contains(pi.Project.Status)),
                Reserved = w.ProjectItems
                    .Where(pi => openStatuses.Contains(pi.Project.Status))
                    .Sum(pi => (decimal?)pi.QuantityFromStock) ?? 0m
            })
            .ToListAsync(ct);

        var warehouseIds = items.Select(x => x.Item.Id).ToList();
        var openLines = await _db.ProjectItems
            .AsNoTracking()
            .Where(pi =>
                pi.WarehouseItemId != null &&
                warehouseIds.Contains(pi.WarehouseItemId.Value) &&
                openStatuses.Contains(pi.Project.Status))
            .Select(pi => new
            {
                WarehouseItemId = pi.WarehouseItemId!.Value,
                pi.QuantityNeeded,
                pi.QuantityFromStock
            })
            .ToListAsync(ct);

        var reservedByWarehouse = openLines
            .GroupBy(x => x.WarehouseItemId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityFromStock));

        var mapped = items
            .Select(x =>
            {
                var available = Available(x.Item.QuantityInStock, x.Reserved);
                var totalReserved = reservedByWarehouse.GetValueOrDefault(x.Item.Id);
                var quantityToOrder = openLines
                    .Where(l => l.WarehouseItemId == x.Item.Id)
                    .Sum(l =>
                    {
                        var maxFromStock = x.Item.QuantityInStock - totalReserved + l.QuantityFromStock;
                        return Math.Max(0, l.QuantityNeeded - maxFromStock);
                    });
                return MapList(x.Item, available, x.UsedCount, quantityToOrder);
            })
            .ToList();

        if (lowStockOnly == true)
            mapped = mapped.Where(m => m.IsLowStock).ToList();

        if (needsPurchaseOnly == true)
            mapped = mapped.Where(m => m.QuantityToOrder > 0).ToList();

        return mapped;
    }

    public async Task<IReadOnlyList<NonCatalogPurchaseRequestDto>> GetNonCatalogPurchaseRequestsAsync(
        CancellationToken ct = default)
    {
        var openStatuses = new[] { ProjectStatuses.Awaiting, ProjectStatuses.InProgress };

        return await _db.ProjectItems
            .AsNoTracking()
            .Where(pi =>
                pi.WarehouseItemId == null &&
                pi.NeedsPurchase &&
                openStatuses.Contains(pi.Project.Status))
            .OrderBy(pi => pi.RequestedName)
            .ThenBy(pi => pi.Project.Name)
            .Select(pi => new NonCatalogPurchaseRequestDto(
                pi.Id,
                pi.ProjectId,
                pi.Project.Name,
                pi.Project.Status,
                pi.RequestedName!,
                pi.RequestedCategory!,
                pi.RequestedUnit!,
                pi.QuantityToPurchase))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetCategoriesAsync(CancellationToken ct = default) =>
        await _db.WarehouseItems.AsNoTracking()
            .Select(w => w.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);

    public async Task<WarehouseItemDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var item = await _db.WarehouseItems
            .AsNoTracking()
            .Include(w => w.ProjectItems).ThenInclude(pi => pi.Project)
            .Include(w => w.WarehouseStockLots)
            .FirstOrDefaultAsync(w => w.Id == id, ct);

        if (item is null)
            return null;

        var reserved = item.ProjectItems
            .Where(pi => ProjectStatuses.IsOpen(pi.Project.Status))
            .Sum(pi => pi.QuantityFromStock);

        var lotIds = item.WarehouseStockLots.Select(l => l.Id).ToList();
        var reservedByLot = await GetLotReservedOpenAsync(lotIds, excludeProjectItemId: null, ct);

        return MapDetail(item, Available(item.QuantityInStock, reserved), reserved, reservedByLot);
    }

    public async Task<IReadOnlyList<WarehouseStockLotDto>> GetLotsAsync(int warehouseItemId, CancellationToken ct = default)
    {
        var exists = await _db.WarehouseItems.AnyAsync(w => w.Id == warehouseItemId, ct);
        if (!exists)
            throw new NotFoundException($"Warehouse item {warehouseItemId} was not found.");

        var lots = await _db.WarehouseStockLots
            .AsNoTracking()
            .Where(l => l.WarehouseItemId == warehouseItemId)
            .OrderByDescending(l => l.ReceivedAt)
            .ThenByDescending(l => l.Id)
            .ToListAsync(ct);

        var reservedByLot = await GetLotReservedOpenAsync(lots.Select(l => l.Id).ToList(), excludeProjectItemId: null, ct);
        return lots.Select(l => MapLot(l, reservedByLot.GetValueOrDefault(l.Id))).ToList();
    }

    public async Task<WarehouseItemDetailDto> CreateAsync(CreateWarehouseItemRequest request, CancellationToken ct = default)
    {
        ValidateCatalog(request.Name, request.Category, request.Unit);
        if (request.QuantityInStock < 0)
            throw new ValidationException("Кількість на складі не може бути від’ємною.");
        if (request.Price is < 0)
            throw new ValidationException("Ціна не може бути від’ємною.");

        var supplier = string.IsNullOrWhiteSpace(request.Supplier) ? null : request.Supplier.Trim();
        var entity = new WarehouseItem
        {
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Unit = request.Unit.Trim(),
            QuantityInStock = request.QuantityInStock,
            Price = request.Price,
            Supplier = supplier,
            Notes = request.Notes,
            LowStockThreshold = request.LowStockThreshold
        };

        _db.WarehouseItems.Add(entity);

        if (request.QuantityInStock > 0)
        {
            _db.WarehouseStockLots.Add(new WarehouseStockLot
            {
                WarehouseItem = entity,
                UnitCost = request.Price ?? 0m,
                QuantityOnHand = request.QuantityInStock,
                QuantityReceived = request.QuantityInStock,
                ReceivedAt = DateTime.UtcNow,
                Supplier = supplier,
                Notes = "Початкове додавання на склад",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(entity.Id, ct))!;
    }

    public async Task<WarehouseItemDetailDto> UpdateAsync(int id, UpdateWarehouseItemRequest request, CancellationToken ct = default)
    {
        ValidateCatalog(request.Name, request.Category, request.Unit);

        var entity = await _db.WarehouseItems.FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw new NotFoundException($"Warehouse item {id} was not found.");

        entity.Name = request.Name.Trim();
        entity.Category = request.Category.Trim();
        entity.Unit = request.Unit.Trim();
        entity.Supplier = string.IsNullOrWhiteSpace(request.Supplier) ? null : request.Supplier.Trim();
        entity.Notes = request.Notes;
        entity.LowStockThreshold = request.LowStockThreshold;

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    /// <summary>
    /// Creates a stock lot and increases QuantityInStock. Returns detail and the new lot id
    /// (caller may optionally allocate the lot to a project line).
    /// </summary>
    public async Task<(WarehouseItemDetailDto Detail, int NewLotId)> ReceiveAsync(
        int warehouseItemId,
        ReceiveWarehouseStockRequest request,
        CancellationToken ct = default)
    {
        if (request.Quantity <= 0)
            throw new ValidationException("Кількість додавання на склад повинна бути більшою за нуль.");
        if (request.UnitCost < 0)
            throw new ValidationException("Ціна за одиницю не може бути від’ємною.");

        var hasAllocateId = request.AllocateToProjectItemId is > 0;
        var hasAllocateQty = request.AllocateQuantity is > 0;
        if (hasAllocateId != hasAllocateQty)
            throw new ValidationException(
                "Для розподілу вкажіть і позицію проекту (allocateToProjectItemId), і кількість (allocateQuantity).");

        var entity = await _db.WarehouseItems.FirstOrDefaultAsync(w => w.Id == warehouseItemId, ct)
            ?? throw new NotFoundException($"Warehouse item {warehouseItemId} was not found.");

        var supplier = string.IsNullOrWhiteSpace(request.Supplier) ? null : request.Supplier.Trim();
        var receivedAt = request.ReceivedAt?.ToUniversalTime() ?? DateTime.UtcNow;

        var lot = new WarehouseStockLot
        {
            WarehouseItemId = entity.Id,
            UnitCost = request.UnitCost,
            QuantityOnHand = request.Quantity,
            QuantityReceived = request.Quantity,
            ReceivedAt = receivedAt,
            Supplier = supplier,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.WarehouseStockLots.Add(lot);
        entity.QuantityInStock += request.Quantity;
        entity.Price = request.UnitCost;
        if (supplier is not null)
            entity.Supplier = supplier;

        await _db.SaveChangesAsync(ct);

        return ((await GetByIdAsync(warehouseItemId, ct))!, lot.Id);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.WarehouseItems
            .Include(w => w.ProjectItems)
            .Include(w => w.WarehouseStockLots)
            .FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw new NotFoundException($"Warehouse item {id} was not found.");

        if (entity.ProjectItems.Count > 0)
            throw new ConflictException("Неможливо видалити позицію складу, яка використовується в проектах.");

        if (entity.WarehouseStockLots.Any(l => l.QuantityOnHand > 0))
            throw new ConflictException("Неможливо видалити позицію складу з наявними партіями. Спочатку спишіть залишок.");

        if (entity.WarehouseStockLots.Count > 0)
            _db.WarehouseStockLots.RemoveRange(entity.WarehouseStockLots);

        _db.WarehouseItems.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    internal async Task<Dictionary<int, decimal>> GetLotReservedOpenAsync(
        IReadOnlyCollection<int> lotIds,
        int? excludeProjectItemId,
        CancellationToken ct)
    {
        if (lotIds.Count == 0)
            return new Dictionary<int, decimal>();

        var query = _db.ProjectItemLotAllocations
            .AsNoTracking()
            .Where(a =>
                lotIds.Contains(a.WarehouseStockLotId) &&
                (a.ProjectItem.Project.Status == ProjectStatuses.Awaiting ||
                 a.ProjectItem.Project.Status == ProjectStatuses.InProgress));

        if (excludeProjectItemId is not null)
            query = query.Where(a => a.ProjectItemId != excludeProjectItemId.Value);

        return await query
            .GroupBy(a => a.WarehouseStockLotId)
            .Select(g => new { LotId = g.Key, Reserved = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.LotId, x => x.Reserved, ct);
    }

    private static void ValidateCatalog(string name, string category, string unit)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("Назва обов’язкова.");
        if (string.IsNullOrWhiteSpace(category))
            throw new ValidationException("Категорія обов’язкова.");
        if (string.IsNullOrWhiteSpace(unit))
            throw new ValidationException("Одиниця виміру обов’язкова.");
    }

    private static decimal Available(decimal onHand, decimal reserved) =>
        Math.Max(0, onHand - reserved);

    private static bool IsLowStock(WarehouseItem item, decimal quantityAvailable) =>
        item.LowStockThreshold is not null && quantityAvailable <= item.LowStockThreshold;

    private static WarehouseItemListDto MapList(
        WarehouseItem item,
        decimal quantityAvailable,
        int usedCount,
        decimal quantityToOrder) =>
        new(
            item.Id,
            item.Name,
            item.Category,
            item.Unit,
            item.QuantityInStock,
            quantityAvailable,
            item.Supplier,
            item.Notes,
            item.LowStockThreshold,
            IsLowStock(item, quantityAvailable),
            usedCount,
            quantityToOrder);

    private static WarehouseStockLotDto MapLot(WarehouseStockLot lot, decimal reserved) =>
        new(
            lot.Id,
            lot.UnitCost,
            lot.QuantityOnHand,
            reserved,
            Math.Max(0, lot.QuantityOnHand - reserved),
            lot.ReceivedAt,
            lot.Supplier,
            lot.Notes);

    private static WarehouseItemDetailDto MapDetail(
        WarehouseItem item,
        decimal quantityAvailable,
        decimal reserved,
        IReadOnlyDictionary<int, decimal> reservedByLot) =>
        new(
            item.Id,
            item.Name,
            item.Category,
            item.Unit,
            item.QuantityInStock,
            quantityAvailable,
            item.Supplier,
            item.Notes,
            item.LowStockThreshold,
            IsLowStock(item, quantityAvailable),
            item.WarehouseStockLots
                .OrderByDescending(l => l.ReceivedAt)
                .ThenByDescending(l => l.Id)
                .Select(l => MapLot(l, reservedByLot.GetValueOrDefault(l.Id)))
                .ToList(),
            item.ProjectItems
                .Where(pi => ProjectStatuses.IsOpen(pi.Project.Status))
                .OrderBy(pi => pi.Project.Name)
                .Select(pi =>
                {
                    var maxFromStock = Available(
                        item.QuantityInStock,
                        reserved - pi.QuantityFromStock);
                    return new WarehouseItemProjectUsageDto(
                        pi.ProjectId,
                        pi.Project.Name,
                        pi.Project.Status,
                        pi.QuantityNeeded,
                        pi.QuantityFromStock,
                        NeedsPurchase: pi.QuantityNeeded > maxFromStock);
                })
                .ToList());
}
