import { useQuery } from '@tanstack/react-query'
import { sessionApi } from '../../../api/api'
import { SectionTitle } from '../../../components/ui/primitives'
import { queryKeys } from '../../../hooks/queries'
import { ScrollText } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'

export function AuditLog({ sessionId }: { sessionId: string }) {
  const audit = useQuery({ queryKey: queryKeys.audit(sessionId), queryFn: () => sessionApi.audit(sessionId), refetchInterval: 20_000 })
  const entries = audit.data ?? []

  return (
    <section className="card p-5">
      <SectionTitle>Organizer log</SectionTitle>
      {entries.length === 0 ? (
        <EmptyState compact icon={<ScrollText className="size-6" />} title="Nothing logged yet" text="Score fixes, overrides and setting changes will appear here." />
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
          {entries.map((e, i) => (
            <li key={i} className="rounded-xl bg-night/70 px-3 py-2">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-lime">{e.action}</span>
                <time className="text-xs text-muted">{new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
              </div>
              <div className="text-white/75">
                {e.details} <span className="text-muted">— {e.actorName}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
