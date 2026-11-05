import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { profileApi } from '../../api/api'
import type { Profile } from '../../api/types'
import { lookOf } from '../../cosmetics/visuals'
import { SKILL_TIERS, tierOf } from '../../lib/skill'
import { Avatar3D } from '../character/Avatar3D'
import { SignOutButton } from '../layout/SignOutButton'
import { Button } from '../ui/Button'
import { ErrorNote, Field, Segmented } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

/**
 * Edit your display name and skill level. Used on the Character page (tap your name) and the Profile page
 * (Edit profile). `onCustomize` opens the look editor in place; without it, the button goes to the Character page.
 */
export function EditProfileSheet({ open, onClose, onCustomize, profile }: { open: boolean; onClose: () => void; onCustomize?: () => void; profile: Profile }) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      {open && <EditForm profile={profile} onDone={onClose} onCustomize={onCustomize} />}
    </Sheet>
  )
}

function EditForm({ profile, onDone, onCustomize }: { profile: Profile; onDone: () => void; onCustomize?: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState(profile.player.displayName)
  const [skill, setSkill] = useState(tierOf(profile.skillEstimate))
  const trimmed = name.trim()

  const save = useMutation({
    mutationFn: () => profileApi.update(trimmed, skill),
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
      <Field
        label="Display name"
        name="displayName"
        value={name}
        maxLength={24}
        onChange={(e) => setName(e.target.value)}
        hint="Shown to other players in sessions, the queue and the leaderboard. Up to 24 characters."
      />
      <div>
        <div className="mb-2 text-sm font-semibold text-white/85">Your level (for Skill Based sessions)</div>
        <Segmented label="Skill" value={tierOf(skill)} onChange={setSkill} options={SKILL_TIERS.map((t) => ({ value: t.value as number, label: t.label }))} />
      </div>
      <Button variant="dark" block onClick={onCustomize ?? (() => navigate('/character'))}>
        Change body, face and handle
      </Button>
      <ErrorNote error={save.error} />
      <Button block size="lg" disabled={!trimmed} loading={save.isPending} onClick={() => save.mutate()}>
        Save
      </Button>
      <SignOutButton />
    </div>
  )
}
