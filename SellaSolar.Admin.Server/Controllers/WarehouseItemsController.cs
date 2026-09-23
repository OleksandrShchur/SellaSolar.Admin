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

    public WarehouseItemsController(WarehouseService warehouse)
    {
        _warehouse = warehouse;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WarehouseItemListDto>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool? lowStockOnly,
        CancellationToken ct)
    {
        return Ok(await _warehouse.GetAllAsync(category, search, lowStockOnly, ct));
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetCategories(CancellationToken ct) =>
        Ok(await _warehouse.GetCategoriesAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WarehouseItemDetailDto>> GetById(int id, CancellationToken ct)
    {
        var item = await _warehouse.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
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
