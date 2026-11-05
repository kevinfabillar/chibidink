namespace ChibiDink.Domain.Common;

/// <summary>Base type for everything with an identity.</summary>
public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.CreateVersion7();
}
