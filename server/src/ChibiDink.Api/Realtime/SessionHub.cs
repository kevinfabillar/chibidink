using Microsoft.AspNetCore.SignalR;
using ChibiDink.Application.Abstractions;
using ChibiDink.Application.Sessions;

namespace ChibiDink.Api.Realtime;

/// <summary>
/// Clients subscribe to a session and get a lightweight "SessionChanged" ping after every change.
/// They then refetch the session view, so the server remains the single source of truth.
/// </summary>
public sealed class SessionHub(ISessionRepository sessions, IServiceProvider services) : Hub
{
    public static string GroupFor(Guid sessionId) => $"session:{sessionId}";

    public async Task Subscribe(Guid sessionId)
    {
        if (!Guid.TryParse(Context.UserIdentifier, out var userId))
            throw new HubException("Sign in to continue.");
        // A live connection outlasts the check on its first request: a banned or revoked account is cut off here.
        if (await AccountAccess.IsRevokedAsync(Context.User!, services, CancellationToken.None))
        {
            Context.Abort();
            throw new HubException("Sign in to continue.");
        }
        var session = await sessions.FindAsync(sessionId, CancellationToken.None); // quick; finish even if the phone drops
        if (session?.FindParticipant(userId) is null)
            throw new HubException("Join this session first.");
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(sessionId));
    }

    public Task Unsubscribe(Guid sessionId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(sessionId));
}

internal sealed class SignalRSessionNotifier(IHubContext<SessionHub> hub, ISessionViewCache views) : ISessionNotifier
{
    public Task SessionChangedAsync(Guid sessionId, CancellationToken ct = default)
    {
        views.Invalidate(sessionId); // before the ping, so everyone's refetch sees the change
        return hub.Clients.Group(SessionHub.GroupFor(sessionId)).SendAsync("SessionChanged", sessionId, ct);
    }
}
