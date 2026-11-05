// Snapshot cache and render queue. Kept free of three.js so pages can check the cache
// without loading the 3D bundle.

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()

export const peekSnapshot = (key: string) => cache.get(key)

/** Renders one snapshot at a time, yielding between them so the page stays responsive. */
export function requestSnapshot(key: string, render: () => Promise<string>): Promise<string> {
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const inFlight = pending.get(key)
  if (inFlight) return inFlight

  const job = queue
    .then(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
    .then(render)
    .then((url) => {
      cache.set(key, url)
      return url
    })
    .finally(() => pending.delete(key))
  queue = job.catch(() => undefined)
  pending.set(key, job)
  return job
}
