namespace ChibiDink.Domain.Common;

/// <summary>A business rule was broken. The message is safe to show to users.</summary>
public class DomainException(string message) : Exception(message);

/// <summary>The caller is not allowed to perform the action.</summary>
public sealed class ForbiddenException(string message) : DomainException(message);
