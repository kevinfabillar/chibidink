import { useId } from 'react'

/** Unique ids for gradients, clips and filters, so many SVGs can share a page without clashing. */
export function useSvgIds<K extends string>(...names: K[]): Record<K, string> {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '')
  return Object.fromEntries(names.map((name) => [name, `${name}${base}`])) as Record<K, string>
}
