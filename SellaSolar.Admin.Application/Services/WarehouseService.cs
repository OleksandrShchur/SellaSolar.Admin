using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;

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

        var items = await query
            .OrderBy(w => w.Name)
            .Select(w => new
            {
                Item = w,
                UsedCount = w.ProjectItems.Count
            })
            .ToListAsync(ct);

        var mapped = items.Select(x => MapList(x.Item, x.UsedCount)).ToList();

        if (lowStockOnly == true)
            mapped = mapped.Where(m => m.IsLowStock).ToList();

        return mapped;
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
            .FirstOrDefaultAsync(w => w.Id == id, ct);

        return item is null ? null : MapDetail(item);
    }

    public async Task<WarehouseItemDetailDto> CreateAsync(CreateWarehouseItemRequest request, CancellationToken ct = default)
    {
        Validate(request.Name, request.Category, request.Unit, request.QuantityInStock);

        var entity = new WarehouseItem
        {
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Unit = request.Unit.Trim(),
            QuantityInStock = request.QuantityInStock,
            Price = request.Price,
            Supplier = string.IsNullOrWhiteSpace(request.Supplier) ? null : request.Supplier.Trim(),
            Notes = request.Notes,
            LowStockThreshold = request.LowStockThreshold
        };

        _db.WarehouseItems.Add(entity);
        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(entity.Id, ct))!;
    }

    public async Task<WarehouseItemDetailDto> UpdateAsync(int id, UpdateWarehouseItemRequest request, CancellationToken ct = default)
    {
        Validate(request.Name, request.Category, request.Unit, request.QuantityInStock);

        var entity = await _db.WarehouseItems.FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw new NotFoundException($"Warehouse item {id} was not found.");

        entity.Name = request.Name.Trim();
        entity.Category = request.Category.Trim();
        entity.Unit = request.Unit.Trim();
        entity.QuantityInStock = request.QuantityInStock;
        entity.Price = request.Price;
        entity.Supplier = string.IsNullOrWhiteSpace(request.Supplier) ? null : request.Supplier.Trim();
        entity.Notes = request.Notes;
        entity.LowStockThreshold = request.LowStockThreshold;

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(id, ct))!;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.WarehouseItems
            .Include(w => w.ProjectItems)
            .FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw new NotFoundException($"Warehouse item {id} was not found.");

        if (entity.ProjectItems.Count > 0)
            throw new ConflictException("Cannot delete a warehouse item that is used in projects.");

        _db.WarehouseItems.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private static void Validate(string name, string category, string unit, decimal quantityInStock)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("Name is required.");
        if (string.IsNullOrWhiteSpace(category))
            throw new ValidationException("Category is required.");
        if (string.IsNullOrWhiteSpace(unit))
            throw new ValidationException("Unit is required.");
        if (quantityInStock < 0)
            throw new ValidationException("QuantityInStock cannot be negative.");
    }

    private static bool IsLowStock(WarehouseItem item) =>
        item.LowStockThreshold is not null && item.QuantityInStock <= item.LowStockThreshold;

    private static WarehouseItemListDto MapList(WarehouseItem item, int usedCount) =>
        new(
            item.Id,
            item.Name,
            item.Category,
            item.Unit,
            item.QuantityInStock,
            item.Price,
            item.Supplier,
            item.Notes,
            item.LowStockThreshold,
            IsLowStock(item),
            usedCount);

    private static WarehouseItemDetailDto MapDetail(WarehouseItem item) =>
        new(
            item.Id,
            item.Name,
            item.Category,
            item.Unit,
            item.QuantityInStock,
            item.Price,
            item.Supplier,
            item.Notes,
            item.LowStockThreshold,
            IsLowStock(item),
            item.ProjectItems
                .OrderBy(pi => pi.Project.Name)
                .Select(pi => new WarehouseItemProjectUsageDto(
                    pi.ProjectId,
                    pi.Project.Name,
                    pi.Project.Status,
                    pi.QuantityNeeded,
                    pi.NeedsPurchase))
                .ToList());
}
