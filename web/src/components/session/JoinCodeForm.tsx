import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../ui/Button'

/** Six-character invite code entry. Goes to the join page, which shows the invitation first. */
export function JoinCodeForm() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (clean.length === 6) navigate(`/join/${clean}`)
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={clean}
        onChange={(e) => setCode(e.target.value)}
        placeholder="CODE"
        aria-label="Session code"
        autoCapitalize="characters"
        className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-night px-4 text-center font-display text-2xl font-bold tracking-[0.3em] uppercase placeholder:tracking-[0.3em] placeholder:text-white/25 focus:border-lime/70 focus:outline-none"
      />
      <Button type="submit" disabled={clean.length !== 6}>
        Join
      </Button>
    </form>
  )
}
