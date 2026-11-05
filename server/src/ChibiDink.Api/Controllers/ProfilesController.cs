using Microsoft.AspNetCore.Mvc;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Players;
using ChibiDink.Domain.Players;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class ProfilesController(IProfileService profiles) : ControllerBase
{
    [HttpGet("me")]
    public Task<ProfileDto> GetMine(CancellationToken ct) => profiles.GetMineAsync(ct);

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMine(UpdateProfileRequest request, CancellationToken ct)
    {
        await profiles.UpdateMineAsync(request, ct);
        return NoContent();
    }

    [HttpPut("me/appearance")]
    public async Task<IActionResult> UpdateAppearance(Appearance appearance, CancellationToken ct)
    {
        await profiles.UpdateMyAppearanceAsync(appearance, ct);
        return NoContent();
    }

    [HttpGet("players/{userId:guid}")]
    public Task<ProfileDto> Get(Guid userId, CancellationToken ct) => profiles.GetAsync(userId, ct);
}
