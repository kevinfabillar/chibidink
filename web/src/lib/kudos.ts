import { Feather, Flame, Gauge, Hand, Handshake, HeartHandshake, History, Shield, Slice, Smile, Swords, Target, Zap, type LucideIcon } from 'lucide-react'
import type { KudosKind } from '../api/types'

export interface KudosInfo {
  kind: KudosKind
  label: string
  /** What it's for, shown under the choices. */
  hint: string
  group: 'skill' | 'character'
  icon: LucideIcon
  color: string
}

/** Skills a player showed in the game, then what they were like to play with. */
export const KUDOS: KudosInfo[] = [
  { kind: 'Dinks', label: 'Dinks', hint: 'Soft, patient dinks at the kitchen line', group: 'skill', icon: Feather, color: '#34D399' },
  { kind: 'Drops', label: 'Drops', hint: 'Third-shot drops that landed in the kitchen', group: 'skill', icon: Target, color: '#38BDF8' },
  { kind: 'Volleys', label: 'Volleys', hint: 'Quick hands in the volley battles', group: 'skill', icon: Hand, color: '#60A5FA' },
  { kind: 'Serves', label: 'Serves', hint: 'Deep, steady serves', group: 'skill', icon: Flame, color: '#FB923C' },
  { kind: 'Smashes', label: 'Smashes', hint: 'Put-aways and overheads', group: 'skill', icon: Swords, color: '#F43F5E' },
  { kind: 'Defense', label: 'Defense', hint: 'Gets and blocks that kept the rally alive', group: 'skill', icon: Shield, color: '#A78BFA' },
  { kind: 'Drives', label: 'Drives', hint: 'Fast, flat drives that put the pressure on', group: 'skill', icon: Gauge, color: '#EF4444' },
  { kind: 'Slices', label: 'Slices', hint: 'Low, skidding slices with nasty spin', group: 'skill', icon: Slice, color: '#C084FC' },
  { kind: 'Resets', label: 'Resets', hint: 'Soft resets that turned defense into a neutral rally', group: 'skill', icon: History, color: '#D9AE4A' },
  { kind: 'SpeedUps', label: 'Speed-ups', hint: 'Lightning-fast speed-ups out of the dink rally', group: 'skill', icon: Zap, color: '#FACC15' },
  { kind: 'GoodSport', label: 'Good sport', hint: 'Fair line calls and a great attitude', group: 'character', icon: Handshake, color: '#B7F33B' },
  { kind: 'GreatPartner', label: 'Great partner', hint: 'Talked, covered and lifted the team', group: 'character', icon: HeartHandshake, color: '#22D3EE' },
  { kind: 'FunToPlayWith', label: 'Fun to play with', hint: 'Made the game a good time', group: 'character', icon: Smile, color: '#F472B6' },
]

export const kudosInfo = (kind: KudosKind) => KUDOS.find((k) => k.kind === kind)!
