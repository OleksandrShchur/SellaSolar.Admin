using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SellaSolar.Admin.Application.Auth;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Application.Services;

namespace SellaSolar.Admin.Server.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly IAntiforgery _antiforgery;

    public AuthController(AuthService auth, IAntiforgery antiforgery)
    {
        _auth = auth;
        _antiforgery = antiforgery;
    }

    [AllowAnonymous]
    [HttpGet("antiforgery")]
    public IActionResult GetAntiforgeryToken()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            return Ok(await _auth.LoginAsync(request, ip, ct));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _auth.LogoutAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken ct)
    {
        var user = await _auth.GetCurrentUserAsync(User);
        return user is null ? Unauthorized() : Ok(user);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        try
        {
            await _auth.ChangePasswordAsync(User, request, ct);
            return NoContent();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
