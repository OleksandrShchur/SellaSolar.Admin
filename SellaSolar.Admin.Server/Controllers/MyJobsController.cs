using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Application.Services;
using SellaSolar.Admin.Domain.Authorization;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/my-jobs")]
[Authorize(Policy = AppPolicies.CanViewAssignedJobs)]
public class MyJobsController : ControllerBase
{
    private readonly ProjectService _projects;

    public MyJobsController(ProjectService projects)
    {
        _projects = projects;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectListItemDto>>> GetMine(CancellationToken ct)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await _projects.GetAssignedToUserAsync(userId, ct));
    }
}
