using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Application.Services;
using SellaSolar.Admin.Domain.Authorization;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly UserManagementService _users;

    public UsersController(UserManagementService users)
    {
        _users = users;
    }

    [HttpGet]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<ActionResult<IReadOnlyList<UserListItemDto>>> GetAll(
        [FromQuery] string? role,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isBlocked,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _users.GetAllAsync(role, isActive, isBlocked, search, ct));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Active workers for project assignment.</summary>
    [HttpGet("workers")]
    [Authorize(Policy = AppPolicies.CanManageProjects)]
    public async Task<ActionResult<IReadOnlyList<UserListItemDto>>> GetWorkersForAssignment(CancellationToken ct)
    {
        return Ok(await _users.GetWorkersForAssignmentAsync(ct));
    }

    [HttpPost]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<ActionResult<UserListItemDto>> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _users.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
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

    [HttpPut("{id}")]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<ActionResult<UserListItemDto>> Update(
        string id,
        [FromBody] UpdateUserRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _users.UpdateAsync(id, request, ct));
        }
        catch (NotFoundException)
        {
            return NotFound();
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

    [HttpPost("{id}/reset-password")]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<IActionResult> ResetPassword(
        string id,
        [FromBody] ResetUserPasswordRequest request,
        CancellationToken ct)
    {
        try
        {
            await _users.ResetPasswordAsync(id, request, ct);
            return NoContent();
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

    [HttpPost("{id}/activate")]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<IActionResult> Activate(string id, CancellationToken ct)
    {
        try
        {
            await _users.ActivateAsync(id, ct);
            return NoContent();
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

    [HttpPost("{id}/deactivate")]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<IActionResult> Deactivate(string id, CancellationToken ct)
    {
        try
        {
            var actorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? throw new ValidationException("Користувача не знайдено.");
            await _users.DeactivateAsync(actorId, id, ct);
            return NoContent();
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

    [HttpPost("{id}/block")]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<IActionResult> Block(string id, CancellationToken ct)
    {
        try
        {
            var actorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? throw new ValidationException("Користувача не знайдено.");
            await _users.BlockAsync(actorId, id, ct);
            return NoContent();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/unblock")]
    [Authorize(Policy = AppPolicies.CanManageUsers)]
    public async Task<IActionResult> Unblock(string id, CancellationToken ct)
    {
        try
        {
            var actorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? throw new ValidationException("Користувача не знайдено.");
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            await _users.UnblockAsync(actorId, id, ip, ct);
            return NoContent();
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
}
