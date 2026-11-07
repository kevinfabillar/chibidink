import { DEFAULT_APPEARANCE } from '../components/character/characterArt'
import type { Appearance, CosmeticItem, CosmeticSlot, Loadout, PlayerCard, Rarity } from '../api/types'

// How each cosmetic looks. The server owns prices, levels and ownership; the client owns appearance.
// An unknown id (e.g. a new server item) falls back to the starter look instead of breaking.

/** The themed gear an outfit gives the paddle character (hat, held item, cape, boots). */
export type Gear =
  | 'none' | 'chef' | 'cowboy' | 'ninja' | 'knight' | 'pirate' | 'wizard' | 'royal' | 'angel' | 'devil'
  | 'ranger' | 'viking' | 'cleric' | 'bard' | 'samurai'
  | 'dragon' | 'void'
  | 'princess' | 'fairy' | 'idol' | 'sakura'

/** Hair that comes with an outfit (the Glam sets). */
export interface Hair {
  color: string
  style: 'long' | 'bob' | 'pigtails' | 'bun'
  /** Hair-tie colour for pigtails. */
  accent?: string
}
export interface OutfitVisual {
  gear: Gear
  /** Cape or robe colour; null for no cape. */
  cape: string | null
  /** Bottom colour of the cape's gradient (defaults to a darker cape colour). */
  capeTo?: string
  /** Glove colour (default white; the knight wears steel). */
  glove?: string
  /** Sneaker trim; omitted = a darker body colour, as in the design. */
  sole?: string
  /** Premium skins: a big glow behind the character and twinkling sparkles. */
  premium?: { aura: string; sparkle: string }
  hair?: Hair
  shoes: string
  accent: string
  tag: 'Fun' | 'Adventure' | 'Fantasy' | 'Glam'
}

export type GlowKind = 'pulse' | 'spark' | 'flame' | 'wave'
export interface EffectVisual {
  color: string
  kind: GlowKind
}

export type AuraKind = 'pulse' | 'spark' | 'flame' | 'orbit' | 'nova' | 'celestial' | 'phoenix'
export interface AuraVisual {
  color: string
  accent: string
  kind: AuraKind
}

// Ids are kept from the original outfits so players keep what they own.
const outfits: Record<string, OutfitVisual> = {
  'basic-set': { gear: 'none', cape: null, shoes: '#F4F6F9', accent: '#B7F33B', tag: 'Fun' },
  'club-polo': { gear: 'chef', cape: null, shoes: '#F4F6F9', accent: '#E2E6EC', sole: '#E2E6EC', tag: 'Fun' },
  'sport-jacket': { gear: 'cowboy', cape: null, shoes: '#7A4A22', accent: '#C0392B', sole: '#C0392B', tag: 'Adventure' },
  'ace-set': { gear: 'ninja', cape: null, shoes: '#1A1D24', accent: '#8E1B2B', sole: '#8E1B2B', glove: '#2A2F3A', tag: 'Adventure' },
  'knight-set': { gear: 'knight', cape: '#B8323F', shoes: '#A7B0BE', accent: '#D9AE4A', tag: 'Fantasy' },
  'champion-set': { gear: 'pirate', cape: null, shoes: '#F4F6F9', accent: '#B8323F', tag: 'Adventure' },
  'cyber-set': { gear: 'wizard', cape: '#4C3A9E', shoes: '#4C3A9E', accent: '#FDE047', sole: '#FDE047', tag: 'Fantasy' },
  'angel-set': { gear: 'angel', cape: null, shoes: '#F4F6F9', accent: '#D9AE4A', sole: '#D9AE4A', tag: 'Fantasy' },
  'devil-set': { gear: 'devil', cape: null, shoes: '#7A1F24', accent: '#1A1D24', sole: '#1A1D24', glove: '#5E1522', tag: 'Fantasy' },
  'inferno-dragon': { gear: 'dragon', cape: null, glove: '#2A1A1E', shoes: '#F4F6F9', accent: '#FF7A3C', tag: 'Fantasy', premium: { aura: '#FF7A3C', sparkle: '#FFB347' } },
  'void-reaper': { gear: 'void', cape: '#241638', capeTo: '#030208', glove: '#120C1A', shoes: '#F4F6F9', accent: '#9B5CFF', tag: 'Fantasy', premium: { aura: '#5B24A8', sparkle: '#B48CFF' } },
  'legend-set': { gear: 'royal', cape: '#A3162B', shoes: '#D9AE4A', accent: '#D9AE4A', sole: '#D9AE4A', tag: 'Fantasy' },
  'ranger-set': { gear: 'ranger', cape: '#5E9A55', capeTo: '#24461F', glove: '#8A5E38', shoes: '#F4F6F9', accent: '#D9AE4A', tag: 'Adventure' },
  'viking-set': { gear: 'viking', cape: '#9A6B42', capeTo: '#4A2F1A', glove: '#8A5E38', shoes: '#F4F6F9', accent: '#D9AE4A', tag: 'Adventure' },
  'cleric-set': { gear: 'cleric', cape: '#FFFFFF', capeTo: '#C9BFA8', shoes: '#F4F6F9', accent: '#D9AE4A', tag: 'Fantasy' },
  'bard-set': { gear: 'bard', cape: '#3BA3A0', capeTo: '#1E5F5D', shoes: '#F4F6F9', accent: '#E6C46A', tag: 'Fun' },
  'princess-set': { gear: 'princess', cape: null, shoes: '#F59AC7', sole: '#D9AE4A', accent: '#FF5CA8', tag: 'Glam', hair: { color: '#F2C14E', style: 'long' } },
  'fairy-set': { gear: 'fairy', cape: null, shoes: '#7CCB8A', sole: '#3E8F57', accent: '#FFB3C7', tag: 'Glam', hair: { color: '#C9A7F0', style: 'bob' } },
  'idol-set': { gear: 'idol', cape: null, shoes: '#F4F6F9', sole: '#FF5CA8', accent: '#B66CF2', tag: 'Glam', hair: { color: '#FF8CC6', style: 'pigtails', accent: '#B66CF2' } },
  'sakura-set': { gear: 'sakura', cape: null, shoes: '#F4F6F9', sole: '#C2334D', accent: '#C2334D', tag: 'Glam', hair: { color: '#2A2230', style: 'bun' } },
  'samurai-set': { gear: 'samurai', cape: null, glove: '#2A2F3A', shoes: '#F4F6F9', accent: '#D9AE4A', tag: 'Adventure' },
}

