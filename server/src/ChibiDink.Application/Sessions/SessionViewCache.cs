using System.Collections.Concurrent;
using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Matches;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Sessions;

namespace ChibiDink.Application.Sessions;

/// <summary>
/// Everything about a session that's the same for every viewer: loaded once, then shared by all of
/// the session's players. Each viewer's own parts (their card, their match, their games) are worked
/// out from it in memory.
/// </summary>
public sealed record SessionSnapshot(
    PlaySession Session,
    IReadOnlyList<Match> Live,
    IReadOnlyList<Match> Completed,
    IReadOnlyDictionary<Guid, PlayerProfile> People,
    IReadOnlyList<ParticipantDto> Participants,
    IReadOnlyList<UpNextDto> UpNext);

public interface ISessionViewCache
{
    /// <summary>The current snapshot, loading it with <paramref name="load"/> if there isn't a fresh one.</summary>
    Task<SessionSnapshot> GetAsync(Guid sessionId, Func<Task<SessionSnapshot>> load);

    /// <summary>Drop the snapshot after a change, so the next read loads the new state.</summary>
    void Invalidate(Guid sessionId);
}

/// <summary>
/// When a session changes, every player's phone asks for it at once. Without this, 100 players
/// meant 100 identical sets of database queries; now the first request loads it and the rest share it.
/// Snapshots are dropped on every change and also expire after a minute (queue positions shift with waiting time).
/// </summary>
public sealed class SessionViewCache(IClock clock) : ISessionViewCache
{
    private static readonly TimeSpan Fresh = TimeSpan.FromSeconds(60);
    private readonly ConcurrentDictionary<Guid, Entry> entries = new();

    private sealed record Entry(Lazy<Task<SessionSnapshot>> Load, DateTimeOffset LoadedAt);

    public Task<SessionSnapshot> GetAsync(Guid sessionId, Func<Task<SessionSnapshot>> load)
    {
        var now = clock.UtcNow;
        var entry = entries.AddOrUpdate(
            sessionId,
            _ => New(load, now),
            (_, old) => IsUsable(old, now) ? old : New(load, now));
        if (entries.Count > 500) Prune(now);
        return entry.Load.Value;
    }

    public void Invalidate(Guid sessionId) => entries.TryRemove(sessionId, out _);

    private static Entry New(Func<Task<SessionSnapshot>> load, DateTimeOffset now) =>
        new(new Lazy<Task<SessionSnapshot>>(load, LazyThreadSafetyMode.ExecutionAndPublication), now);

    private static bool IsUsable(Entry e, DateTimeOffset now)
    {
        if (now - e.LoadedAt > Fresh) return false;
        if (!e.Load.IsValueCreated) return true;
        var task = e.Load.Value;
        return !task.IsFaulted && !task.IsCanceled; // a failed load is retried, not shared
    }

    private void Prune(DateTimeOffset now)
    {
        foreach (var (id, e) in entries)
            if (now - e.LoadedAt > Fresh) entries.TryRemove(id, out _);
    }
}
