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
            aria-label={c}
            onClick={() => onChange(c)}
            className={clsx(
              'size-9 rounded-full border-2 transition',
              c.toLowerCase() === value.toLowerCase() ? 'scale-110 border-lime shadow-[0_0_14px_rgb(183_243_59/0.7)]' : 'border-white/15',
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  )
}
