using Microsoft.EntityFrameworkCore;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

public class WorkerService
{
    private readonly SellaSolarAdminContext _db;

    public WorkerService(SellaSolarAdminContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<WorkerDto>> GetAllAsync(
        string? type = null,
        bool? isActive = null,
        string? search = null,
        CancellationToken ct = default)
    {
        var query = _db.Workers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
        {
            if (!WorkerTypes.IsValid(type))
                throw new ValidationException("Type must be Assembler or Installer.");
            query = query.Where(w => w.Type == type);
        }

        if (isActive is not null)
            query = query.Where(w => w.IsActive == isActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(w => w.FullName.Contains(term) || w.Phone.Contains(term));
        }

        return await query
            .OrderBy(w => w.FullName)
            .Select(w => new WorkerDto(w.Id, w.FullName, w.Type, w.Phone, w.IsActive))
            .ToListAsync(ct);
    }

    public async Task<WorkerDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var worker = await _db.Workers.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id, ct);
        return worker is null
            ? null
            : new WorkerDto(worker.Id, worker.FullName, worker.Type, worker.Phone, worker.IsActive);
    }

    public async Task<WorkerDto> CreateAsync(CreateWorkerRequest request, CancellationToken ct = default)
    {
        Validate(request.FullName, request.Type, request.Phone);

        var entity = new Worker
        {
            FullName = request.FullName.Trim(),
            Type = request.Type,
            Phone = request.Phone.Trim(),
            IsActive = request.IsActive
        };

        _db.Workers.Add(entity);
        await _db.SaveChangesAsync(ct);
        return new WorkerDto(entity.Id, entity.FullName, entity.Type, entity.Phone, entity.IsActive);
    }

    public async Task<WorkerDto> UpdateAsync(int id, UpdateWorkerRequest request, CancellationToken ct = default)
    {
        Validate(request.FullName, request.Type, request.Phone);

        var entity = await _db.Workers.FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw new NotFoundException($"Worker {id} was not found.");

        entity.FullName = request.FullName.Trim();
        entity.Type = request.Type;
        entity.Phone = request.Phone.Trim();
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync(ct);
        return new WorkerDto(entity.Id, entity.FullName, entity.Type, entity.Phone, entity.IsActive);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.Workers
            .Include(w => w.ProjectWorkers)
            .FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw new NotFoundException($"Worker {id} was not found.");

        if (entity.ProjectWorkers.Count > 0)
            throw new ConflictException("Cannot delete a worker assigned to projects. Deactivate instead.");

        _db.Workers.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private static void Validate(string fullName, string type, string phone)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ValidationException("FullName is required.");
        if (string.IsNullOrWhiteSpace(phone))
            throw new ValidationException("Phone is required.");
        if (!WorkerTypes.IsValid(type))
            throw new ValidationException("Type must be Assembler or Installer.");
    }
}
