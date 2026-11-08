/** How each name skin looks. The server only knows ids, prices and ownership. */
export type ParticleKind = 'ember' | 'snow' | 'star' | 'petal' | 'bubble' | 'glint'

/**
 * Mythic skins: the border itself is made of an element. Fire burns all around the name, ice forms shards
 * and icicles, lightning crackles along the outline, a comet orbits a cosmic ring, gold becomes a crown frame.
 */
export type BorderKind = 'fire' | 'ice' | 'lightning' | 'cosmic' | 'gold'

export interface NameplateVisual {
  /** Lettering gradient. */
  text: string[]
  /** The plate behind the name. */
  background: string
  /** The border ring's colors. */
  ring: string[]
  glow: string
  /** Mythic only: what the border is made of. */
  border?: BorderKind
  particle?: ParticleKind
  particleColor?: string
  /** The whole tag flickers like a neon sign. */
  flicker?: boolean
  /** Slime dripping off the bottom edge. */
  drips?: boolean
  /** legendary: a hexagon badge with a light sweeping across. mythic: an elemental border, orbiting colors and a ripple. */
  tier?: 'legendary' | 'mythic'
}

const NAMEPLATES: Record<string, NameplateVisual> = {
  // Common: a clean, single-color glowing border.
  'name-chalk': {
    text: ['#FFFFFF', '#E2E8F0', '#FFFFFF'],
    background: 'linear-gradient(135deg, #1E2533, #283142)',
    ring: ['#F8FAFC', '#CBD5E1', '#F8FAFC'],
    glow: '#CBD5E1',
  },
  'name-grass': {
    text: ['#ECFCCB', '#86EFAC', '#ECFCCB'],
    background: 'linear-gradient(135deg, #0F2417, #163320)',
    ring: ['#4ADE80', '#22C55E', '#4ADE80'],
    glow: '#22C55E',
  },
  // Rare: a two-tone gradient border.
  'name-ocean': {
    text: ['#E0F2FE', '#67E8F9', '#93C5FD', '#E0F2FE'],
    background: 'linear-gradient(135deg, #082032, #0B2D4A)',
    ring: ['#38BDF8', '#2DD4BF', '#3B82F6', '#38BDF8'],
    glow: '#38BDF8',
  },
  'name-sunset': {
    text: ['#FFEDD5', '#FDBA74', '#F9A8D4', '#FFEDD5'],
    background: 'linear-gradient(135deg, #2B1220, #3A1626)',
    ring: ['#FB923C', '#F472B6', '#FB923C'],
    glow: '#FB7185',
  },
  // Epic: a gradient border with a few twinkles.
  'name-amethyst': {
    text: ['#F5F3FF', '#C4B5FD', '#A78BFA', '#F5F3FF'],
    background: 'linear-gradient(135deg, #1C1033, #2A1650)',
    ring: ['#C084FC', '#7C3AED', '#E9D5FF', '#C084FC'],
    glow: '#A855F7',
    particle: 'star',
    particleColor: '#E9D5FF',
  },
  'name-ruby': {
    text: ['#FFE4E6', '#FDA4AF', '#F43F5E', '#FFE4E6'],
    background: 'linear-gradient(135deg, #2A0710, #3F0A18)',
    ring: ['#FB7185', '#BE123C', '#FECDD3', '#FB7185'],
    glow: '#F43F5E',
    particle: 'glint',
    particleColor: '#FFE4E6',
  },
  // Legendary: a hexagon badge with a light sweeping across.
  'name-neon': {
    tier: 'legendary',
    flicker: true,
    text: ['#A5F3FC', '#F5D0FE', '#67E8F9', '#A5F3FC'],
    background: 'linear-gradient(135deg, #070B1F, #140824)',
    ring: ['#22D3EE', '#22D3EE'],
    glow: '#22D3EE',
  },
  'name-toxic': {
    tier: 'legendary',
    drips: true,
    text: ['#ECFCCB', '#BEF264', '#FDE047', '#ECFCCB'],
    background: 'linear-gradient(135deg, #0C1A0B, #14290F)',
    ring: ['#BEF264', '#65A30D', '#A3E635', '#4D7C0F', '#BEF264'],
    glow: '#84CC16',
    particle: 'bubble',
    particleColor: '#BEF264',
  },
  'name-sakura': {
    tier: 'legendary',
    text: ['#FDF2F8', '#F9A8D4', '#F472B6', '#FDF2F8'],
    background: 'linear-gradient(135deg, #2A0E1F, #3B1230)',
    ring: ['#F9A8D4', '#FDF2F8', '#F472B6', '#F9A8D4'],
    glow: '#F472B6',
    particle: 'petal',
    particleColor: '#F9A8D4',
  },
  // Mythic: an elemental border, orbiting colors and an outward ripple.
  'name-inferno': {
    tier: 'mythic',
    border: 'fire',
    text: ['#FEF9C3', '#FDE047', '#FB923C', '#FEF08A'],
    background: 'linear-gradient(135deg, #2A0A04, #4A1206)',
    ring: ['#FDE047', '#F97316', '#DC2626', '#F97316', '#FDE047'],
    glow: '#F97316',
    particle: 'ember',
    particleColor: '#FDBA74',
  },
  'name-frost': {
    tier: 'mythic',
    border: 'ice',
    text: ['#FFFFFF', '#BAE6FD', '#38BDF8', '#FFFFFF'],
    background: 'linear-gradient(135deg, #071B2E, #0C2D48)',
    ring: ['#FFFFFF', '#7DD3FC', '#0EA5E9', '#BAE6FD', '#FFFFFF'],
    glow: '#38BDF8',
    particle: 'snow',
    particleColor: '#E0F2FE',
  },
  'name-thunder': {
    tier: 'mythic',
    border: 'lightning',
    text: ['#FFFFFF', '#FDE047', '#FACC15', '#FFFFFF'],
    background: 'linear-gradient(135deg, #0D1233, #1E1B4B)',
    ring: ['#FACC15', '#818CF8', '#FFFFFF', '#FACC15'],
    glow: '#818CF8',
  },
  'name-galaxy': {
    tier: 'mythic',
    border: 'cosmic',
    text: ['#F0ABFC', '#A5B4FC', '#C4B5FD', '#F0ABFC'],
    background: 'radial-gradient(circle at 30% 20%, #3B1D6E, #0B0420 70%)',
    ring: ['#8B5CF6', '#EC4899', '#22D3EE', '#8B5CF6'],
    glow: '#8B5CF6',
    particle: 'star',
    particleColor: '#FFFFFF',
  },
  'name-gold': {
    tier: 'mythic',
    border: 'gold',
    text: ['#FEF3C7', '#FCD34D', '#B45309', '#FDE68A', '#FEF3C7'],
    background: 'linear-gradient(135deg, #2B1A03, #3F2A06)',
    ring: ['#FEF3C7', '#FBBF24', '#92400E', '#FBBF24', '#FEF3C7'],
    glow: '#F59E0B',
    particle: 'glint',
    particleColor: '#FEF3C7',
  },
}

export function nameplateVisual(id: string | null | undefined): NameplateVisual | null {
  return (id && NAMEPLATES[id]) || null
}
