using System.Threading.Channels;
using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Matchmaking;

namespace ChibiDink.Api.Matchmaking;

/// <summary>In-memory inbox of sessions that just changed and should be looked at soon.</summary>
internal sealed class MatchmakingInbox : IMatchmakingScheduler
{
    private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions { SingleReader = true });

    public ChannelReader<Guid> Reader => _channel.Reader;

    public void Request(Guid sessionId) => _channel.Writer.TryWrite(sessionId);
}

/// <summary>
/// Runs matchmaking in the background: right after changes (via the inbox) and on a steady
/// heartbeat that also expires stale confirmations. Correctness never depends on this timing,
/// because every pass takes the per-session database lock.
/// </summary>
internal sealed class MatchmakingWorker(
    MatchmakingInbox inbox,
    IServiceScopeFactory scopes,
    ILogger<MatchmakingWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Heartbeat = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Every real change (score, check-in, court, settings) already wakes the matchmaker through the inbox,
    /// so an open session only gets a safety pass this often. Running a full pass every 5 seconds for every
    /// open session read the whole session each time, which a forgotten session did all day.
    /// </summary>
    private static readonly TimeSpan SafetyPass = TimeSpan.FromMinutes(10);

    /// <summary>When each session last had a pass (from the inbox or the heartbeat).</summary>
    private readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, DateTimeOffset> lastPass = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.WhenAll(ProcessInboxAsync(stoppingToken), HeartbeatAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // shutting down
        }
    }

    private async Task ProcessInboxAsync(CancellationToken ct)
    {
        while (await inbox.Reader.WaitToReadAsync(ct))
        {
            var batch = new HashSet<Guid>(); // collapse bursts of changes into one pass per session
            while (inbox.Reader.TryRead(out var id)) batch.Add(id);
            foreach (var sessionId in batch) await TickAsync(sessionId, ct);
        }
    }

    private async Task HeartbeatAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(Heartbeat);
        while (await timer.WaitForNextTickAsync(ct))
        {
            var (active, expired) = await SessionsNeedingAttentionAsync(ct);
            var now = DateTimeOffset.UtcNow;
            // Expired confirmations need a pass now; other open sessions only when their safety pass is due.
            var due = expired.Concat(active.Where(id => !lastPass.TryGetValue(id, out var at) || now - at >= SafetyPass)).Distinct();
            foreach (var id in due) await TickAsync(id, ct);
            // Forget sessions that closed.
            foreach (var id in lastPass.Keys.Except(active).ToList()) lastPass.TryRemove(id, out _);
        }
    }

    private async Task<(IReadOnlyList<Guid> Active, IReadOnlyList<Guid> Expired)> SessionsNeedingAttentionAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var sessions = scope.ServiceProvider.GetRequiredService<ISessionRepository>();
            var clock = scope.ServiceProvider.GetRequiredService<IClock>();
            return await sessions.ListNeedingAttentionAsync(clock.UtcNow, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not list sessions for matchmaking");
            return ([], []);
        }
    }

    private async Task TickAsync(Guid sessionId, CancellationToken ct)
    {
        lastPass[sessionId] = DateTimeOffset.UtcNow;
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<IMatchmakingService>().TickAsync(sessionId, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Matchmaking pass failed for session {SessionId}", sessionId);
        }
    }
}