const effects: Record<string, EffectVisual> = {
  'green-pulse': { color: '#B7F33B', kind: 'pulse' },
  'electric-spark': { color: '#A855F7', kind: 'spark' },
  flame: { color: '#FB923C', kind: 'flame' },
  aqua: { color: '#22D3EE', kind: 'wave' },
}

const auras: Record<string, AuraVisual> = {
  'aura-green-pulse': { color: '#B7F33B', accent: '#ECFCCB', kind: 'pulse' },
  'aura-electric': { color: '#A855F7', accent: '#E9D5FF', kind: 'spark' },
  'aura-flame': { color: '#FB923C', accent: '#FDE68A', kind: 'flame' },
  'aura-champion': { color: '#A348FA', accent: '#FDE68A', kind: 'orbit' },
  'aura-nova': { color: '#FBBF24', accent: '#FFF7D6', kind: 'nova' },
  'aura-celestial': { color: '#3D6FE0', accent: '#FDE68A', kind: 'celestial' },
  'aura-phoenix': { color: '#FF6A2C', accent: '#FFD27A', kind: 'phoenix' },
}

export const STARTER_OUTFIT = 'basic-set'

export const outfitVisual = (id?: string | null) => outfits[id ?? ''] ?? outfits[STARTER_OUTFIT]
export const effectVisual = (id?: string | null): EffectVisual | null => (id ? (effects[id] ?? null) : null)
export const auraVisual = (id?: string | null): AuraVisual | null => (id ? (auras[id] ?? null) : null)

/** Everything needed to draw one character. */
export interface CharacterLook {
  appearance: Appearance
  outfit: OutfitVisual
  effect: EffectVisual | null
  aura: AuraVisual | null
}

export function lookFrom(appearance: Appearance, loadout?: Partial<Loadout> | null): CharacterLook {
  return {
    appearance,
    outfit: outfitVisual(loadout?.outfitId),
    effect: effectVisual(loadout?.effectId),
    aura: auraVisual(loadout?.auraId),
  }
}

export const lookOf = (p: Pick<PlayerCard, 'appearance' | 'loadout'>) => lookFrom(p.appearance, p.loadout)

/** The mascot look (the design's default paddle) for screens without a signed-in player. */
export const mascotLook = lookFrom(DEFAULT_APPEARANCE)

/** The same character with one item swapped in, for previews. `null` id removes an effect or aura. */
export function lookWith(base: CharacterLook, slot: CosmeticSlot, itemId: string | null): CharacterLook {
  switch (slot) {
    case 'Outfit':
      return { ...base, outfit: outfitVisual(itemId) }
    case 'Paddle':
      return base // paddles are retired; the character no longer holds one
    case 'PaddleEffect':
      return { ...base, effect: effectVisual(itemId) }
    case 'CharacterAura':
      return { ...base, aura: auraVisual(itemId) }
    case 'Background':
      return base // drawn behind the character, not on it
    case 'Nameplate':
      return base // on the name, not the character
  }
}

export const rarityColor: Record<Rarity, string> = {
  Common: '#B4B9C3',
  Uncommon: '#34D399',
  Rare: '#8B9CFF',
  Epic: '#D17BFF',
  Legendary: '#FBBF24',
  Mythic: '#FF6B4A',
}

export const slotInfo: Record<CosmeticSlot, { title: string; path: string }> = {
  Outfit: { title: 'Outfits', path: '/items/outfits' },
  Paddle: { title: 'Paddles', path: '/items' },
  PaddleEffect: { title: 'Effects', path: '/items/effects' },
  Background: { title: 'Backgrounds', path: '/items/backgrounds' },
  CharacterAura: { title: 'Auras', path: '/items/auras' },
  Nameplate: { title: 'Name Skins', path: '/items/names' },
}

/** Filter tag shown in the outfit grid ("Fun", "Adventure", "Fantasy"). */
export function itemTag(item: Pick<CosmeticItem, 'id' | 'slot' | 'rarity'>): string {
  if (item.slot === 'Outfit') return outfitVisual(item.id).tag
  return 'All'
}

export const rarityRank: Record<Rarity, number> = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5, Mythic: 6 }
