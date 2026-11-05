using ChibiDink.Domain.Common;
using ChibiDink.Domain.Players;

namespace ChibiDink.Tests.Domain;

public sealed class AppearanceTests
{
    [Fact]
    public void Knight_look_can_be_changed()
    {
        var player = PlayerProfile.Create(Guid.NewGuid(), "Kevin", TestData.Now);

        player.ChangeAppearance(player.Appearance with
        {
            BodyColor = "#A99BE0", EyeStyle = "star", BrowStyle = "worried", MouthStyle = "blep",
            CheekStyle = "freckles", FaceMark = "bandage", GripWrap = "cross", HandleShape = "chunky", EndCap = "ball",
        });

        var a = player.Appearance;
        Assert.Equal(("#A99BE0", "star", "worried", "blep"), (a.BodyColor, a.EyeStyle, a.BrowStyle, a.MouthStyle));
        Assert.Equal(("freckles", "bandage", "cross", "chunky", "ball"), (a.CheekStyle, a.FaceMark, a.GripWrap, a.HandleShape, a.EndCap));
    }

    [Fact]
    public void Starter_look_is_valid() => Appearance.StarterFor(Guid.NewGuid()).Validated();

    public static TheoryData<Func<Appearance, Appearance>> InvalidChanges => new()
    {
        a => a with { EyeStyle = "laser" },
        a => a with { BrowStyle = "unibrow" },
        a => a with { MouthStyle = "fangs" },
        a => a with { CheekStyle = "paint" },
        a => a with { FaceMark = "tattoo" },
        a => a with { GripWrap = "tape" },
        a => a with { HandleShape = "huge" },
        a => a with { EndCap = "spike" },
        a => a with { BodyColor = "orange" },
        a => a with { GripColor = "#12345" },
    };

    [Theory]
    [MemberData(nameof(InvalidChanges))]
    public void Rejects_unknown_options(Func<Appearance, Appearance> change)
    {
        var player = PlayerProfile.Create(Guid.NewGuid(), "Kevin", TestData.Now);
        Assert.Throws<DomainException>(() => player.ChangeAppearance(change(player.Appearance)));
    }
}
