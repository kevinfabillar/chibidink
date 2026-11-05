import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Dices, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { profileApi } from '../../api/api'
import type { Appearance, Profile } from '../../api/types'
import { Avatar3D } from '../../components/character/Avatar3D'
import {
  BODY_COLORS,
  BROW_STYLES,
  CHEEK_STYLES,
  DEFAULT_APPEARANCE,
  EDGE_COLORS,
  END_CAPS,
  END_CAP_COLORS,
  EYE_COLORS,
  EYE_STYLES,
  FACE_MARKS,
  GRIP_COLORS,
  GRIP_WRAPS,
  HANDLE_SHAPES,
  MOUTH_STYLES,
  withDefaults,
} from '../../components/character/characterArt'
import { Button } from '../../components/ui/Button'
import { ErrorNote } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { Swatches } from '../../components/ui/Swatches'
import { lookOf } from '../../cosmetics/visuals'

type Option = { id: string; label: string }
type Row = { key: keyof Appearance; label: string } & ({ colors: string[] } | { options: Option[] })

// Same sections and order as the "Sprout" character creator design.
const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Paddle',
    rows: [
      { key: 'bodyColor', label: 'Body color', colors: BODY_COLORS },
      { key: 'edgeColor', label: 'Edge guard', colors: EDGE_COLORS },
    ],
  },
  {
    title: 'Face',
    rows: [
      { key: 'eyeStyle', label: 'Eyes', options: EYE_STYLES },
      { key: 'eyeColor', label: 'Eye color', colors: EYE_COLORS },
      { key: 'browStyle', label: 'Brows', options: BROW_STYLES },
      { key: 'mouthStyle', label: 'Mouth', options: MOUTH_STYLES },
      { key: 'cheekStyle', label: 'Cheeks', options: CHEEK_STYLES },
      { key: 'faceMark', label: 'Face mark', options: FACE_MARKS },
    ],
  },
  {
    title: 'Handle',
    rows: [
      { key: 'gripColor', label: 'Grip color', colors: GRIP_COLORS },
      { key: 'gripWrap', label: 'Grip wrap', options: GRIP_WRAPS },
      { key: 'handleShape', label: 'Handle shape', options: HANDLE_SHAPES },
      { key: 'endCap', label: 'End cap', options: END_CAPS },
      { key: 'endCapColor', label: 'End cap color', colors: END_CAP_COLORS },
    ],
  },
]

/** Customize the paddle character's body, face and handle, with a live 3D preview. */
export function FaceSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  return (
    <Sheet open={open} onClose={onClose} title="Customize">
      {open && <LookForm profile={profile} onDone={onClose} />}
    </Sheet>
  )
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

function LookForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [a, setA] = useState<Appearance>(withDefaults(profile.player.appearance))
  const save = useMutation({
    mutationFn: () => profileApi.updateAppearance(a),
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onDone()
    },
  })

  const randomize = () => {
    const next = { ...a }
    for (const row of SECTIONS.flatMap((s) => s.rows)) next[row.key] = 'colors' in row ? pick(row.colors) : pick(row.options).id
    setA(next)
  }

  return (
    <div className="space-y-4">
      {/* Live preview stays pinned at the top while you scroll through the options. */}
      <div className="sticky -top-5 z-10 -mx-5 space-y-2 border-b border-white/8 bg-surface/95 px-5 pt-1 pb-3 backdrop-blur">
        <div className="mx-auto w-32 min-[400px]:w-40 md:w-44">
          <Avatar3D look={{ ...lookOf(profile.player), appearance: a }} variant="full" live interactive className="w-full" title="Preview" />
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="dark" size="sm" icon={<Dices className="size-4" />} onClick={randomize}>
            Randomize
          </Button>
          <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} onClick={() => setA(DEFAULT_APPEARANCE)}>
            Reset
          </Button>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.rows.map((row) =>
            'colors' in row ? (
              <Swatches key={row.key} label={row.label} colors={row.colors} value={a[row.key]} onChange={(v) => setA({ ...a, [row.key]: v })} />
            ) : (
              <Chips key={row.key} label={row.label} options={row.options} value={a[row.key]} onChange={(v) => setA({ ...a, [row.key]: v })} />
            ),
          )}
        </Section>
      ))}

      <ErrorNote error={save.error} />
      <Button block size="lg" loading={save.isPending} onClick={() => save.mutate()}>
        Save look
      </Button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5 rounded-2xl border border-white/10 bg-night/60 p-3.5">
      <h3 className="font-display text-sm font-bold tracking-widest text-lime uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Chips({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-white/85">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={o.id === value}
            onClick={() => onChange(o.id)}
            className={clsx(
              'min-h-11 rounded-full border px-3.5 text-sm font-semibold transition',
              o.id === value ? 'border-lime bg-lime text-ink' : 'border-white/15 bg-surface/80 text-white/85 hover:border-white/35',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
