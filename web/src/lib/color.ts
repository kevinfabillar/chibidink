/** Lighten (amount > 0) or darken (amount < 0) a #RRGGBB color. amount is -1..1. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const target = amount < 0 ? 0 : 255
    return Math.round(c + (target - c) * Math.abs(amount))
  })
  return '#' + channels.map((c) => c.toString(16).padStart(2, '0')).join('')
}
