using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Sessions;

/// <summary>Organizer control for the "Next in queue" groups: line them up by hand.</summary>
public interface IUpNextService
{
    Task SetPlannedGroupsAsync(Guid sessionId, SetPlannedGroupsRequest request, CancellationToken ct);
}

public sealed class UpNextService(
    ISessionCommandRunner runner,
    IAuditLog audit,
    ICurrentUser currentUser,
    IClock clock) : IUpNextService
{
    public Task SetPlannedGroupsAsync(Guid sessionId, SetPlannedGroupsRequest request, CancellationToken ct) =>
        runner.RunAsync(sessionId, (session, _) =>
        {
            session.EnsureOrganizer(currentUser.UserId);
            var groups = (request.Groups ?? []).Select(g => new PlannedGroup(g.TeamA ?? [], g.TeamB ?? [])).ToList();
            session.SetPlannedGroups(groups);
            audit.Record(new MatchEditAudit(session.Id, null, currentUser.UserId, "Edit queue",
                groups.Count == 0 ? "Reset the queue to automatic groups" : $"Lined up {groups.Count} group(s) in the queue",
                clock.UtcNow));
            return Task.CompletedTask;
        }, ct);
}
