using ChibiDink.Application.Abstractions;

namespace ChibiDink.Application.Sessions;

/// <summary>Players stepping in and out of the shared waiting pool.</summary>
public interface IQueueService
{
    /// <summary>Queue or pause a player. Players change themselves; organizers can change anyone.</summary>
    Task SetQueuedAsync(Guid sessionId, Guid userId, bool queued, CancellationToken ct);
    Task LeaveAsync(Guid sessionId, CancellationToken ct);
}

public sealed class QueueService(ISessionCommandRunner runner, ICurrentUser currentUser, IClock clock) : IQueueService
{
    public Task SetQueuedAsync(Guid sessionId, Guid userId, bool queued, CancellationToken ct) =>
        runner.RunAsync(sessionId, (session, _) =>
        {
            session.EnsureNotClosed();
            if (userId != currentUser.UserId) session.EnsureOrganizer(currentUser.UserId);

            var participant = session.GetParticipant(userId);
            if (queued) participant.EnterQueue(clock.UtcNow);
            else participant.Pause();
            return Task.CompletedTask;
        }, ct);

    public Task LeaveAsync(Guid sessionId, CancellationToken ct) =>
        runner.RunAsync(sessionId, (session, _) =>
        {
            session.GetParticipant(currentUser.UserId).Leave();
            return Task.CompletedTask;
        }, ct);
}
