import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Flame, Image as ImageIcon, Pencil, PersonStanding, Shirt, Smile, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { profileApi } from '../api/api'
import type { Profile } from '../api/types'
import { Avatar3D } from '../components/character/Avatar3D'
import type { Pose } from '../components/character/ChibiAvatar'
import { AuraArt, EffectArt, OutfitArt } from '../components/character/ItemArt'
import { Scene } from '../components/character/Backgrounds'
import { Button } from '../components/ui/Button'
import { ErrorNote, Field, Segmented, Spinner } from '../components/ui/primitives'
import { Sheet } from '../components/ui/Sheet'
import { TopBar } from '../components/ui/TopBar'
import { lookOf } from '../cosmetics/visuals'
import { useMe } from '../hooks/queries'
import { SKILL_TIERS, tierOf } from '../lib/skill'
import { FaceSheet } from './character/FaceSheet'
import { WardrobeSheet, type WardrobeTab } from './character/WardrobeSheet'
import { SignOutButton } from '../components/layout/SignOutButton'
import { PageError } from '../components/ui/ErrorPage'

const POSES: { id: Pose; label: string }[] = [
  { id: 'idle', label: 'Ready' },
  { id: 'swing', label: 'Swing' },
  { id: 'victory', label: 'Victory' },
]

export function CharacterPage() {
  const me = useMe()
  if (!me.data) return me.error ? <PageError error={me.error} onRetry={() => me.refetch()} /> : <Spinner />
  return <CharacterScreen profile={me.data} />
}

function CharacterScreen({ profile }: { profile: Profile }) {
  const [pose, setPose] = useState<Pose>('idle')
  const [sheet, setSheet] = useState<'edit' | 'face' | 'poses' | 'wardrobe' | null>(null)
  const [wardrobeTab, setWardrobeTab] = useState<WardrobeTab>('Outfits')
  const openWardrobe = (t: WardrobeTab) => {
    setWardrobeTab(t)
    setSheet('wardrobe')
  }
  const look = lookOf(profile.player)
  const cycle = (step: number) =>
    setPose((p) => POSES[(POSES.findIndex((x) => x.id === p) + step + POSES.length) % POSES.length].id)

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="My Character" />

      <section className="relative overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_60px_-24px_rgb(163_72_250/0.6)]">
        <Scene id={profile.player.loadout.backgroundId} wide className="absolute inset-0 size-full" />
        <div className="relative flex min-h-[24rem] flex-col sm:flex-row md:min-h-[30rem]">
          {/* The stage spans the full width so the character stands in the middle of the scene; the menu floats on top. */}
          <div className="relative flex min-h-[21rem] flex-1 flex-col items-center justify-end pt-4 pb-3">
            <ArrowButton side="left" onClick={() => cycle(-1)} />
            <ArrowButton side="right" onClick={() => cycle(1)} />
            <Avatar3D look={look} variant="full" pose={pose} live interactive pedestal animated className="relative z-10 w-[92%] max-w-96" title={profile.player.displayName} />
            <button
              onClick={() => setSheet('edit')}
              className="relative z-10 -mt-6 flex items-center gap-2 rounded-full border border-white/15 bg-ink/85 py-1.5 pr-3.5 pl-4 font-display text-lg font-bold backdrop-blur"
            >
              {profile.player.displayName}
              <span className="rounded-md border border-lime/70 px-1.5 text-sm text-lime">Lv {profile.progress.level}</span>
              <Pencil className="size-4 text-white/80" />
            </button>
          </div>
          {/* Phones: a row of buttons under the character. Larger screens: a column floating on the right. */}
          <nav className="relative z-20 grid grid-cols-6 gap-1.5 p-2 pt-0 sm:absolute sm:top-0 sm:right-0 sm:flex sm:flex-col sm:gap-2 sm:p-2.5" aria-label="Customize">
            <MenuTile onClick={() => openWardrobe('Outfits')} icon={<Shirt className="size-6" />} label="Outfits" />
            <MenuTile onClick={() => setSheet('face')} icon={<Smile className="size-6" />} label="Look" />
            <MenuTile onClick={() => openWardrobe('Scenes')} icon={<ImageIcon className="size-6" />} label="Scenes" />
            <MenuTile onClick={() => openWardrobe('Auras')} icon={<Flame className="size-6" />} label="Auras" />
            <MenuTile onClick={() => openWardrobe('Effects')} icon={<Sparkles className="size-6" />} label="Effects" />
            <MenuTile onClick={() => setSheet('poses')} icon={<PersonStanding className="size-6" />} label="Poses" />
          </nav>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-surface/70 p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Equipped Set</h2>
        <div className="grid grid-cols-5 gap-2">
          <SlotTile onClick={() => setSheet('face')} label="Look">
            <Avatar3D look={look} className="w-full" />
          </SlotTile>
          <SlotTile onClick={() => openWardrobe('Outfits')} label="Outfit">
            <OutfitArt outfit={look.outfit} className="w-full" />
          </SlotTile>
          <SlotTile onClick={() => openWardrobe('Scenes')} label="Background">
            <Scene id={profile.player.loadout.backgroundId} className="size-full rounded-lg" />
          </SlotTile>
          <SlotTile onClick={() => openWardrobe('Effects')} label="Effect">
            {look.effect ? <EffectArt effect={look.effect} className="w-full" /> : <span className="text-xs text-white/60">No effect</span>}
          </SlotTile>
          <SlotTile onClick={() => openWardrobe('Auras')} label="Aura">
            {look.aura ? <AuraArt aura={look.aura} className="w-full" /> : <span className="text-xs text-white/60">No aura</span>}
          </SlotTile>
        </div>
      </section>

      <EditCharacterSheet open={sheet === 'edit'} onClose={() => setSheet(null)} onCustomize={() => setSheet('face')} profile={profile} />
      <FaceSheet open={sheet === 'face'} onClose={() => setSheet(null)} profile={profile} />
      <WardrobeSheet open={sheet === 'wardrobe'} tab={wardrobeTab} onTab={setWardrobeTab} onClose={() => setSheet(null)} profile={profile} />
      <Sheet open={sheet === 'poses'} onClose={() => setSheet(null)} title="Poses">
        <div className="grid grid-cols-3 gap-2">
          {POSES.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPose(p.id)
                setSheet(null)
              }}
              className={clsx('rounded-2xl border-2 bg-night/70 p-2', pose === p.id ? 'border-lime' : 'border-white/10')}
            >
              <Avatar3D look={look} variant="full" pose={p.id} className="w-full" />
              <span className="font-display font-bold">{p.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous pose' : 'Next pose'}
      className={clsx(
        'absolute top-[42%] z-20 hidden size-11 sm:grid place-items-center rounded-full border border-white/25 bg-ink/70 text-white backdrop-blur hover:border-lime/70',
        side === 'left' ? 'left-3' : 'right-[5.4rem]',
      )}
    >
      {side === 'left' ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
    </button>
  )
}

