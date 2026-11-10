using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Common;
using ChibiDink.Application.Contracts;
using ChibiDink.Domain.Common;
using ChibiDink.Domain.Players;
using ChibiDink.Domain.Social;

namespace ChibiDink.Application.Social;

public interface IFriendService
{
    /// <summary>Your friend code, friends, and requests both ways. Gives you a friend code the first time.</summary>
    Task<FriendsDto> GetMineAsync(CancellationToken ct);

    /// <summary>Who a friend code belongs to and where you stand with them, without sending anything.</summary>
    Task<FriendActionDto> LookupByCodeAsync(string code, CancellationToken ct);

    /// <summary>Sends a request by friend code (or accepts theirs, if they already asked you).</summary>
    Task<FriendActionDto> AddByCodeAsync(string code, CancellationToken ct);

    /// <summary>Sends a request to a player (or accepts theirs, if they already asked you).</summary>
    Task<FriendActionDto> AddAsync(Guid userId, CancellationToken ct);

    Task<FriendActionDto> AcceptAsync(Guid userId, CancellationToken ct);

    /// <summary>Declines their request, cancels yours, or unfriends: whichever applies.</summary>
    Task RemoveAsync(Guid userId, CancellationToken ct);
}

public sealed class FriendService(
    IFriendshipRepository friendships,
    IPlayerProfileRepository profiles,
    IInviteCodeGenerator codes,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    IClock clock) : IFriendService
{
    public async Task<FriendsDto> GetMineAsync(CancellationToken ct)
    {
        var me = currentUser.UserId;
        var code = await EnsureFriendCodeAsync(me, ct);

        var rows = await friendships.ListForUserAsync(me, ct);
        var people = await profiles.GetManyAsync(rows.Select(f => f.OtherThan(me)), ct);
        FriendDto Item(Friendship f) => new(ViewMapper.Card(f.OtherThan(me), people), f.AcceptedAt ?? f.CreatedAt);

        return new FriendsDto(
            code,
            Friendship.MaxFriends,
            rows.Where(f => f.Status == FriendshipStatus.Accepted).OrderBy(f => people.GetValueOrDefault(f.OtherThan(me))?.DisplayName).Select(Item).ToList(),
            rows.Where(f => f.Status == FriendshipStatus.Pending && f.AddresseeId == me).Select(Item).ToList(),
            rows.Where(f => f.Status == FriendshipStatus.Pending && f.RequesterId == me).Select(Item).ToList());
    }

    public async Task<FriendActionDto> LookupByCodeAsync(string code, CancellationToken ct)
    {
        var target = await FindByCodeAsync(code, ct);
        var me = currentUser.UserId;
        if (target.UserId == me) throw new DomainException("That's your own friend code.");
        var row = await friendships.FindBetweenAsync(me, target.UserId, ct);
        var status = row switch
        {
            null => FriendStatus.None,
            { Status: FriendshipStatus.Accepted } => FriendStatus.Friends,
            _ when row.RequesterId == me => FriendStatus.Outgoing,
            _ => FriendStatus.Incoming,
        };
        return new FriendActionDto(ViewMapper.Card(target), status);
    }

    public async Task<FriendActionDto> AddByCodeAsync(string code, CancellationToken ct) =>
        await AddAsync((await FindByCodeAsync(code, ct)).UserId, ct);

    private async Task<PlayerProfile> FindByCodeAsync(string code, CancellationToken ct)
    {
        var clean = new string((code ?? "").Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (clean.Length != 6) throw new DomainException("A friend code has 6 letters and numbers.");
        return await profiles.FindByFriendCodeAsync(clean, ct) ?? throw new DomainException("Nobody has that friend code. Check it and try again.");
    }

    public async Task<FriendActionDto> AddAsync(Guid userId, CancellationToken ct)
    {
        var me = currentUser.UserId;
        if (userId == me) throw new DomainException("That's your own friend code.");
        PlayerProfile? target = null;
        var status = FriendStatus.None;

        await unitOfWork.ExecuteAsync(async innerCt =>
        {
            target = await profiles.FindAsync(userId, innerCt) ?? throw new NotFoundException("Player");
            var existing = await friendships.FindBetweenAsync(me, userId, innerCt);
            if (existing is { Status: FriendshipStatus.Accepted })
            {
                status = FriendStatus.Friends;
                return;
            }
            if (existing is not null && existing.RequesterId == me)
            {
                status = FriendStatus.Outgoing; // already asked
                return;
            }
            if (existing is not null)
            {
                // They already asked you: adding them back is a yes.
                await EnsureRoomAsync(me, target, innerCt);
                existing.Accept(me, clock.UtcNow);
                status = FriendStatus.Friends;
                return;
            }

            await EnsureRoomAsync(me, target, innerCt);
            if (await friendships.CountPendingSentAsync(me, innerCt) >= Friendship.MaxPendingSent)
                throw new DomainException($"You have {Friendship.MaxPendingSent} requests waiting for an answer. Cancel some first.");
            friendships.Add(Friendship.Request(me, userId, clock.UtcNow));
            status = FriendStatus.Outgoing;
        }, ct);

        return new FriendActionDto(ViewMapper.Card(target!), status);
    }

    public async Task<FriendActionDto> AcceptAsync(Guid userId, CancellationToken ct)
    {
        var me = currentUser.UserId;
        PlayerProfile? from = null;
        await unitOfWork.ExecuteAsync(async innerCt =>
        {
            var request = await friendships.FindBetweenAsync(me, userId, innerCt);
            if (request is { Status: FriendshipStatus.Accepted }) return;
            if (request is null || request.AddresseeId != me) throw new NotFoundException("Friend request");
            from = await profiles.FindAsync(userId, innerCt) ?? throw new NotFoundException("Player");
            await EnsureRoomAsync(me, from, innerCt);
            request.Accept(me, clock.UtcNow);
        }, ct);

        from ??= await profiles.FindAsync(userId, ct) ?? throw new NotFoundException("Player");
        return new FriendActionDto(ViewMapper.Card(from), FriendStatus.Friends);
    }

    public Task RemoveAsync(Guid userId, CancellationToken ct) =>
        unitOfWork.ExecuteAsync(async innerCt =>
        {
            var row = await friendships.FindBetweenAsync(currentUser.UserId, userId, innerCt);
            if (row is not null) friendships.Remove(row);
        }, ct);

    /// <summary>Both of you need a free friend slot.</summary>
    private async Task EnsureRoomAsync(Guid me, PlayerProfile other, CancellationToken ct)
    {
        if (await friendships.CountAcceptedAsync(me, ct) >= Friendship.MaxFriends)
            throw new DomainException($"You have {Friendship.MaxFriends} friends, the most allowed. Remove one to add another.");
        if (await friendships.CountAcceptedAsync(other.UserId, ct) >= Friendship.MaxFriends)
            throw new DomainException($"{other.DisplayName} already has {Friendship.MaxFriends} friends, the most allowed.");
    }

    private async Task<string> EnsureFriendCodeAsync(Guid userId, CancellationToken ct)
    {
        var mine = await profiles.FindAsync(userId, ct) ?? throw new NotFoundException("Profile");
        if (mine.FriendCode is { } existing) return existing;

        string? code = null;
        await unitOfWork.ExecuteAsync(async innerCt =>
        {
            var profile = await profiles.FindAsync(userId, innerCt) ?? throw new NotFoundException("Profile");
            if (profile.FriendCode is not null)
            {
                code = profile.FriendCode;
                return;
            }
            for (var attempt = 0; attempt < 10; attempt++)
            {
                var candidate = codes.Generate();
                if (await profiles.FriendCodeExistsAsync(candidate, innerCt)) continue;
                profile.AssignFriendCode(candidate);
                code = candidate;
                return;
            }
            throw new ConflictException("Couldn't make a friend code right now. Try again.");
        }, ct);
        return code!;
    }
}
