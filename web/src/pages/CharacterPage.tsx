import clsx from 'clsx'
import { BadgeCheck, ChevronLeft, ChevronRight, Flame, Image as ImageIcon, PersonStanding, Shirt, Smile, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Profile } from '../api/types'
import { Avatar3D } from '../components/character/Avatar3D'
import { POSES, setPose, usePose } from '../lib/pose'
import { AuraArt, EffectArt, OutfitArt } from '../components/character/ItemArt'
import { Scene } from '../components/character/Backgrounds'
import { Spinner } from '../components/ui/primitives'
import { TopBar } from '../components/ui/TopBar'
import { lookOf } from '../cosmetics/visuals'
import { useMe } from '../hooks/queries'
import { FaceSheet } from './character/FaceSheet'
import { WardrobeSheet, type WardrobeTab } from './character/WardrobeSheet'
import { PoseSheet } from './character/PoseSheet'
import { PageError } from '../components/ui/ErrorPage'
import { PlayerName } from '../components/character/NameTag'

export function CharacterPage() {
  const me = useMe()
  if (!me.data) return me.error ? <PageError error={me.error} onRetry={() => me.refetch()} /> : <Spinner />
  return <CharacterScreen profile={me.data} />
}

function CharacterScreen({ profile }: { profile: Profile }) {
  const pose = usePose(profile.player.userId)
  const [sheet, setSheet] = useState<'face' | 'poses' | 'wardrobe' | null>(null)
  const [wardrobeTab, setWardrobeTab] = useState<WardrobeTab>('Outfits')
  const openWardrobe = (t: WardrobeTab) => {
    setWardrobeTab(t)
    setSheet('wardrobe')
  }
  const look = lookOf(profile.player)
  const cycle = (step: number) =>
    setPose(profile.player.userId, POSES[(POSES.findIndex((x) => x.id === pose) + step + POSES.length) % POSES.length].id)

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
            <div className="relative z-10 -mt-6 flex max-w-[92%] items-center gap-2 rounded-full border border-white/15 bg-ink/85 py-1.5 pr-4 pl-4 font-display text-lg font-bold backdrop-blur">
              <PlayerName player={profile.player} size="md" className="min-w-0 truncate text-lg" />
              <span className="rounded-md border border-lime/70 px-1.5 text-sm text-lime">Lv {profile.progress.level}</span>
            </div>
          </div>
          {/* Phones: a row of buttons under the character. Larger screens: a column floating on the right. */}
          <nav className="relative z-20 grid grid-cols-7 gap-1 p-2 pt-0 sm:absolute sm:top-0 sm:right-0 sm:flex sm:flex-col sm:gap-2 sm:p-2.5" aria-label="Customize">
            <MenuTile onClick={() => openWardrobe('Outfits')} icon={<Shirt className="size-6" />} label="Outfits" />
            <MenuTile onClick={() => setSheet('face')} icon={<Smile className="size-6" />} label="Look" />
            <MenuTile onClick={() => openWardrobe('Scenes')} icon={<ImageIcon className="size-6" />} label="Scenes" />
            <MenuTile onClick={() => openWardrobe('Auras')} icon={<Flame className="size-6" />} label="Auras" />
            <MenuTile onClick={() => openWardrobe('Effects')} icon={<Sparkles className="size-6" />} label="Effects" />
            <MenuTile onClick={() => openWardrobe('Names')} icon={<BadgeCheck className="size-6" />} label="Names" />
            <MenuTile onClick={() => setSheet('poses')} icon={<PersonStanding className="size-6" />} label="Poses" />
          </nav>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-surface/70 p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Equipped Set</h2>
        <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-6">
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
          <SlotTile onClick={() => openWardrobe('Names')} label="Name skin">
            {profile.player.loadout.nameplateId ? (
              <PlayerName player={profile.player} className="max-w-full text-[11px]" />
            ) : (
              <span className="text-xs text-white/60">No name skin</span>
            )}
          </SlotTile>
        </div>
      </section>

      <FaceSheet open={sheet === 'face'} onClose={() => setSheet(null)} profile={profile} />
      <WardrobeSheet open={sheet === 'wardrobe'} tab={wardrobeTab} onTab={setWardrobeTab} onClose={() => setSheet(null)} profile={profile} />
      <PoseSheet open={sheet === 'poses'} onClose={() => setSheet(null)} userId={profile.player.userId} look={look} backgroundId={profile.player.loadout.backgroundId} />
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

