using ChibiDink.Application.Contracts;
using ChibiDink.Application.Social;
using ChibiDink.Domain.Social;
using Microsoft.AspNetCore.Mvc;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api/street-cred")]
public sealed class StreetCredController(IKudosService kudos) : ControllerBase
{
    /// <summary>The top players for one kind of kudos, by Street Cred.</summary>
    [HttpGet("{kind}")]
    public Task<IReadOnlyList<StreetCredEntryDto>> Leaderboard(KudosKind kind, CancellationToken ct) => kudos.LeaderboardAsync(kind, ct);
}
