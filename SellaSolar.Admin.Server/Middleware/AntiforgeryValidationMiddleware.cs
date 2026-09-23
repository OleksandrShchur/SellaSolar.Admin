using Microsoft.AspNetCore.Antiforgery;

namespace SellaSolar.Admin.Server.Middleware;

public class AntiforgeryValidationMiddleware
{
    private static readonly HashSet<string> SafeMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Get,
        HttpMethods.Head,
        HttpMethods.Options,
        HttpMethods.Trace,
    };

    private readonly RequestDelegate _next;

    public AntiforgeryValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAntiforgery antiforgery)
    {
        if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase) &&
            !SafeMethods.Contains(context.Request.Method) &&
            !IsAntiforgeryExempt(context))
        {
            try
            {
                await antiforgery.ValidateRequestAsync(context);
            }
            catch (AntiforgeryValidationException)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { message = "Недійсний CSRF-токен. Оновіть сторінку." });
                return;
            }
        }

        await _next(context);
    }

    private static bool IsAntiforgeryExempt(HttpContext context)
    {
        if (context.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }
}
