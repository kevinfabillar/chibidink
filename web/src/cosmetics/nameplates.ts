/** How each premium name skin looks. The server only knows ids, prices and ownership. */
export type ParticleKind = 'flame' | 'snow' | 'spark' | 'star' | 'petal' | 'bubble' | 'glint'

/** What the border itself does: burns, freezes, drips, crackles. */
export type EdgeKind = 'fire' | 'ice' | 'slime' | 'lightning'

export interface NameplateVisual {
  /** Lettering: a gradient that slides across the name. */
  text: string[]
  /** The pill behind the name. */
  background: string
  /** The border ring: these colors spin around the tag. */
  ring: string[]
  glow: string
  edge?: EdgeKind
  particle?: ParticleKind
  particleColor?: string
  /** Icon in front of the name. */
  badge?: 'crown' | 'zap' | 'flame' | 'snowflake'
  /** The whole tag flickers like a neon sign. */
  flicker?: boolean
}

const NAMEPLATES: Record<string, NameplateVisual> = {
  'name-neon': {
    text: ['#22D3EE', '#E879F9', '#A5F3FC', '#22D3EE'],
    background: 'linear-gradient(135deg, #0B1026, #1A0B2E)',
    ring: ['#22D3EE', '#E879F9', '#22D3EE', '#E879F9', '#22D3EE'],
    glow: '#22D3EE',
    flicker: true,
  },
  'name-toxic': {
    text: ['#BEF264', '#4ADE80', '#FDE047', '#BEF264'],
    background: 'linear-gradient(135deg, #0C1A0B, #14290F)',
    ring: ['#A3E635', '#22C55E', '#FDE047', '#A3E635'],
    glow: '#84CC16',
    edge: 'slime',
    particle: 'bubble',
    particleColor: '#A3E635',
  },
  'name-sakura': {
    text: ['#FDF2F8', '#F9A8D4', '#F472B6', '#FDF2F8'],
    background: 'linear-gradient(135deg, #2A0E1F, #3B1230)',
    ring: ['#F9A8D4', '#FDF2F8', '#F472B6', '#F9A8D4'],
    glow: '#F472B6',
    particle: 'petal',
    particleColor: '#F9A8D4',
  },
  'name-inferno': {
    text: ['#FEF08A', '#FB923C', '#EF4444', '#FDE047'],
    background: 'linear-gradient(135deg, #2A0A04, #4A1206)',
    ring: ['#FDE047', '#F97316', '#DC2626', '#F97316', '#FDE047'],
    glow: '#F97316',
    edge: 'fire',
    badge: 'flame',
  },
  'name-frost': {
    text: ['#FFFFFF', '#BAE6FD', '#38BDF8', '#FFFFFF'],
    background: 'linear-gradient(135deg, #071B2E, #0C2D48)',
    ring: ['#FFFFFF', '#7DD3FC', '#0EA5E9', '#BAE6FD', '#FFFFFF'],
    glow: '#38BDF8',
    edge: 'ice',
    particle: 'snow',
    particleColor: '#E0F2FE',
    badge: 'snowflake',
  },
  'name-thunder': {
    text: ['#FFFFFF', '#FDE047', '#FACC15', '#FFFFFF'],
    background: 'linear-gradient(135deg, #0D1233, #1E1B4B)',
    ring: ['#FACC15', '#818CF8', '#FFFFFF', '#FACC15'],
    glow: '#818CF8',
    edge: 'lightning',
    badge: 'zap',
  },
  'name-galaxy': {
    text: ['#F0ABFC', '#A5B4FC', '#C4B5FD', '#F0ABFC'],
    background: 'radial-gradient(circle at 30% 20%, #3B1D6E, #0B0420 70%)',
    ring: ['#8B5CF6', '#EC4899', '#22D3EE', '#8B5CF6'],
    glow: '#8B5CF6',
    particle: 'star',
    particleColor: '#FFFFFF',
  },
  'name-gold': {
    text: ['#FEF3C7', '#FCD34D', '#B45309', '#FDE68A', '#FEF3C7'],
    background: 'linear-gradient(135deg, #2B1A03, #3F2A06)',
    ring: ['#FEF3C7', '#FBBF24', '#92400E', '#FBBF24', '#FEF3C7'],
    glow: '#F59E0B',
    particle: 'glint',
    particleColor: '#FEF3C7',
    badge: 'crown',
  },
}

export function nameplateVisual(id: string | null | undefined): NameplateVisual | null {
  return (id && NAMEPLATES[id]) || null
}
