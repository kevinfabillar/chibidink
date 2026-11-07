using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Social;

public enum FriendshipStatus
{
    Pending,
    Accepted,
}

/// <summary>
/// A friend request, and once accepted, a friendship. One row per pair of players: the pair is also stored
/// in a fixed order (low id, high id) so the database can refuse a second row for the same two people.
/// Declining, cancelling and unfriending simply delete the row.
/// </summary>
public sealed class Friendship : Entity
{
    public const int MaxFriends = 50;
    public const int MaxPendingSent = 20;

    public Guid RequesterId { get; private set; }
    public Guid AddresseeId { get; private set; }
    public Guid UserLowId { get; private set; }
    public Guid UserHighId { get; private set; }
    public FriendshipStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? AcceptedAt { get; private set; }

    private Friendship() { } // EF

    public static Friendship Request(Guid from, Guid to, DateTimeOffset now)
    {
        Guard.That(from != to, "You can't add yourself as a friend.");
        var fromIsLow = from.CompareTo(to) < 0;
        return new Friendship
        {
            RequesterId = from,
            AddresseeId = to,
            UserLowId = fromIsLow ? from : to,
            UserHighId = fromIsLow ? to : from,
            Status = FriendshipStatus.Pending,
            CreatedAt = now,
        };
    }

    /// <summary>Only the person who was asked can accept.</summary>
    public void Accept(Guid by, DateTimeOffset now)
    {
        Guard.That(Status == FriendshipStatus.Pending, "You're already friends.");
        Guard.That(by == AddresseeId, "Only the person you asked can accept.");
        Status = FriendshipStatus.Accepted;
        AcceptedAt = now;
    }

    public bool Involves(Guid userId) => RequesterId == userId || AddresseeId == userId;

    public Guid OtherThan(Guid userId) => RequesterId == userId ? AddresseeId : RequesterId;
}
