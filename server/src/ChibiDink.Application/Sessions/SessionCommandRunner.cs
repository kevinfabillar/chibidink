using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Sessions;

/// <summary>Runs a change against one session safely: lock, load, change, save, then tell clients.</summary>
public interface ISessionCommandRunner
{
    Task<T> RunAsync<T>(Guid sessionId, Func<PlaySession, CancellationToken, Task<T>> work, CancellationToken ct);
    Task RunAsync(Guid sessionId, Func<PlaySession, CancellationToken, Task> work, CancellationToken ct);
}

public sealed class SessionCommandRunner(
    IUnitOfWork unitOfWork,
    ISessionRepository sessions,
    ISessionNotifier notifier,
    IMatchmakingScheduler matchmaking) : ISessionCommandRunner
{
    public async Task<T> RunAsync<T>(Guid sessionId, Func<PlaySession, CancellationToken, Task<T>> work, CancellationToken ct)
    {
        T result = default!;
        await unitOfWork.ExecuteSerializedAsync(sessionId, async innerCt =>
        {
            var session = await sessions.FindAsync(sessionId, innerCt) ?? throw new NotFoundException("Session");
            result = await work(session, innerCt);
        }, ct);

        await notifier.SessionChangedAsync(sessionId, ct);
        matchmaking.Request(sessionId); // a court or player may have freed up
        return result;
    }

    public Task RunAsync(Guid sessionId, Func<PlaySession, CancellationToken, Task> work, CancellationToken ct) =>
        RunAsync<bool>(sessionId, async (session, innerCt) =>
        {
            await work(session, innerCt);
            return true;
        }, ct);
}
