using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;

namespace ChibiDink.Api.Infrastructure;

/// <summary>Sends one email (password resets).</summary>
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string html, string text, CancellationToken ct);
}

/// <summary>
/// Sends through Brevo (free plan: about 300 emails a day), by SMTP or by its API. Settings, never in the code:
/// <list type="bullet">
/// <item>SMTP (used when <c>Email:SmtpPassword</c> is set): <c>Email:SmtpLogin</c> (like 123abc@smtp-brevo.com),
/// <c>Email:SmtpPassword</c> (an SMTP key, "xsmtpsib-…"), optional <c>Email:SmtpHost</c> (smtp-relay.brevo.com)
/// and <c>Email:SmtpPort</c> (587; 2525 if the host blocks 587).</item>
/// <item>API: <c>Email:BrevoApiKey</c> ("xkeysib-…").</item>
/// </list>
/// Both need <c>Email:FromAddress</c> (a sender verified in Brevo) and optionally <c>Email:FromName</c>.
/// With neither set (developing on your PC) the email is written to the log instead of sent.
/// </summary>
internal sealed class BrevoEmailSender(HttpClient http, IConfiguration config, ILogger<BrevoEmailSender> logger) : IEmailSender
{
    /// <summary>Removes spaces, line breaks and quotes that often come along when pasting a value into settings.</summary>
    private static string? Clean(string? value) => value?.Trim().Trim('"', '\'').Trim();

    public async Task SendAsync(string to, string subject, string html, string text, CancellationToken ct)
    {
        var from = Clean(config["Email:FromAddress"]);
        var fromName = Clean(config["Email:FromName"]) ?? "ChibiDink";
        var smtpPassword = Clean(config["Email:SmtpPassword"]);
        var apiKey = Clean(config["Email:BrevoApiKey"]);

        if (!string.IsNullOrWhiteSpace(smtpPassword))
            await SendSmtpAsync(from, fromName, smtpPassword, to, subject, html, text, ct);
        else if (!string.IsNullOrWhiteSpace(apiKey))
            await SendApiAsync(from, fromName, apiKey, to, subject, html, text, ct);
        else
            logger.LogWarning("Email isn't set up (Email:SmtpPassword or Email:BrevoApiKey). Would have sent \"{Subject}\":\n{Text}", subject, text);
    }

    private async Task SendSmtpAsync(string? from, string fromName, string password, string to, string subject, string html, string text, CancellationToken ct)
    {
        var host = Clean(config["Email:SmtpHost"]) ?? "smtp-relay.brevo.com";
        var port = int.TryParse(Clean(config["Email:SmtpPort"]), out var p) ? p : 587;
        var login = Clean(config["Email:SmtpLogin"]);
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogError("SMTP needs Email:SmtpLogin and Email:FromAddress");
            return;
        }

        using var message = new MailMessage { From = new MailAddress(from, fromName), Subject = subject, Body = text };
        message.To.Add(to);
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(html, null, "text/html"));
        using var smtp = new SmtpClient(host, port) { EnableSsl = true, Credentials = new NetworkCredential(login, password), Timeout = 15000 };
        try
        {
            await smtp.SendMailAsync(message, ct);
            logger.LogInformation("Brevo SMTP accepted the email \"{Subject}\"", subject);
        }
        catch (SmtpException ex)
        {
            logger.LogError("Brevo SMTP refused the email ({Status}): {Message}", ex.StatusCode, ex.Message);
        }
    }

    private async Task SendApiAsync(string? from, string fromName, string apiKey, string to, string subject, string html, string text, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
        {
            Content = JsonContent.Create(new
            {
                sender = new { name = fromName, email = from },
                to = new[] { new { email = to } },
                subject,
                htmlContent = html,
                textContent = text,
            }),
        };
        if (!apiKey.StartsWith("xkeysib-", StringComparison.Ordinal))
            logger.LogWarning("Email:BrevoApiKey doesn't look like a Brevo API key (they start with \"xkeysib-\"). For an SMTP key (\"xsmtpsib-\"), use Email:SmtpPassword instead");
        request.Headers.Add("api-key", apiKey);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            logger.LogError("Brevo refused the email ({Status}): {Body}", (int)response.StatusCode, await response.Content.ReadAsStringAsync(ct));
        else
            logger.LogInformation("Brevo accepted the email \"{Subject}\" ({Status})", subject, (int)response.StatusCode);
    }
}
