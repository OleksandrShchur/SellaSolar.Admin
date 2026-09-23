using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Domain.Authorization;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Application.Services;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/workers")]
[Authorize(Policy = AppPolicies.CanManageFieldWorkers)]
public class WorkersController : ControllerBase
{
    private readonly WorkerService _workers;

    public WorkersController(WorkerService workers)
    {
        _workers = workers;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkerDto>>> GetAll(
        [FromQuery] string? type,
        [FromQuery] bool? isActive,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _workers.GetAllAsync(type, isActive, search, ct));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WorkerDto>> GetById(int id, CancellationToken ct)
    {
        var worker = await _workers.GetByIdAsync(id, ct);
        return worker is null ? NotFound() : Ok(worker);
    }

    [HttpPost]
    public async Task<ActionResult<WorkerDto>> Create([FromBody] CreateWorkerRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _workers.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WorkerDto>> Update(int id, [FromBody] UpdateWorkerRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _workers.UpdateAsync(id, request, ct));
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
            await _workers.DeleteAsync(id, ct);
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
