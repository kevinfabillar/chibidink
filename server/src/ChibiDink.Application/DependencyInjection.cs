using ChibiDink.Application.Cosmetics;
using ChibiDink.Application.Matches;
using ChibiDink.Application.Matchmaking;
using ChibiDink.Application.Players;
using ChibiDink.Application.Progression;
using ChibiDink.Application.Sessions;
using ChibiDink.Domain.Cosmetics;
using ChibiDink.Domain.Matchmaking;
using Microsoft.Extensions.DependencyInjection;

namespace ChibiDink.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton<IMatchmakingStrategy>(new FairRotationMatchmaker());
        services.AddSingleton<ICosmeticCatalog, StandardCosmeticCatalog>();
        services.AddSingleton(new RewardRules());
        services.AddSingleton<ISessionViewCache, SessionViewCache>();

        services.AddScoped<ISessionCommandRunner, SessionCommandRunner>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<IQueueService, QueueService>();
        services.AddScoped<IUpNextService, UpNextService>();
        services.AddScoped<ISessionQueries, SessionQueries>();
        services.AddScoped<IMatchService, MatchService>();
        services.AddScoped<IMatchmakingService, MatchmakingService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IRewardService, RewardService>();
        services.AddScoped<ICosmeticsService, CosmeticsService>();

        // Reactions to a verified match. Each is independent; add new ones without touching MatchService.
        services.AddScoped<IMatchCompletedHandler, LifetimeStatisticsHandler>();
        services.AddScoped<IMatchCompletedHandler, MatchRewardsHandler>();
        return services;
    }
}
