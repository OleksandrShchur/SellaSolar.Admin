using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
[EnableRateLimiting("health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    [HttpHead]
    public IActionResult Check() => Ok();
}
