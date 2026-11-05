using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Sessions;

/// <summary>Creating, joining, configuring, and closing sessions.</summary>
public interface ISessionService
{
    Task<Guid> CreateAsync(CreateSessionRequest request, CancellationToken ct);
    Task<Guid> JoinByCodeAsync(string inviteCode, CancellationToken ct);
    Task UpdateAsync(Guid sessionId, UpdateSessionRequest request, CancellationToken ct);
    Task StartMatchmakingAsync(Guid sessionId, CancellationToken ct);
    Task PauseMatchmakingAsync(Guid sessionId, CancellationToken ct);
    Task CloseAsync(Guid sessionId, bool voidUnfinished, CancellationToken ct);
    Task SetCourtAvailabilityAsync(Guid sessionId, int courtNumber, bool available, CancellationToken ct);
    Task SetPlayerSkillAsync(Guid sessionId, Guid userId, int skill, CancellationToken ct);
}

public sealed class SessionService(
    ISessionCommandRunner runner,
    ISessionRepository sessions,
    IMatchRepository matches,
    IPlayerProfileRepository profiles,
    IAuditLog audit,
    IUnitOfWork unitOfWork,
    IInviteCodeGenerator inviteCodes,
    ICurrentUser currentUser,
    IClock clock) : ISessionService
{
    private const int InviteCodeAttempts = 10;

    public async Task<Guid> CreateAsync(CreateSessionRequest request, CancellationToken ct)
    {
        var organizerId = currentUser.UserId;
        Guid sessionId = default;
        await unitOfWork.ExecuteAsync(async innerCt =>
        {
            var organizer = await profiles.FindAsync(organizerId, innerCt) ?? throw new NotFoundException("Profile");
            var code = await UniqueInviteCodeAsync(innerCt);
            var session = PlaySession.Create(
                organizerId, request.Title, request.Location, request.ScheduledAt,
                request.Format, request.CourtCount, request.Settings ?? new SessionSettings(),
                code, new SkillLevel(organizer.SkillEstimate), clock.UtcNow);
            sessions.Add(session);
            sessionId = session.Id;
        }, ct);
        return sessionId;
    }

    public async Task<Guid> JoinByCodeAsync(string inviteCode, CancellationToken ct)
    {
        var code = inviteCode.Trim().ToUpperInvariant();
        var sessionId = await sessions.FindIdByInviteCodeAsync(code, ct) ?? throw new NotFoundException("Session");
        var userId = currentUser.UserId;

        await runner.RunAsync(sessionId, async (session, innerCt) =>
        {
            var profile = await profiles.FindAsync(userId, innerCt) ?? throw new NotFoundException("Profile");
            // Joining with the code or QR at the courts is the check-in: straight into the queue.
            var now = clock.UtcNow;
            var participant = session.Join(userId, new SkillLevel(SkillLevel.TierOf(profile.SkillEstimate)), now);
            if (participant.Status != ParticipantStatus.InMatch) participant.EnterQueue(now);
        }, ct);
        return sessionId;
    }

    public Task UpdateAsync(Guid sessionId, UpdateSessionRequest request, CancellationToken ct) =>
        AsOrganizer(sessionId, "Update session", "Updated session details and settings", session =>
        {
            session.UpdateDetails(request.Title, request.Location, request.ScheduledAt);
            session.UpdateSettings(request.Settings);
        }, ct);

    public Task StartMatchmakingAsync(Guid sessionId, CancellationToken ct) =>
        AsOrganizer(sessionId, "Start", "Started matchmaking", s => s.StartMatchmaking(), ct);

    public Task PauseMatchmakingAsync(Guid sessionId, CancellationToken ct) =>
        AsOrganizer(sessionId, "Pause", "Paused matchmaking", s => s.PauseMatchmaking(), ct);

    public Task CloseAsync(Guid sessionId, bool voidUnfinished, CancellationToken ct) =>
        runner.RunAsync(sessionId, async (session, innerCt) =>
        {
            session.EnsureOrganizer(currentUser.UserId);
            var now = clock.UtcNow;
            var live = await matches.ListLiveAsync(sessionId, innerCt);

            var unfinished = live.Where(m => !m.Status.IsPrePlay()).ToList();
            if (unfinished.Count > 0 && !voidUnfinished)
                throw new DomainException(
                    $"{unfinished.Count} match(es) are still being played or awaiting a result. Verify them first, or close and void them.");

            foreach (var match in live)
            {
                if (match.Status.IsPrePlay()) match.Cancel(session, "Session closed", now);
                else match.Void(session, "Session closed before the result was verified", now);
            }
            session.Close(now);
            audit.Record(new MatchEditAudit(sessionId, null, currentUser.UserId, "Close",
                $"Closed session; {live.Count} unfinished match(es) cancelled or voided", now));
        }, ct);

    public Task SetCourtAvailabilityAsync(Guid sessionId, int courtNumber, bool available, CancellationToken ct) =>
        AsOrganizer(sessionId, "Court availability",
            $"Court {courtNumber} marked {(available ? "available" : "unavailable")}",
            s => s.SetCourtAvailability(courtNumber, available), ct);

    public Task SetPlayerSkillAsync(Guid sessionId, Guid userId, int skill, CancellationToken ct) =>
        AsOrganizer(sessionId, "Skill", $"Set a player's skill to {SkillLevel.Name(skill)}",
            s => s.GetParticipant(userId).SetSkillEstimate(new SkillLevel(skill)), ct);

    private Task AsOrganizer(Guid sessionId, string action, string details, Action<PlaySession> change, CancellationToken ct) =>
        runner.RunAsync(sessionId, (session, _) =>
        {
            session.EnsureOrganizer(currentUser.UserId);
            change(session);
            audit.Record(new MatchEditAudit(sessionId, null, currentUser.UserId, action, details, clock.UtcNow));
            return Task.CompletedTask;
        }, ct);

    private async Task<string> UniqueInviteCodeAsync(CancellationToken ct)
    {
        for (var attempt = 0; attempt < InviteCodeAttempts; attempt++)
        {
            var code = inviteCodes.Generate();
            if (!await sessions.InviteCodeExistsAsync(code, ct)) return code;
        }
        throw new InvalidOperationException("Could not generate a unique invite code.");
    }
}
