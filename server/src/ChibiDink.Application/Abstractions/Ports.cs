namespace ChibiDink.Application.Abstractions;

// Ports: the outside-world capabilities the use cases need. Infrastructure and the API implement them,
// so the application never depends on EF Core, SignalR, or HTTP directly.

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public interface ICurrentUser
{
    /// <summary>The signed-in user's id. Throws if the request is anonymous.</summary>
    Guid UserId { get; }
}

public interface IInviteCodeGenerator
{
    /// <summary>A short, human-friendly code (six characters, no look-alike letters).</summary>
    string Generate();
}

/// <summary>Pushes "something changed" to connected clients. Sent only after a successful commit.</summary>
public interface ISessionNotifier
{
    Task SessionChangedAsync(Guid sessionId, CancellationToken ct = default);
}

/// <summary>Asks the background matchmaker to look at a session soon.</summary>
public interface IMatchmakingScheduler
{
    void Request(Guid sessionId);
}

public interface IUnitOfWork
{
    /// <summary>Runs <paramref name="work"/> in a transaction and saves.</summary>
    Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default);

    /// <summary>
    /// Runs <paramref name="work"/> in a transaction that holds an exclusive per-session lock, then saves.
    /// Every change to a session's queue, courts, or matches goes through here, so two court
    /// assignments can never interleave and double-book a player.
    /// </summary>
    Task ExecuteSerializedAsync(Guid sessionId, Func<CancellationToken, Task> work, CancellationToken ct = default);
}
