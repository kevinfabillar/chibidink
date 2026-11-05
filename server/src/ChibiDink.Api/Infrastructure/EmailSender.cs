using System.Net.Http.Json;

namespace ChibiDink.Api.Infrastructure;

/// <summary>Sends one email (password resets).</summary>
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string html, string text, CancellationToken ct);
}

/// <summary>
/// Sends through Brevo's email API (free plan: about 300 emails a day). Settings, never in the code:
/// <c>Email:BrevoApiKey</c>, <c>Email:FromAddress</c> (a sender verified in Brevo) and <c>Email:FromName</c>.
/// Without an API key (developing on your PC) the email is written to the log instead of sent.
/// </summary>
internal sealed class BrevoEmailSender(HttpClient http, IConfiguration config, ILogger<BrevoEmailSender> logger) : IEmailSender
{
    /// <summary>Removes spaces, line breaks and quotes that often come along when pasting a value into settings.</summary>
    private static string? Clean(string? value) => value?.Trim().Trim('"', '\'').Trim();

    public async Task SendAsync(string to, string subject, string html, string text, CancellationToken ct)
    {
        // Forgive stray spaces, line breaks or quotes from pasting the key into the host's settings.
        var apiKey = Clean(config["Email:BrevoApiKey"]);
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("Email isn't set up (Email:BrevoApiKey). Would have sent \"{Subject}\":\n{Text}", subject, text);
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
        {
            Content = JsonContent.Create(new
            {
                sender = new { name = config["Email:FromName"] ?? "ChibiDink", email = Clean(config["Email:FromAddress"]) },
                to = new[] { new { email = to } },
                subject,
                htmlContent = html,
                textContent = text,
            }),
        };
        if (!apiKey.StartsWith("xkeysib-", StringComparison.Ordinal))
            logger.LogWarning("Email:BrevoApiKey doesn't look like a Brevo API key (they start with \"xkeysib-\"; SMTP keys \"xsmtpsib-\" don't work here)");
        request.Headers.Add("api-key", apiKey);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            logger.LogError("Brevo refused the email ({Status}): {Body}", (int)response.StatusCode, await response.Content.ReadAsStringAsync(ct));
        else
            logger.LogInformation("Brevo accepted the email \"{Subject}\" ({Status})", subject, (int)response.StatusCode);
    }
}
