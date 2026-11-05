namespace ChibiDink.Application.Common;

/// <summary>Someone else changed the same data at the same moment. The client should refresh and retry.</summary>
public sealed class ConflictException(string message, Exception? inner = null) : Exception(message, inner);
