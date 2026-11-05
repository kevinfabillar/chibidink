using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ChibiDink.Api.Infrastructure;
using ChibiDink.Api.Matchmaking;
using ChibiDink.Api.Realtime;
using ChibiDink.Application;
using ChibiDink.Application.Abstractions;
using ChibiDink.Infrastructure;
using ChibiDink.Infrastructure.Identity;
using ChibiDink.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

// ---- Layers ---------------------------------------------------------------------------------
services.AddApplication();
services.AddInfrastructure(builder.Configuration);

// ---- Identity & auth ------------------------------------------------------------------------
services.AddIdentityApiEndpoints<AppUser>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.Password.RequiredLength = 8;
        o.Password.RequireNonAlphanumeric = false;
        o.Lockout.MaxFailedAccessAttempts = 8;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>();

// Password reset links work for 1 hour.
services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromHours(1));
services.AddHttpClient<IEmailSender, BrevoEmailSender>(c => c.Timeout = TimeSpan.FromSeconds(15));

services.Configure<BearerTokenOptions>(IdentityConstants.BearerScheme, o =>
{
    o.BearerTokenExpiration = TimeSpan.FromDays(7);
    o.Events = new BearerTokenEvents
    {
        // Browsers can't set headers on WebSocket connections, so SignalR sends the token in the query string.
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
    };
});

services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Every API call: generous for normal play, but stops one account (or script) from flooding the server.
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        if (!ctx.Request.Path.StartsWithSegments("/api")) return RateLimitPartition.GetNoLimiter("site");
        var who = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? "ip:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        return RateLimitPartition.GetTokenBucketLimiter(who, _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 120,
            TokensPerPeriod = 10,
            ReplenishmentPeriod = TimeSpan.FromSeconds(1),
            QueueLimit = 20,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        });
    });
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        // A whole venue often shares one Wi-Fi address, so allow a crowd to sign in at once;
        // extra requests wait their turn instead of failing.
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 100,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        }));
});

// ---- Web adapters ---------------------------------------------------------------------------
services.AddHttpContextAccessor();
services.AddScoped<ICurrentUser, HttpCurrentUser>();
services.AddSingleton<ISessionNotifier, SignalRSessionNotifier>();
services.AddSingleton<MatchmakingInbox>();
services.AddSingleton<IMatchmakingScheduler>(sp => sp.GetRequiredService<MatchmakingInbox>());
services.AddHostedService<MatchmakingWorker>();
services.AddHostedService<ChibiDink.Api.Infrastructure.SessionCleanupWorker>();

services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // A malformed request gets "The input was not valid.", not .NET's parser wording (types, paths, line numbers).
        o.AllowInputFormatterExceptionMessages = false;
    });
services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Every error is problem+json with a user-safe message and a trace id (for matching server logs) and
// nothing else: no exception type, stack trace, SQL or connection details.
services.AddProblemDetails(o => o.CustomizeProblemDetails = ctx =>
{
    foreach (var key in ctx.ProblemDetails.Extensions.Keys.Where(k => k != "traceId" && k != "errors").ToList())
        ctx.ProblemDetails.Extensions.Remove(key);
    if (ctx.ProblemDetails.Status >= 500)
    {
        ctx.ProblemDetails.Title = "Unexpected error";
        ctx.ProblemDetails.Detail = "Something went wrong. Please try again.";
    }
});
services.AddExceptionHandler<ProblemExceptionHandler>();

// Compress API answers (JSON) and the website files. A session update sent to 60 phones is about 30 KB
// each uncompressed and about 5 KB compressed, which matters on hosts that count bandwidth (Render).
services.AddResponseCompression(o =>
{
    o.EnableForHttps = true; // answers carry no secrets worth guessing (tokens travel in headers)
    o.Providers.Add<BrotliCompressionProvider>();
    o.Providers.Add<GzipCompressionProvider>();
    o.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/problem+json"]);
});
services.Configure<BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
services.Configure<GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);

var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// Behind Caddy on the server: trust its X-Forwarded-* headers so the app sees each phone's real IP
// (the sign-in rate limit is per IP) and knows the request was HTTPS. Only Caddy can reach the app.
var behindProxy = builder.Configuration.GetValue<bool>("Proxy:TrustForwardedHeaders");
if (behindProxy)
    services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
    });

var app = builder.Build();
if (behindProxy) app.UseForwardedHeaders();
app.UseResponseCompression();

// ---- Pipeline -------------------------------------------------------------------------------
// A phone that drops off mid-request (page change, screen lock, weak Wi-Fi) shouldn't cancel the
// work: a score being saved must finish either way. So API requests run to completion (with a time
// limit) instead of following the client's connection. Live-update connections still do, since
// that's how SignalR notices a phone has gone.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/hubs"))
    {
        await next();
        return;
    }
    using var limit = new CancellationTokenSource(TimeSpan.FromSeconds(60));
    context.RequestAborted = limit.Token;
    await next();
});
app.UseExceptionHandler();
app.UseStatusCodePages(); // bare 404/405/415 etc. also get a problem+json body

// The website (built React app in wwwroot) is served by the API itself in production, so the site,
// /api and /hubs share one address. Hashed files under /assets never change, so phones can cache them.
var siteFiles = new StaticFileOptions
{
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl =
        ctx.Context.Request.Path.StartsWithSegments("/assets") ? "public, max-age=31536000, immutable" : "no-cache",
};
app.UseStaticFiles(siteFiles);
app.UseCors();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SessionHub>("/hubs/session");
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
// Unknown /api paths are real 404s; every other path is a page of the app (React Router handles it).
app.Map("/api/{**rest}", () => Results.NotFound()).AllowAnonymous();
app.MapFallbackToFile("index.html", siteFiles).AllowAnonymous(); // always the latest index.html

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    await SeedRolesAsync(scope.ServiceProvider);

    // Demo accounts have a public password, so never seed them outside Development.
    if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("Database:SeedDemoData"))
        await ActivatorUtilities.CreateInstance<DemoDataSeeder>(scope.ServiceProvider).SeedAsync();
}
if (!app.Environment.IsDevelopment())
{
    // If this database was also used for development, its demo accounts (public password) must not sign in.
    await using var scope = app.Services.CreateAsyncScope();
    await DemoDataSeeder.LockDemoAccountsAsync(scope.ServiceProvider);
}

app.Run();

static async Task SeedRolesAsync(IServiceProvider sp)
{
    var roles = sp.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    foreach (var role in new[] { AppUser.Roles.Administrator, AppUser.Roles.Guest })
        if (!await roles.RoleExistsAsync(role))
            await roles.CreateAsync(new IdentityRole<Guid>(role));
}

public partial class Program;
