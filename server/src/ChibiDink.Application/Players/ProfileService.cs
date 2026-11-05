using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Application.Progression;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Players;
using Microsoft.Extensions.DependencyInjection;

namespace ChibiDink.Application.Players;

public interface IProfileService
{
    /// <summary>Creates the profile (with the welcome coins) for a user. Safe to call on every sign-in.</summary>
    Task EnsureProfileAsync(Guid userId, string displayName, CancellationToken ct);
    Task<ProfileDto> GetAsync(Guid userId, CancellationToken ct);
    Task<ProfileDto> GetMineAsync(CancellationToken ct);
    Task UpdateMineAsync(UpdateProfileRequest request, CancellationToken ct);
    Task UpdateMyAppearanceAsync(Appearance appearance, CancellationToken ct);
}

public sealed class ProfileService(
    IPlayerProfileRepository profiles,
    ISessionRepository sessions,
    IMatchRepository matches,
    IRewardService rewards,
    RewardRules rewardRules,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IServiceScopeFactory scopes,
    IClock clock) : IProfileService
{
    private const int RecentMatchCount = 15;

    public async Task EnsureProfileAsync(Guid userId, string displayName, CancellationToken ct)
    {
        // Every sign-in calls this; almost always the profile exists (and got its welcome coins when it was
        // made), so one quick lookup is enough. Only a missing profile goes through the full repair below.
        if (await profiles.FindAsync(userId, ct) is not null) return;
        await unitOfWork.ExecuteAsync(async innerCt =>
        {
            var profile = await profiles.FindAsync(userId, innerCt);
            if (profile is null)
            {
                profile = PlayerProfile.Create(userId, displayName, clock.UtcNow);
                profiles.Add(profile);
            }
            await rewards.GrantAsync(profile, 0, rewardRules.WelcomeCoins, "welcome", "Welcome bonus", innerCt);
        }, ct);
    }

    public Task<ProfileDto> GetMineAsync(CancellationToken ct) => GetAsync(currentUser.UserId, ct);

    public async Task<ProfileDto> GetAsync(Guid userId, CancellationToken ct)
    {
        var viewerId = currentUser.UserId;
        var isMe = userId == viewerId;

        // The database is a round trip away, so the lookups that don't depend on each other run at the
        // same time (each on its own connection) instead of one after another.
        var profileTask = Read((IPlayerProfileRepository r) => r.FindAsync(userId, ct));
        var recentTask = Read((IMatchRepository r) => r.ListCompletedForUserAsync(userId, RecentMatchCount, ct));
        var sessionsTask = Read((ISessionRepository r) => r.ListForUserAsync(userId, 10, ct));
        var liveTask = isMe ? Read((IMatchRepository r) => r.FindLiveForUserAsync(userId, ct)) : Task.FromResult<Domain.Matches.Match?>(null);
        await Task.WhenAll(profileTask, recentTask, sessionsTask, liveTask);

        var profile = profileTask.Result ?? throw new NotFoundException("Profile");
        var recent = recentTask.Result;
        var mySessions = sessionsTask.Result;
        var live = liveTask.Result;

        // Second round, also together: the other players' names, and the live match's session title
        // (usually already in the session list, so no lookup at all).
        var peopleTask = Read((IPlayerProfileRepository r) => r.GetManyAsync(recent.SelectMany(m => m.PlayerIds).Distinct(), ct));
        var title = live is null ? null : mySessions.FirstOrDefault(x => x.Id == live.SessionId)?.Title;
        var titleTask = live is not null && title is null
            ? Read((ISessionRepository r) => r.FindTitleAsync(live.SessionId, ct))
            : Task.FromResult(title);
        await Task.WhenAll(peopleTask, titleTask);
        var people = peopleTask.Result;

        // Someone else's profile only lists sessions you were both in, so it can't reveal where and when they play.
        if (!isMe)
            mySessions = mySessions.Where(x => x.FindParticipant(viewerId) is not null).ToList();
        var activeMatch = live is null ? null
            : new ActiveMatchDto(live.SessionId, titleTask.Result ?? "Session", live.Id, live.CourtNumber, live.Status, live.NeedsActionFrom(userId));

        return new ProfileDto(
            ViewMapper.Card(profile),
            profile.SkillEstimate,
            ProgressDto.From(profile),
            StatsDto.From(profile.Statistics),
            recent.Select(m => ViewMapper.History(m, userId, people)).ToList(),
            mySessions.Select(x => ViewMapper.Summary(x, viewerId)).ToList(),
            activeMatch);
    }

    /// <summary>Runs one read in its own scope (its own database connection), so several can run at once.</summary>
    private async Task<T> Read<TRepo, T>(Func<TRepo, Task<T>> read) where TRepo : notnull
    {
        await using var scope = scopes.CreateAsyncScope();
        return await read(scope.ServiceProvider.GetRequiredService<TRepo>());
    }

    public Task UpdateMineAsync(UpdateProfileRequest request, CancellationToken ct) =>
        WithMyProfile(p =>
        {
            p.Rename(request.DisplayName);
            p.SetSkillEstimate(new SkillLevel(request.SkillEstimate));
        }, ct);

    public Task UpdateMyAppearanceAsync(Appearance appearance, CancellationToken ct) =>
        WithMyProfile(p => p.ChangeAppearance(appearance), ct);

    private Task WithMyProfile(Action<PlayerProfile> change, CancellationToken ct) =>
        unitOfWork.ExecuteAsync(async innerCt =>
        {
            var profile = await profiles.FindAsync(currentUser.UserId, innerCt) ?? throw new NotFoundException("Profile");
            change(profile);
        }, ct);
}
