using ChibiDink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ChibiDink.Api.Infrastructure;

/// <summary>
/// Keeps the database small: once a day, deletes closed sessions older than 30 days, with their
/// games, courts, players and edit history, unless the session is one of the latest 10 for anyone
/// who played in it (so everyone can still look back at their recent sessions).
/// Lifetime stats, levels, XP and coins live on each player's profile and in the reward ledger,
/// which are never touched, so a player's totals stay the same.
///
/// Guest accounts (made from a session QR, no password) are deleted 7 days after they last played,
/// since nobody can sign back in to them. Never while they're in a session that's still open.
/// </summary>
internal sealed class SessionCleanupWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<SessionCleanupWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromHours(24);
    private const int Batch = 200;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var keepDays = config.GetValue("Cleanup:KeepDays", 30);
        var keepPerPlayer = config.GetValue("Cleanup:KeepSessionsPerPlayer", 10);
        var dryRun = config.GetValue("Cleanup:DryRun", false); // report only, delete nothing
        var guestDays = config.GetValue("Cleanup:GuestKeepDays", 7);
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(config.GetValue("Cleanup:StartDelaySeconds", 60)), stoppingToken); // let startup finish first
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var removed = await RunOnceAsync(keepDays, keepPerPlayer, dryRun, stoppingToken);
                    logger.LogInformation(dryRun ? "Session cleanup (dry run) would remove {Count} old sessions" : "Session cleanup removed {Count} old sessions", removed);
                    var guests = await RemoveOldGuestsAsync(guestDays, dryRun, stoppingToken);
                    var unverified = await RemoveUnverifiedAsync(7, dryRun, stoppingToken);
                    if (unverified > 0) logger.LogInformation("Removed {Count} sign-ups that never confirmed their email", unverified);
                    logger.LogInformation(dryRun ? "Guest cleanup (dry run) would remove {Count} guest accounts" : "Guest cleanup removed {Count} guest accounts", guests);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Session cleanup failed; it will try again tomorrow");
                }
                await Task.Delay(Every, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // shutting down
        }
    }

    /// <summary>
    /// Deletes guest accounts whose last activity (joining a session or finishing a game) is older than
    /// <paramref name="keepDays"/>, unless they're in an open session or a live game. Deleting the account
    /// removes its profile, items, rewards and its places in sessions and games (other players keep their
    /// own records and totals; those games just no longer list the guest).
    /// </summary>
    private async Task<int> RemoveOldGuestsAsync(int keepDays, bool dryRun, CancellationToken ct)
    {
        var total = 0;
        while (true)
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cutoff = DateTimeOffset.UtcNow.AddDays(-keepDays);

            var ids = await db.Database.SqlQuery<Guid>($"""
                SELECT u."Id" AS "Value"
                FROM "AspNetUsers" u
                JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
                JOIN "AspNetRoles" r ON r."Id" = ur."RoleId" AND r."Name" = 'Guest'
                LEFT JOIN "PlayerProfiles" p ON p."UserId" = u."Id"
                WHERE GREATEST(
                        COALESCE(p."CreatedAt", '-infinity'::timestamptz),
                        COALESCE((SELECT MAX(GREATEST(sp."JoinedAt", COALESCE(sp."LastPlayedAt", sp."JoinedAt")))
                                  FROM "SessionParticipants" sp WHERE sp."UserId" = u."Id"), '-infinity'::timestamptz)
                      ) < {cutoff}
                  AND NOT EXISTS (
                        SELECT 1 FROM "SessionParticipants" sp
                        JOIN "PlaySessions" s ON s."Id" = sp."SessionId"
                        WHERE sp."UserId" = u."Id" AND s."Status" <> 'Closed')
                  AND NOT EXISTS (
                        SELECT 1 FROM "MatchParticipants" mp WHERE mp."UserId" = u."Id" AND mp."IsActive")
                LIMIT {Batch}
                """).ToListAsync(ct);
            if (ids.Count == 0 || dryRun) return total + ids.Count;

            // The account's rows in other tables (profile, items, rewards, roles, session and game places) cascade.
            await db.Users.Where(u => ids.Contains(u.Id)).ExecuteDeleteAsync(ct);
            total += ids.Count;
            if (ids.Count < Batch) return total;
        }
    }

    /// <summary>Sign-ups that never confirmed their email (not guests) are removed after a week.</summary>
    private async Task<int> RemoveUnverifiedAsync(int keepDays, bool dryRun, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cutoff = DateTimeOffset.UtcNow.AddDays(-keepDays);
        var ids = await db.Database.SqlQuery<Guid>($"""
            SELECT u."Id" AS "Value"
            FROM "AspNetUsers" u
            JOIN "PlayerProfiles" p ON p."UserId" = u."Id"
            WHERE u."EmailConfirmed" = false AND u."PasswordHash" IS NOT NULL AND p."CreatedAt" < {cutoff}
              AND NOT EXISTS (SELECT 1 FROM "PlaySessions" s WHERE s."OrganizerId" = u."Id")
            LIMIT {Batch}
            """).ToListAsync(ct);
        if (ids.Count == 0 || dryRun) return ids.Count;
        await db.Users.Where(u => ids.Contains(u.Id)).ExecuteDeleteAsync(ct);
        return ids.Count;
    }

    private async Task<int> RunOnceAsync(int keepDays, int keepPerPlayer, bool dryRun, CancellationToken ct)
    {
        var total = 0;
        while (true)
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cutoff = DateTimeOffset.UtcNow.AddDays(-keepDays);

            var ids = await db.Database.SqlQuery<Guid>($"""
                WITH ranked AS (
                    SELECT sp."SessionId", ROW_NUMBER() OVER (PARTITION BY sp."UserId" ORDER BY s."CreatedAt" DESC) AS rn
                    FROM "SessionParticipants" sp
                    JOIN "PlaySessions" s ON s."Id" = sp."SessionId"
                )
                SELECT s."Id" AS "Value"
                FROM "PlaySessions" s
                WHERE s."Status" = 'Closed'
                  AND COALESCE(s."ClosedAt", s."CreatedAt") < {cutoff}
                  AND NOT EXISTS (SELECT 1 FROM ranked r WHERE r."SessionId" = s."Id" AND r.rn <= {keepPerPlayer})
                LIMIT {Batch}
                """).ToListAsync(ct);
            if (ids.Count == 0 || dryRun) return total + ids.Count;

            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await db.MatchEditAudits.Where(a => ids.Contains(a.SessionId)).ExecuteDeleteAsync(ct);
            await db.Matches.Where(m => ids.Contains(m.SessionId)).ExecuteDeleteAsync(ct); // match players cascade
            await db.PlaySessions.Where(s => ids.Contains(s.Id)).ExecuteDeleteAsync(ct); // courts and players cascade
            await tx.CommitAsync(ct);

            total += ids.Count;
            if (ids.Count < Batch) return total;
        }
    }
}
