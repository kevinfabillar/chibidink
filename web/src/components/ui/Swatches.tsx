import clsx from 'clsx'

/** Round colour picker (skin, hair, eye and headwear colours). */
export function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-white/85">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={c.toLowerCase() === value.toLowerCase()}
            aria-label={c || 'Match outfit'}
            title={c ? undefined : 'Match outfit'}
            onClick={() => onChange(c)}
            className={clsx(
              'grid size-9 place-items-center rounded-full border-2 text-[10px] font-bold text-white/80 transition',
              c.toLowerCase() === (value ?? '').toLowerCase() ? 'scale-110 border-lime shadow-[0_0_14px_rgb(183_243_59/0.7)]' : 'border-white/15',
            )}
            // '' = "use the default" (e.g. the outfit's own shoes): a split swatch marked Auto
            style={{ background: c || 'linear-gradient(135deg, #F4F6F9 50%, #2E333E 50%)' }}
          >
            {!c && <span className="rounded bg-ink/70 px-1">Auto</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
