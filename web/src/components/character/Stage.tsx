import type { PlayerCard } from '../../api/types'
import { lookOf } from '../../cosmetics/visuals'
import { useSvgIds } from '../../lib/svgIds'
import { Avatar3D, type Avatar3DProps } from './Avatar3D'

/** A player's 3D character from their card (appearance + equipped items). */
export function PlayerAvatar({ player, ...rest }: { player: Pick<PlayerCard, 'appearance' | 'loadout'> } & Omit<Avatar3DProps, 'look'>) {
  return <Avatar3D look={lookOf(player)} {...rest} />
}

/** Glowing display disc the character stands on. */
export function Pedestal({ className, tone = 'grape' }: { className?: string; tone?: 'grape' | 'lime' }) {
  const ids = useSvgIds('disc', 'glow')
  const ring = tone === 'lime' ? '#B7F33B' : '#A348FA'
  return (
    <svg viewBox="0 0 200 52" className={className} aria-hidden>
      <defs>
        <radialGradient id={ids.disc} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3A2A5E" />
          <stop offset="100%" stopColor="#0B0F18" />
        </radialGradient>
        <filter id={ids.glow} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse cx={100} cy={28} rx={92} ry={18} fill={ring} opacity={0.45} filter={`url(#${ids.glow})`} />
      <path d="M10 24 V30 C10 40 50 48 100 48 C150 48 190 40 190 30 V24 Z" fill="#0B0F18" />
      <ellipse cx={100} cy={24} rx={90} ry={17} fill={`url(#${ids.disc})`} />
      <ellipse cx={100} cy={24} rx={90} ry={17} fill="none" stroke={ring} strokeWidth={2.6} />
      <ellipse cx={100} cy={22} rx={64} ry={10.5} fill="none" stroke={ring} strokeWidth={1.2} opacity={0.55} />
    </svg>
  )
}

/** Purple locker-room backdrop behind the character on the My Character screen. */
export function LockerRoom({ className }: { className?: string }) {
  const ids = useSvgIds('wall', 'floor', 'light')
  const lockers = [0, 1, 2, 3, 4, 5, 6]
  return (
    <svg viewBox="0 0 320 380" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={ids.wall} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A1B4C" />
          <stop offset="100%" stopColor="#171030" />
        </linearGradient>
        <linearGradient id={ids.floor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1C1336" />
          <stop offset="100%" stopColor="#0C0A18" />
        </linearGradient>
        <radialGradient id={ids.light} cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#A348FA" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A348FA" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="380" fill={`url(#${ids.wall})`} />
      {lockers.map((i) => {
        const x = 8 + i * 44
        return (
          <g key={i} opacity={i === 3 ? 0.35 : 0.75}>
            <rect x={x} y={44} width={40} height={210} rx={4} fill="#241842" stroke="#3B2A66" strokeWidth={1.5} />
            <path d={`M${x + 8} 62 h24 M${x + 8} 68 h24 M${x + 8} 74 h24`} stroke="#3B2A66" strokeWidth={2} />
            <rect x={x + 30} y={140} width={4} height={18} rx={2} fill="#4C3A80" />
          </g>
        )
      })}
      <rect y="254" width="320" height="126" fill={`url(#${ids.floor})`} />
      <path d="M0 254 H320" stroke="#3B2A66" strokeWidth={2} />
      <rect x="20" y="230" width="280" height="10" rx="3" fill="#2E2152" />
      <ellipse cx="160" cy="150" rx="170" ry="150" fill={`url(#${ids.light})`} />
      {/* gym bag */}
      <g transform="translate(18 278)">
        <path d="M14 12 Q30 -6 46 12" stroke="#7A5A10" strokeWidth={4} fill="none" />
        <rect x="0" y="10" width="62" height="34" rx="14" fill="#E3B82E" />
        <rect x="0" y="22" width="62" height="6" fill="#B88F14" />
        <circle cx="31" cy="25" r="5" fill="#2A1B4C" />
      </g>
    </svg>
  )
}
