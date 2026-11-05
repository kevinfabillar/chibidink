namespace ChibiDink.Domain.Common;

internal static class Guard
{
    public static void That(bool condition, string message)
    {
        if (!condition) throw new DomainException(message);
    }

    public static string NotBlank(string? value, string field, int maxLength)
    {
        var trimmed = value?.Trim() ?? "";
        That(trimmed.Length > 0, $"{field} is required.");
        That(trimmed.Length <= maxLength, $"{field} must be at most {maxLength} characters.");
        return trimmed;
    }
}
