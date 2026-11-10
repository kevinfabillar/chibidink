using ChibiDink.Application.Social;
using Microsoft.AspNetCore.Mvc;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Matches;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api/sessions/{sessionId:guid}/matches")]
public sealed class MatchesController(IMatchService matches, IKudosService kudos) : ControllerBase
{
    /// <summary>Your matches in this session still open for kudos, and the kudos you received here.</summary>
    [HttpGet("kudos")]
    public Task<SessionKudosDto> Kudos(Guid sessionId, CancellationToken ct) => kudos.GetForSessionAsync(sessionId, ct);

    /// <summary>Give a kudos to a player from this finished match, or take it back.</summary>
    [HttpPost("{matchId:guid}/kudos")]
    public async Task<IActionResult> ToggleKudos(Guid matchId, GiveKudosRequest request, CancellationToken ct)
    {
        await kudos.ToggleAsync(matchId, request.ToUserId, request.Kind, ct);
        return NoContent();
    }

    [HttpPost]
    public async Task<IActionResult> CreateManual(Guid sessionId, CreateManualMatchRequest request, CancellationToken ct) =>
        Ok(new { id = await matches.CreateManualAsync(sessionId, request, ct) });

    [HttpPost("{matchId:guid}/accept")]
    public Task<IActionResult> Accept(Guid sessionId, Guid matchId, CancellationToken ct) =>
        Done(matches.AcceptAsync(sessionId, matchId, ct));

    [HttpPost("{matchId:guid}/decline")]
    public Task<IActionResult> Decline(Guid sessionId, Guid matchId, CancellationToken ct) =>
        Done(matches.DeclineAsync(sessionId, matchId, ct));

    [HttpPost("{matchId:guid}/start")]
    public Task<IActionResult> Start(Guid sessionId, Guid matchId, CancellationToken ct) =>
        Done(matches.StartAsync(sessionId, matchId, ct));

    [HttpPost("{matchId:guid}/result")]
    public Task<IActionResult> ReportResult(Guid sessionId, Guid matchId, ReportResultRequest request, CancellationToken ct) =>
        Done(matches.ReportResultAsync(sessionId, matchId, request, ct));

    [HttpPost("{matchId:guid}/verify")]
    public Task<IActionResult> Verify(Guid sessionId, Guid matchId, CancellationToken ct) =>
        Done(matches.VerifyResultAsync(sessionId, matchId, ct));

    [HttpPost("{matchId:guid}/replace")]
    public Task<IActionResult> Replace(Guid sessionId, Guid matchId, ReplacePlayerRequest request, CancellationToken ct) =>
        Done(matches.ReplacePlayerAsync(sessionId, matchId, request, ct));

    [HttpPost("{matchId:guid}/switch-teams")]
    public Task<IActionResult> SwitchTeams(Guid sessionId, Guid matchId, SwitchTeamsRequest request, CancellationToken ct) =>
        Done(matches.SwitchTeamsAsync(sessionId, matchId, request, ct));

    [HttpPut("{matchId:guid}/lineup")]
    public Task<IActionResult> SetLineup(Guid sessionId, Guid matchId, SetLineupRequest request, CancellationToken ct) =>
        Done(matches.SetLineupAsync(sessionId, matchId, request, ct));

    [HttpPost("{matchId:guid}/move")]
    public Task<IActionResult> Move(Guid sessionId, Guid matchId, MoveMatchRequest request, CancellationToken ct) =>
        Done(matches.MoveAsync(sessionId, matchId, request, ct));

    [HttpPost("{matchId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid sessionId, Guid matchId, ReasonRequest request, CancellationToken ct) =>
        Done(matches.CancelAsync(sessionId, matchId, request.Reason, ct));

    [HttpPost("{matchId:guid}/void")]
    public Task<IActionResult> Void(Guid sessionId, Guid matchId, ReasonRequest request, CancellationToken ct) =>
        Done(matches.VoidAsync(sessionId, matchId, request.Reason, ct));

    private async Task<IActionResult> Done(Task work)
    {
        await work;
        return NoContent();
    }
}