function MenuTile({ to, onClick, icon, label }: { to?: string; onClick?: () => void; icon: ReactNode; label: string }) {
  const cls =
    'flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-2xl sm:size-[3.9rem] border border-white/15 bg-ink/75 text-[10px] font-semibold text-white/90 backdrop-blur sm:text-[11px] [&_svg]:size-5 sm:[&_svg]:size-6 transition hover:border-lime/70 hover:text-lime'
  return to ? (
    <Link to={to} className={cls}>
      {icon}
      {label}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  )
}

function SlotTile({ to, onClick, label, children }: { to?: string; onClick?: () => void; label: string; children: ReactNode }) {
  const cls = 'grid aspect-square place-items-center overflow-hidden rounded-xl border border-white/12 bg-night/80 p-1.5 transition hover:border-lime/60'
  return to ? (
    <Link to={to} className={cls} aria-label={label} title={label}>
      {children}
    </Link>
  ) : (
    <button onClick={onClick} className={cls} aria-label={label} title={label}>
      {children}
    </button>
  )
}

// ---- Edit name, skill and body look ---------------------------------------------------------------

function EditCharacterSheet({ open, onClose, onCustomize, profile }: { open: boolean; onClose: () => void; onCustomize: () => void; profile: Profile }) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit character">
      {open && <EditForm profile={profile} onDone={onClose} onCustomize={onCustomize} />}
    </Sheet>
  )
}

function EditForm({ profile, onDone, onCustomize }: { profile: Profile; onDone: () => void; onCustomize: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile.player.displayName)
  const [skill, setSkill] = useState(tierOf(profile.skillEstimate))

  const save = useMutation({
    mutationFn: () => profileApi.update(name, skill),
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onDone()
    },
  })

  return (
    <div className="space-y-4">
      <div className="mx-auto w-28">
        <Avatar3D look={lookOf(profile.player)} className="w-full" />
      </div>
      <Field label="Display name" name="displayName" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
      <div>
        <div className="mb-2 text-sm font-semibold text-white/85">Your level (for Skill Based sessions)</div>
        <Segmented label="Skill" value={tierOf(skill)} onChange={setSkill} options={SKILL_TIERS.map((t) => ({ value: t.value as number, label: t.label }))} />
      </div>
      <Button variant="dark" block onClick={onCustomize}>
        Change body, face and handle
      </Button>
      <ErrorNote error={save.error} />
      <Button block size="lg" loading={save.isPending} onClick={() => save.mutate()}>
        Save
      </Button>
      <SignOutButton />
    </div>
  )
}
