using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using ChibiDink.Application.Abstractions;
using ChibiDink.Infrastructure.Persistence;
using ChibiDink.Infrastructure.Services;

namespace ChibiDink.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is missing. Locally it comes from user secrets; on a server, " +
                "set the ConnectionStrings__DefaultConnection environment variable.");

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(WithPoolLimit(raw, configuration)));
        services.AddDataProtection()
            .SetApplicationName("ChibiDink")
            .PersistKeysToDbContext<AppDbContext>();

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPlayerProfileRepository, PlayerProfileRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IMatchRepository, MatchRepository>();
        services.AddScoped<IAuditLog, AuditLog>();
        services.AddScoped<IRewardLedger, RewardLedger>();
        services.AddScoped<IFriendshipRepository, FriendshipRepository>();

        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IInviteCodeGenerator, InviteCodeGenerator>();
        return services;
    }

    /// <summary>
    /// Caps how many database connections this API keeps open. Hosted Postgres poolers (Supabase session
    /// mode allows 15 clients in total) reject anything over their limit; with a cap, a burst of requests
    /// (a guest checking in refreshes everything at once) waits briefly for a free connection instead of failing.
    /// An explicit "Maximum Pool Size" in the connection string wins.
    /// </summary>
    private static string WithPoolLimit(string connectionString, IConfiguration configuration)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        if (!connectionString.Contains("Pool Size", StringComparison.OrdinalIgnoreCase))
            builder.MaxPoolSize = configuration.GetValue("Database:MaxPoolSize", 8);
        if (!connectionString.Contains("Idle Lifetime", StringComparison.OrdinalIgnoreCase))
            builder.ConnectionIdleLifetime = 300; // hand extra idle connections back after 5 minutes
        // Opening a new encrypted connection takes several round trips (about a second to a far-away
        // database), so keep two ready at all times, kept alive with a tiny ping every 30 seconds.
        if (!connectionString.Contains("Minimum Pool Size", StringComparison.OrdinalIgnoreCase) &&
            !connectionString.Contains("Min Pool Size", StringComparison.OrdinalIgnoreCase))
            builder.MinPoolSize = Math.Min(2, builder.MaxPoolSize);
        if (!connectionString.Contains("Keepalive", StringComparison.OrdinalIgnoreCase))
            builder.KeepAlive = 30;
        return builder.ConnectionString;
    }
}
