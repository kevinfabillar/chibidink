import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../lib/legal'

// Terms of Service and Privacy Policy, written for how ChibiDink actually works. Public pages:
// people read them before they have an account.

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-16">
      <button onClick={() => (history.length > 1 ? history.back() : (location.href = '/'))} className="-ml-2 mb-2 flex items-center gap-1 rounded-full p-1.5 text-sm text-white/80 hover:bg-white/10">
        <ChevronLeft className="size-5" /> Back
      </button>
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-white/85 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
      <p className="mt-10 text-sm text-muted">
        See also: <Link to="/terms" className="text-lime hover:underline">Terms of Service</Link> ·{' '}
        <Link to="/privacy" className="text-lime hover:underline">Privacy Policy</Link>
      </p>
    </div>
  )
}

const Contact = () => (
  <>
    email <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime hover:underline">{CONTACT_EMAIL}</a>
  </>
)

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <section>
        <p>
          These terms are the agreement between you and ChibiDink ("we") for using the ChibiDink app, which helps players run
          real pickleball open play: sessions, the court queue, scores, and a character you can dress up. By creating an account
          or playing as a guest, you agree to these terms and to our <Link to="/privacy" className="text-lime hover:underline">Privacy Policy</Link>.
        </p>
      </section>
      <section>
        <h2>1. Your account</h2>
        <ul>
          <li>Give a real email and a display name that isn't offensive or pretending to be someone else.</li>
          <li>Keep your password private. You're responsible for what happens on your account.</li>
          <li>Guest accounts are made from a session's QR code or code and can join sessions but not host them. They're lost if you sign out or clear your browser, and are deleted 7 days after you last play.</li>
          <li>If you're under 18, use ChibiDink with a parent's or guardian's permission.</li>
        </ul>
      </section>
      <section>
        <h2>2. Sessions and scores</h2>
        <ul>
          <li>The session organizer runs the session: courts, settings, who plays, and entering final scores. Their entries are what the app records.</li>
          <li>Scores should match the real games. Don't enter or ask for false results to change rankings or rewards.</li>
          <li>Disagreements about a game are settled by the players and the organizer at the venue, not by ChibiDink.</li>
        </ul>
      </section>
      <section>
        <h2>3. XP, coins and items</h2>
        <ul>
          <li>XP, levels, coins, outfits, scenes, auras and effects are earned by playing. They have no money value.</li>
          <li>They can't be bought with real money, sold, traded, or exchanged for cash.</li>
          <li>We may adjust balances or items to fix mistakes, bugs or abuse.</li>
        </ul>
      </section>
      <section>
        <h2>4. Fair play</h2>
        <p>Don't harass other players, cheat, exploit bugs, try to access other people's accounts, or overload or attack the service. We may suspend or remove accounts that do.</p>
      </section>
      <section>
        <h2>5. Playing safely</h2>
        <p>
          Pickleball is a physical sport and you play at your own risk. ChibiDink only organizes the queue; it doesn't run,
          supervise or inspect venues, courts or equipment. Follow the rules of the venue and look after yourself and others.
        </p>
      </section>
      <section>
        <h2>6. The service</h2>
        <ul>
          <li>ChibiDink is provided "as is". We work to keep it running, but it may sometimes be unavailable, and features may change.</li>
          <li>To keep things fast, closed sessions older than 30 days are deleted, except the latest 10 sessions of each player in them. Your lifetime stats, level and coins are kept.</li>
        </ul>
      </section>
      <section>
        <h2>7. Ending your account</h2>
        <p>You can stop using ChibiDink at any time and ask us to delete your account. We may close accounts that break these terms.</p>
      </section>
      <section>
        <h2>8. Liability</h2>
        <p>To the extent the law allows, we aren't liable for indirect losses, or for injuries, disputes or losses arising from games organized with the app.</p>
      </section>
      <section>
        <h2>9. Changes and law</h2>
        <p>
          If we change these terms in an important way, we'll update the date above and ask you to agree again. These terms are
          governed by the laws of the Republic of the Philippines.
        </p>
      </section>
      <section>
        <h2>10. Contact</h2>
        <p>
          Questions about these terms: <Contact />.
        </p>
      </section>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <section>
        <p>
          This explains what personal data ChibiDink collects, why, who can see it, and your rights under the Philippine Data
          Privacy Act of 2012 (Republic Act No. 10173).
        </p>
      </section>
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><b>Account:</b> your email and password. Passwords are stored only as a secure hash, never as readable text.</li>
          <li><b>Guest players:</b> just the name you enter.</li>
          <li><b>Your player:</b> display name, character look, equipped and owned items, XP, level and coins.</li>
          <li><b>Play:</b> sessions you join or host, your queue status and skill level, games, scores, wins and losses.</li>
          <li><b>Agreement:</b> when you agreed to these terms and which version.</li>
          <li><b>Technical:</b> your IP address is used to limit sign-in attempts and protect the service, and may appear in server logs. Your sign-in token is stored in your browser.</li>
        </ul>
        <p className="mt-2">We don't collect your location, contacts or payment details, and we don't use advertising trackers.</p>
      </section>
      <section>
        <h2>2. Why we use it</h2>
        <ul>
          <li>To run your account and sign you in.</li>
          <li>To run sessions: the queue, matchmaking, courts, scores, standings and podiums.</li>
          <li>To give XP, coins and items, and keep your lifetime record.</li>
          <li>To keep the service secure, prevent abuse and fix problems.</li>
        </ul>
      </section>
      <section>
        <h2>3. Who can see it</h2>
        <ul>
          <li>Players in a session see each other's display name, character, skill level, and games, wins and losses in that session.</li>
          <li>Organizers also see session settings and the history of score edits.</li>
          <li>Other players can open your profile and see your character and match record. Your email is never shown to other players.</li>
          <li>We don't sell your data or share it for advertising.</li>
        </ul>
      </section>
      <section>
        <h2>4. Where it's stored</h2>
        <p>
          Data is stored with our database host, Supabase, and may be kept on servers outside the Philippines. We use providers
          that protect data with encryption and access controls.
        </p>
      </section>
      <section>
        <h2>5. How long we keep it</h2>
        <ul>
          <li>Closed sessions (with their games and score history) are deleted after 30 days, except each player's latest 10 sessions.</li>
          <li>Guest accounts, with their character, coins and game history, are deleted 7 days after the guest last played (never during an open session).</li>
          <li>Your account, character, lifetime stats, level and coins are kept while your account exists.</li>
          <li>When your account is deleted, your profile and items are removed, and your past session data is removed or anonymized.</li>
        </ul>
      </section>
      <section>
        <h2>6. Your rights</h2>
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>be informed about how your data is used;</li>
          <li>get a copy of your data;</li>
          <li>correct wrong data (you can change your name and look in the app);</li>
          <li>object to processing, or ask us to delete or block your data;</li>
          <li>get your data in a portable format;</li>
          <li>complain to the National Privacy Commission (privacy.gov.ph).</li>
        </ul>
        <p className="mt-2">To use these rights, <Contact />.</p>
      </section>
      <section>
        <h2>7. Security</h2>
        <p>We hash passwords, limit sign-in attempts, use encrypted connections, and restrict access to the database. No system is perfectly secure, so please use a strong, unique password.</p>
      </section>
      <section>
        <h2>8. Children</h2>
        <p>If you're under 18, please use ChibiDink with a parent's or guardian's permission.</p>
      </section>
      <section>
        <h2>9. Changes</h2>
        <p>If we change this policy in an important way, we'll update the date above and ask you to agree again.</p>
      </section>
    </LegalLayout>
  )
}
