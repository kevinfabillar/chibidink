using System.Security.Cryptography;
using ChibiDink.Application.Abstractions;

namespace ChibiDink.Infrastructure.Services;

internal sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

internal sealed class InviteCodeGenerator : IInviteCodeGenerator
{
    // No 0/O, 1/I/L so codes are easy to read aloud and type.
    private const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private const int Length = 6;

    public string Generate() => string.Create(Length, 0, (span, _) =>
    {
        for (var i = 0; i < span.Length; i++) span[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
    });
}
