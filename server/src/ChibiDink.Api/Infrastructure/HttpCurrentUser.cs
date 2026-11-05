using System.Security.Claims;
using ChibiDink.Application.Abstractions;

namespace ChibiDink.Api.Infrastructure;

internal sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid UserId
    {
        get
        {
            var raw = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id)
                ? id
                : throw new UnauthorizedAccessException("Sign in to continue.");
        }
    }
}
