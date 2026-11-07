using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ChibiDink.Infrastructure.Identity;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Matchmaking;
using ChibiDink.Application.Sessions;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api/sessions")]
public sealed class SessionsController(
    ISessionService sessions,
    ISessionQueries queries,
    IQueueService queue,
    IUpNextService upNext,
    IMatchmakingService matchmaking) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<SessionSummaryDto>> ListMine(CancellationToken ct) => queries.ListMineAsync(ct);

    [HttpPost]
    public async Task<IActionResult> Create(CreateSessionRequest request, CancellationToken ct)
    {
        if (User.IsInRole(AppUser.Roles.Guest))
            return Problem(statusCode: StatusCodes.Status403Forbidden, title: "Guests can't host",
                detail: "Guests can join sessions with a QR code. Create an account to host your own.");
        var id = await sessions.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { sessionId = id }, new { id });
    }

    [HttpGet("{sessionId:guid}")]
    public Task<SessionDetailDto> Get(Guid sessionId, CancellationToken ct) => queries.GetDetailAsync(sessionId, ct);

    [HttpPut("{sessionId:guid}")]
    public Task<IActionResult> Update(Guid sessionId, UpdateSessionRequest request, CancellationToken ct) =>
        Done(sessions.UpdateAsync(sessionId, request, ct));

    [HttpPost("{sessionId:guid}/start")]
    public Task<IActionResult> Start(Guid sessionId, CancellationToken ct) =>
        Done(sessions.StartMatchmakingAsync(sessionId, ct));

    [HttpPost("{sessionId:guid}/pause")]
    public Task<IActionResult> Pause(Guid sessionId, CancellationToken ct) =>
        Done(sessions.PauseMatchmakingAsync(sessionId, ct));

    [HttpPost("{sessionId:guid}/close")]
    public Task<IActionResult> Close(Guid sessionId, [FromQuery] bool voidUnfinished, CancellationToken ct) =>
        Done(sessions.CloseAsync(sessionId, voidUnfinished, ct));

    [HttpPost("{sessionId:guid}/fill")]
    public async Task<IActionResult> FillCourts(Guid sessionId, CancellationToken ct) =>
        Ok(new { created = await matchmaking.FillCourtsNowAsync(sessionId, ct) });

    /// <summary>Organizer: replace the hand-lined-up queue groups (an empty list goes back to automatic).</summary>
    [HttpPut("{sessionId:guid}/up-next")]
    public Task<IActionResult> SetPlannedGroups(Guid sessionId, SetPlannedGroupsRequest request, CancellationToken ct) =>
        Done(upNext.SetPlannedGroupsAsync(sessionId, request, ct));

    [HttpPut("{sessionId:guid}/courts/{courtNumber:int}/availability")]
    public Task<IActionResult> SetCourtAvailability(Guid sessionId, int courtNumber, CourtAvailabilityRequest request, CancellationToken ct) =>
        Done(sessions.SetCourtAvailabilityAsync(sessionId, courtNumber, request.Available, ct));

    [HttpPut("{sessionId:guid}/players/{userId:guid}/skill")]
    public Task<IActionResult> SetSkill(Guid sessionId, Guid userId, SetSkillRequest request, CancellationToken ct) =>
        Done(sessions.SetPlayerSkillAsync(sessionId, userId, request.Skill, ct));

    /// <summary>Organizer: set (or clear with null) a player's fixed doubles partner.</summary>
    [HttpPut("{sessionId:guid}/players/{userId:guid}/partner")]
    public Task<IActionResult> SetPartner(Guid sessionId, Guid userId, SetPartnerRequest request, CancellationToken ct) =>
        Done(sessions.SetPartnerAsync(sessionId, userId, request.PartnerId, ct));

    [HttpPut("{sessionId:guid}/players/{userId:guid}/queue")]
    public Task<IActionResult> SetQueued(Guid sessionId, Guid userId, SetQueuedRequest request, CancellationToken ct) =>
        Done(queue.SetQueuedAsync(sessionId, userId, request.Queued, ct));

    [HttpPost("{sessionId:guid}/leave")]
    public Task<IActionResult> Leave(Guid sessionId, CancellationToken ct) => Done(queue.LeaveAsync(sessionId, ct));

    [HttpGet("{sessionId:guid}/audit")]
    public Task<IReadOnlyList<AuditEntryDto>> Audit(Guid sessionId, CancellationToken ct) => queries.GetAuditAsync(sessionId, ct);

    private async Task<IActionResult> Done(Task work)
    {
        await work;
        return NoContent();
    }
}

[ApiController]
[Route("api/invites")]
public sealed class InvitesController(ISessionService sessions, ISessionQueries queries) : ControllerBase
{
    /// <summary>Public: guests can see what they've been invited to before signing in.</summary>
    [HttpGet("{code}")]
    [AllowAnonymous]
    public Task<InvitePreviewDto> Preview(string code, CancellationToken ct) => queries.GetInvitePreviewAsync(code, ct);

    [HttpPost("{code}/join")]
    public async Task<IActionResult> Join(string code, CancellationToken ct) =>
        Ok(new { sessionId = await sessions.JoinByCodeAsync(code, ct) });
}
