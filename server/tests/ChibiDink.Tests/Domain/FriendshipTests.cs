using ChibiDink.Domain.Common;
using ChibiDink.Domain.Social;

namespace ChibiDink.Tests.Domain;

public sealed class FriendshipTests
{
    private static readonly DateTimeOffset Now = TestData.Now;

    [Fact]
    public void A_request_stores_the_pair_in_a_fixed_order_whoever_asks()
    {
        var (a, b) = (Guid.NewGuid(), Guid.NewGuid());
        var ab = Friendship.Request(a, b, Now);
        var ba = Friendship.Request(b, a, Now);

        Assert.Equal((ab.UserLowId, ab.UserHighId), (ba.UserLowId, ba.UserHighId));
        Assert.Equal(FriendshipStatus.Pending, ab.Status);
        Assert.Equal(b, ab.OtherThan(a));
    }

    [Fact]
    public void You_cannot_friend_yourself()
    {
        var me = Guid.NewGuid();
        Assert.Throws<DomainException>(() => Friendship.Request(me, me, Now));
    }

    [Fact]
    public void Only_the_person_asked_can_accept_and_only_once()
    {
        var (from, to) = (Guid.NewGuid(), Guid.NewGuid());
        var f = Friendship.Request(from, to, Now);

        Assert.Throws<DomainException>(() => f.Accept(from, Now));
        f.Accept(to, Now.AddMinutes(1));

        Assert.Equal(FriendshipStatus.Accepted, f.Status);
        Assert.Equal(Now.AddMinutes(1), f.AcceptedAt);
        Assert.Throws<DomainException>(() => f.Accept(to, Now));
    }
}
