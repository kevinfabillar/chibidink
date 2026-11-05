using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Sessions;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Scoring;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Matches;

/// <summary>Everything players and organizers do to a single match.</summary>
public interface IMatchService
{
    Task AcceptAsync(Guid sessionId, Guid matchId, CancellationToken ct);
    Task DeclineAsync(Guid sessionId, Guid matchId, CancellationToken ct);
    Task StartAsync(Guid sessionId, Guid matchId, CancellationToken ct);
    Task ReportResultAsync(Guid sessionId, Guid matchId, ReportResultRequest request, CancellationToken ct);
    Task VerifyResultAsync(Guid sessionId, Guid matchId, CancellationToken ct);

    // Organizer overrides
    Task<Guid> CreateManualAsync(Guid sessionId, CreateManualMatchRequest request, CancellationToken ct);
    Task ReplacePlayerAsync(Guid sessionId, Guid matchId, ReplacePlayerRequest request, CancellationToken ct);
    Task SwitchTeamsAsync(Guid sessionId, Guid matchId, SwitchTeamsRequest request, CancellationToken ct);
    Task MoveAsync(Guid sessionId, Guid matchId, MoveMatchRequest request, CancellationToken ct);
    Task CancelAsync(Guid sessionId, Guid matchId, string? reason, CancellationToken ct);
    Task VoidAsync(Guid sessionId, Guid matchId, string? reason, CancellationToken ct);
}

