using ChibiDink.Application.Contracts;
using ChibiDink.Application.Social;
using Microsoft.AspNetCore.Mvc;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api/friends")]
public sealed class FriendsController(IFriendService friends) : ControllerBase
{
    /// <summary>Your friend code, friends, and requests both ways.</summary>
    [HttpGet]
    public Task<FriendsDto> GetMine(CancellationToken ct) => friends.GetMineAsync(ct);

    /// <summary>Who a code belongs to (shown before you send the request).</summary>
    [HttpGet("code/{code}")]
    public Task<FriendActionDto> Lookup(string code, CancellationToken ct) => friends.LookupByCodeAsync(code, ct);

    /// <summary>Add a friend by their code.</summary>
    [HttpPost("code")]
    public Task<FriendActionDto> AddByCode(AddFriendRequest request, CancellationToken ct) => friends.AddByCodeAsync(request.Code, ct);

    /// <summary>Add a player you know (from their profile).</summary>
    [HttpPost("{userId:guid}")]
    public Task<FriendActionDto> Add(Guid userId, CancellationToken ct) => friends.AddAsync(userId, ct);

    [HttpPost("{userId:guid}/accept")]
    public Task<FriendActionDto> Accept(Guid userId, CancellationToken ct) => friends.AcceptAsync(userId, ct);

    /// <summary>Decline, cancel, or unfriend.</summary>
    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(Guid userId, CancellationToken ct)
    {
        await friends.RemoveAsync(userId, ct);
        return NoContent();
    }
}
