namespace ChibiDink.Application.Progression;

/// <summary>Configurable starting values for rewards (spec section L).</summary>
public sealed record RewardRules
{
    public int MatchExperience { get; init; } = 100;
    public int WinExperience { get; init; } = 50;
    public int MatchCoins { get; init; } = 40;
    public int WinCoins { get; init; } = 20;
    public int WelcomeCoins { get; init; } = 500;
}
