// Small game icons used across the UI (lucide covers the generic ones).

export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="#F59E0B" stroke="#92400E" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.6" fill="#FBBF24" stroke="#FDE68A" strokeWidth="1" />
      <path d="M12 7.2 L13.4 10.4 L16.8 10.6 L14.2 12.8 L15 16.2 L12 14.4 L9 16.2 L9.8 12.8 L7.2 10.6 L10.6 10.4 Z" fill="#FFF7D6" />
    </svg>
  )
}

export function CrossedPaddlesIcon({ className }: { className?: string }) {
  const paddle = (
    <g>
      <rect x="10.4" y="12" width="3.2" height="9" rx="1.4" fill="currentColor" />
      <rect x="6.5" y="1.5" width="11" height="12" rx="5" fill="currentColor" />
    </g>
  )
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g transform="rotate(-35 12 12)">{paddle}</g>
      <g transform="rotate(35 12 12)">{paddle}</g>
      <circle cx="12" cy="20.5" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function PaddleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <g transform="rotate(-30 12 12)">
        <rect x="6.5" y="1.5" width="11" height="13" rx="5" />
        <path d="M10.4 14.5 h3.2 v7 h-3.2 Z" />
      </g>
      <circle cx="19" cy="18.5" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ChestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      <path d="M4 18 Q4 4 24 4 Q44 4 44 18 Z" fill="#B7791F" stroke="#5C3A0A" strokeWidth="1.5" />
      <rect x="4" y="18" width="40" height="19" rx="3" fill="#8B5A2B" stroke="#5C3A0A" strokeWidth="1.5" />
      <path d="M12 6 V37 M36 6 V37" stroke="#FBBF24" strokeWidth="3" />
      <path d="M4 18 H44" stroke="#FBBF24" strokeWidth="2.5" />
      <rect x="20" y="15" width="8" height="10" rx="2" fill="#FDE68A" stroke="#92400E" strokeWidth="1" />
      <circle cx="24" cy="20" r="1.4" fill="#92400E" />
      <path d="M8 2 l1.5 3 M40 1 l-1.2 3.4 M24 0 v3" stroke="#FDE68A" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
