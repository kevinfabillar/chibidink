using ChibiDink.Domain.Common;

namespace ChibiDink.Domain.Sessions;

/// <summary>
/// A registered user's presence in one session: their place in the shared queue
/// and their session-only record (separate from lifetime statistics).
/// </summary>
public sealed class SessionParticipant : Entity
{
    public Guid SessionId { get; private set; }
    public Guid UserId { get; private set; }
    public SessionRole Role { get; private set; }
    public int SkillEstimate { get; private set; }
    public ParticipantStatus Status { get; private set; } = ParticipantStatus.Paused;
    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>Queue priority timestamp. Kept when a match falls through so nobody loses their place.</summary>
    public DateTimeOffset? WaitingSince { get; private set; }

    public int CompletedGames { get; private set; }
    public int CompletedMinutes { get; private set; }
    public int Wins { get; private set; }
    public int Losses { get; private set; }
    public DateTimeOffset? LastPlayedAt { get; private set; }

    public bool IsOrganizer => Role == SessionRole.Organizer;
    public bool IsAvailableForMatch => Status is ParticipantStatus.Waiting or ParticipantStatus.Paused;

    private SessionParticipant() { } // EF

    internal SessionParticipant(Guid sessionId, Guid userId, SessionRole role, SkillLevel skill, DateTimeOffset now)
    {
        SessionId = sessionId;
        UserId = userId;
        Role = role;
        SkillEstimate = skill;
        JoinedAt = now;
    }

    public void EnterQueue(DateTimeOffset now)
    {
        Guard.That(Status != ParticipantStatus.InMatch, "You are already in a match.");
        if (Status == ParticipantStatus.Waiting) return;
        Status = ParticipantStatus.Waiting;
        WaitingSince = now;
    }

    public void Pause()
    {
        Guard.That(Status != ParticipantStatus.InMatch, "You can't pause while assigned to a match.");
        if (Status == ParticipantStatus.Left) return;
        Status = ParticipantStatus.Paused;
        WaitingSince = null;
    }

    public void Leave()
    {
        Guard.That(Status != ParticipantStatus.InMatch, "You can't leave while assigned to a match.");
        Status = ParticipantStatus.Left;
        WaitingSince = null;
    }

    public void SetSkillEstimate(SkillLevel skill) => SkillEstimate = skill;

    internal void Rejoin()
    {
        if (Status == ParticipantStatus.Left) Status = ParticipantStatus.Paused;
    }

    internal void Reserve(DateTimeOffset now)
    {
        Guard.That(IsAvailableForMatch, "Player is not available for a match.");
        WaitingSince ??= now; // manually picked paused players still get a priority stamp
        Status = ParticipantStatus.InMatch;
    }

    /// <summary>Match fell through before play: back to the queue with the original priority.</summary>
    internal void ReturnToQueue()
    {
        if (Status == ParticipantStatus.InMatch) Status = ParticipantStatus.Waiting;
    }

    /// <summary>Declined a match: stays checked in, at the back of the line.</summary>
    internal void RequeueAtBack(DateTimeOffset now)
    {
        if (Status != ParticipantStatus.InMatch) return;
        Status = ParticipantStatus.Waiting;
        WaitingSince = now;
    }

    /// <summary>Missed a match call (no answer): checked out until they check back in.</summary>
    internal void StepAway()
    {
        if (Status != ParticipantStatus.InMatch) return;
        Status = ParticipantStatus.Paused;
        WaitingSince = null;
    }

    internal void CompleteGame(DateTimeOffset now, int minutes, bool won)
    {
        CompletedGames++;
        CompletedMinutes += Math.Max(0, minutes);
        if (won) Wins++; else Losses++;
        LastPlayedAt = now;
        Status = ParticipantStatus.Waiting;
        WaitingSince = now;
    }

    /// <summary>Match voided after play started: no result, back of the queue.</summary>
    internal void ReleaseWithoutResult(DateTimeOffset now)
    {
        if (Status != ParticipantStatus.InMatch) return;
        Status = ParticipantStatus.Waiting;
        WaitingSince = now;
    }
}
