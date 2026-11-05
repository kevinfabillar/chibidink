using Microsoft.EntityFrameworkCore;
using Npgsql;
using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;

namespace ChibiDink.Infrastructure.Persistence;

internal sealed class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    private const string ConflictMessage = "Someone else just changed this. Refresh and try again.";

    /// <summary>
    /// Tries for unlocked work. Each attempt re-runs <c>work</c>, which loads fresh state, so a save that
    /// lost a race (e.g. two quick equips on the same profile) is re-applied on top of the winner.
    /// </summary>
    private const int Attempts = 3;

    public Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default) =>
        RunWithRetryAsync(work, ct);

    public Task ExecuteSerializedAsync(Guid sessionId, Func<CancellationToken, Task> work, CancellationToken ct = default) =>
        RunInTransactionAsync(LockKeyFor(sessionId), work, ct);

    private async Task RunWithRetryAsync(Func<CancellationToken, Task> work, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await RunInTransactionAsync(lockKey: null, work, ct);
                return;
            }
            catch (ConflictException ex) when (attempt < Attempts && ex.InnerException is DbUpdateConcurrencyException)
            {
                await Task.Delay(20 * attempt, ct); // let the winning save finish
            }
        }
    }

    private async Task RunInTransactionAsync(long? lockKey, Func<CancellationToken, Task> work, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (lockKey is { } key)
        {
            // Held until commit/rollback. Other writers for the same session wait here.
            await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({key})", ct);
            db.ChangeTracker.Clear(); // read fresh state now that we own the lock
        }

        try
        {
            await work(ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            throw new ConflictException(ConflictMessage, ex);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new ConflictException(ConflictMessage, ex);
        }
        finally
        {
            db.ChangeTracker.Clear();
        }
    }

    /// <summary>Stable 64-bit key per session for PostgreSQL advisory locks.</summary>
    private static long LockKeyFor(Guid sessionId) => BitConverter.ToInt64(sessionId.ToByteArray(), 0);
}
