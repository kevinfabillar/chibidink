namespace ChibiDink.Application.Common;

public sealed class NotFoundException(string what) : Exception($"{what} was not found.");
