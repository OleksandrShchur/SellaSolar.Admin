using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Application.Services;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/warehouse-items")]
[Authorize(Policy = AppPolicies.CanManageWarehouse)]
public class WarehouseItemsController : ControllerBase
{
    private readonly WarehouseService _warehouse;
    private readonly ProjectMaterialsService _materials;

    public WarehouseItemsController(WarehouseService warehouse, ProjectMaterialsService materials)
    {
        _warehouse = warehouse;
        _materials = materials;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WarehouseItemListDto>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] bool? needsPurchaseOnly,
        CancellationToken ct)
    {
        return Ok(await _warehouse.GetAllAsync(category, search, lowStockOnly, needsPurchaseOnly, ct));
    }

    [HttpGet("purchase-requests")]
    public async Task<ActionResult<IReadOnlyList<NonCatalogPurchaseRequestDto>>> GetPurchaseRequests(
        CancellationToken ct) =>
        Ok(await _warehouse.GetNonCatalogPurchaseRequestsAsync(ct));

    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetCategories(CancellationToken ct) =>
        Ok(await _warehouse.GetCategoriesAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WarehouseItemDetailDto>> GetById(int id, CancellationToken ct)
    {
        var item = await _warehouse.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("{id:int}/lots")]
    public async Task<ActionResult<IReadOnlyList<WarehouseStockLotDto>>> GetLots(int id, CancellationToken ct)
    {
        try
        {
            return Ok(await _warehouse.GetLotsAsync(id, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:int}/receive")]
    public async Task<ActionResult<WarehouseItemDetailDto>> Receive(
        int id,
        [FromBody] ReceiveWarehouseStockRequest request,
        CancellationToken ct)
    {
        try
        {
            var (detail, newLotId) = await _warehouse.ReceiveAsync(id, request, ct);

            if (request.AllocateToProjectItemId is > 0 && request.AllocateQuantity is > 0)
            {
                await _materials.AllocateFromNewLotAsync(
                    request.AllocateToProjectItemId.Value,
                    newLotId,
                    request.AllocateQuantity.Value,
                    expectedWarehouseItemId: id,
                    ct);
                detail = (await _warehouse.GetByIdAsync(id, ct))!;
            }

            return Ok(detail);
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

    [HttpPost]
    public async Task<ActionResult<WarehouseItemDetailDto>> Create(
        [FromBody] CreateWarehouseItemRequest request,
        CancellationToken ct)
    {
        try
        {
            var created = await _warehouse.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WarehouseItemDetailDto>> Update(
        int id,
        [FromBody] UpdateWarehouseItemRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _warehouse.UpdateAsync(id, request, ct));
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
            await _warehouse.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
        catch (ConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
