/** Same rule as the server: game to N, win by M, and past N it ends as soon as someone leads by M. */
export function scoreProblem(a: number, b: number, pointsToWin: number, winBy: number): string | null {
  const high = Math.max(a, b)
  const margin = high - Math.min(a, b)
  if (high < pointsToWin) return `A game ends when a team reaches ${pointsToWin}.`
  if (margin < winBy) return `The winner must lead by at least ${winBy}.`
  if (high > pointsToWin && margin !== winBy) return `Past ${pointsToWin}, the game ends as soon as a team leads by ${winBy}.`
  return null
}