public sealed class MatchService(
    ISessionCommandRunner runner,
    IMatchRepository matches,
    IAuditLog audit,
    IEnumerable<IMatchCompletedHandler> completionHandlers,
    ICurrentUser currentUser,
    IClock clock) : IMatchService
{
    public Task AcceptAsync(Guid sessionId, Guid matchId, CancellationToken ct) =>
        WithMatch(sessionId, matchId, (_, match, _) =>
        {
            match.Accept(currentUser.UserId);
            return Task.CompletedTask;
        }, ct);

    public Task DeclineAsync(Guid sessionId, Guid matchId, CancellationToken ct) =>
        WithMatch(sessionId, matchId, (session, match, _) =>
        {
            match.Decline(session, currentUser.UserId, clock.UtcNow);
            return Task.CompletedTask;
        }, ct);

    public Task StartAsync(Guid sessionId, Guid matchId, CancellationToken ct) =>
        WithMatch(sessionId, matchId, (session, match, _) =>
        {
            var byOrganizer = session.IsOrganizer(currentUser.UserId);
            if (!byOrganizer && !match.Involves(currentUser.UserId))
                throw new ForbiddenException("Only players in this match or the organizer can start it.");

            var skippedConfirmation = byOrganizer && match.Status == MatchStatus.AwaitingConfirmation;
            match.Start(clock.UtcNow, byOrganizer);
            if (skippedConfirmation) Audit(session, match, "Start", "Started before all players confirmed");
            return Task.CompletedTask;
        }, ct);

    /// <summary>
    /// Continuous play: only the session's organizer enters scores, and their entry is final. The game
    /// ends at once and the four go back into the line. The reply doesn't wait for the next four: the
    /// command runner hands the session to the matchmaking worker, which fills the free court right away.
    /// </summary>
    public Task ReportResultAsync(Guid sessionId, Guid matchId, ReportResultRequest request, CancellationToken ct) =>
        WithMatch(sessionId, matchId, async (session, match, innerCt) =>
        {
            var userId = currentUser.UserId;
            if (!session.IsOrganizer(userId))
                throw new ForbiddenException("Only the session organizer can enter scores.");

            var now = clock.UtcNow;
            match.ReportResult(PlayToTargetScoringRule.For(session.Settings),
                request.TeamAScore, request.TeamBScore, userId, request.Notes, now);
            await VerifyAsync(session, match, userId, now, innerCt);
        }, ct);

    public Task VerifyResultAsync(Guid sessionId, Guid matchId, CancellationToken ct) =>
        WithMatch(sessionId, matchId, (session, match, innerCt) =>
            VerifyAsync(session, match, currentUser.UserId, clock.UtcNow, innerCt), ct);

    public Task<Guid> CreateManualAsync(Guid sessionId, CreateManualMatchRequest request, CancellationToken ct) =>
        runner.RunAsync(sessionId, (session, _) =>
        {
            session.EnsureOrganizer(currentUser.UserId);
            session.EnsureStarted();
            var court = session.GetCourt(request.CourtNumber);
            var match = Match.Propose(session, court, request.TeamA, request.TeamB, clock.UtcNow, isManual: true);
            matches.Add(match);
            Audit(session, match, "Manual match", $"Created a match on court {court.Number}");
            return Task.FromResult(match.Id);
        }, ct);

    public Task SwitchTeamsAsync(Guid sessionId, Guid matchId, SwitchTeamsRequest request, CancellationToken ct) =>
        AsOrganizer(sessionId, matchId, (session, match) =>
        {
            match.SwitchTeams(request.FirstUserId, request.SecondUserId);
            Audit(session, match, "Switch teams", "Switched two players between the teams on this court");
        }, ct);

    public Task ReplacePlayerAsync(Guid sessionId, Guid matchId, ReplacePlayerRequest request, CancellationToken ct) =>
        AsOrganizer(sessionId, matchId, (session, match) =>
        {
            match.ReplacePlayer(session, request.OutgoingUserId, request.IncomingUserId, clock.UtcNow);
            Audit(session, match, "Replace player", "Swapped a player; the replaced player kept their queue spot");
        }, ct);

    public Task MoveAsync(Guid sessionId, Guid matchId, MoveMatchRequest request, CancellationToken ct) =>
        AsOrganizer(sessionId, matchId, (session, match) =>
        {
            var from = match.CourtNumber;
            match.MoveToCourt(session, session.GetCourt(request.CourtNumber));
            Audit(session, match, "Move", $"Moved from court {from} to court {request.CourtNumber}");
        }, ct);

    public Task CancelAsync(Guid sessionId, Guid matchId, string? reason, CancellationToken ct) =>
        AsOrganizer(sessionId, matchId, (session, match) =>
        {
            match.Cancel(session, Reason(reason, "Cancelled by organizer"), clock.UtcNow);
            Audit(session, match, "Cancel", match.CancelReason!);
        }, ct);

    public Task VoidAsync(Guid sessionId, Guid matchId, string? reason, CancellationToken ct) =>
        AsOrganizer(sessionId, matchId, (session, match) =>
        {
            match.Void(session, Reason(reason, "Voided by organizer"), clock.UtcNow);
            Audit(session, match, "Void", match.CancelReason!);
        }, ct);

    // ---- helpers ------------------------------------------------------------------------------

    private async Task VerifyAsync(PlaySession session, Match match, Guid verifierId, DateTimeOffset now, CancellationToken ct)
    {
        var outcome = match.Verify(session, verifierId, now);
        foreach (var handler in completionHandlers) await handler.HandleAsync(outcome, ct);
        if (session.IsOrganizer(verifierId) && !match.Involves(verifierId))
            Audit(session, match, "Verify", $"Verified {match.Result!.TeamAScore}–{match.Result.TeamBScore}");
    }

    private Task WithMatch(Guid sessionId, Guid matchId, Func<PlaySession, Match, CancellationToken, Task> work, CancellationToken ct) =>
        runner.RunAsync(sessionId, async (session, innerCt) =>
        {
            var match = await matches.FindAsync(matchId, innerCt);
            if (match is null || match.SessionId != session.Id) throw new NotFoundException("Match");
            await work(session, match, innerCt);
        }, ct);

    private Task AsOrganizer(Guid sessionId, Guid matchId, Action<PlaySession, Match> change, CancellationToken ct) =>
        WithMatch(sessionId, matchId, (session, match, _) =>
        {
            session.EnsureOrganizer(currentUser.UserId);
            change(session, match);
            return Task.CompletedTask;
        }, ct);

    private void Audit(PlaySession session, Match match, string action, string details) =>
        audit.Record(new MatchEditAudit(session.Id, match.Id, currentUser.UserId, action, details, clock.UtcNow));

    private static string Reason(string? given, string fallback) =>
        string.IsNullOrWhiteSpace(given) ? fallback : given.Trim()[..Math.Min(given.Trim().Length, 200)];
}
