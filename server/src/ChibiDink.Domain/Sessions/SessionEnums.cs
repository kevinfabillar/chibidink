namespace ChibiDink.Domain.Sessions;

public enum SessionStatus
{
    /// <summary>Players can join and queue, but no matches are made yet.</summary>
    Open = 1,
    /// <summary>Matches are being made and played.</summary>
    Active = 2,
    Closed = 3,
}

public enum SessionRole
{
    Player = 1,
    Organizer = 2,
}

public enum ParticipantStatus
{
    /// <summary>Checked out: joined the session but not in the queue right now (missed a match call, or the organizer checked them out).</summary>
    Paused = 1,
    Waiting = 2,
    /// <summary>Reserved for or playing in a match.</summary>
    InMatch = 3,
    Left = 4,
}

/// <summary>How the shared queue picks the next four players.</summary>
public enum QueueMode
{
    /// <summary>Equal play: fewest games first, then longest wait. Skill is ignored.</summary>
    FairMatch = 1,
    /// <summary>Players are grouped with others of the same tier (Beginner, Novice, Intermediate).</summary>
    SkillBased = 2,
}

public enum CourtStatus
{
    Available = 1,
    Unavailable = 2,
}
