using ChibiDink.Application.Contracts;
using ChibiDink.Application.Cosmetics;
using ChibiDink.Domain.Cosmetics;
using Microsoft.AspNetCore.Mvc;

namespace ChibiDink.Api.Controllers;

[ApiController]
[Route("api/cosmetics")]
public sealed class CosmeticsController(ICosmeticsService cosmetics) : ControllerBase
{
    /// <summary>The catalog with the signed-in player's ownership, equipped items, coins, and level.</summary>
    [HttpGet]
    public Task<CosmeticsDto> Get(CancellationToken ct) => cosmetics.GetMineAsync(ct);

    [HttpPost("{itemId}/purchase")]
    public Task<IActionResult> Purchase(string itemId, CancellationToken ct) => Done(cosmetics.PurchaseAsync(itemId, ct));

    [HttpPost("{itemId}/equip")]
    public Task<IActionResult> Equip(string itemId, CancellationToken ct) => Done(cosmetics.EquipAsync(itemId, ct));

    [HttpPost("slots/{slot}/unequip")]
    public Task<IActionResult> Unequip(CosmeticSlot slot, CancellationToken ct) => Done(cosmetics.UnequipAsync(slot, ct));

    private async Task<IActionResult> Done(Task work)
    {
        await work;
        return NoContent();
    }
}
