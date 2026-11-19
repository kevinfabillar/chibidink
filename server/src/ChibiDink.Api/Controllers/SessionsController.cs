using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ChibiDink.Infrastructure.Identity;
using ChibiDink.Api.Infrastructure;
using ChibiDink.Application.Players;
using ChibiDink.Domain.Players;
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
    IMatchmakingService matchmaking,
    GuestAccounts guests,
    IProfileService profiles) : ControllerBase
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

    /// <summary>
    /// Organizer: add someone without a phone. Makes a guest with just that name and checks them in to the
    /// queue. Each tap adds a new person (two players can share a name).
    /// </summary>
    [HttpPost("{sessionId:guid}/players")]
    public async Task<IActionResult> AddPlayer(Guid sessionId, AddPlayerRequest request, CancellationToken ct)
    {
        var name = request.DisplayName?.Trim() ?? "";
        if (name.Length is 0 or > PlayerProfile.MaxDisplayNameLength)
        {
            ModelState.AddModelError(nameof(request.DisplayName), $"Name must be 1–{PlayerProfile.MaxDisplayNameLength} characters.");
            return ValidationProblem(ModelState);
        }
        await sessions.EnsureCanAddPlayersAsync(sessionId, ct); // before making an account nobody would use
        var (user, errors) = await guests.CreateAsync();
        if (user is null)
        {
            foreach (var error in errors) ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }
        await profiles.EnsureProfileAsync(user.Id, name, ct);
        await sessions.AddPlayerAsync(sessionId, user.Id, request.Skill, ct);
        return Ok(new { userId = user.Id });
    }

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

    /// <summary>Check in with the code. The body is optional: Skill Based sessions send the level the player picked.</summary>
    [HttpPost("{code}/join")]
    public async Task<IActionResult> Join(string code, [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] JoinSessionRequest? request, CancellationToken ct) =>
        Ok(new { sessionId = await sessions.JoinByCodeAsync(code, request?.Skill, ct) });
}
