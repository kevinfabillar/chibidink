import { Gamepad2 } from 'lucide-react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/authStore'
import { AppShell } from './components/layout/AppShell'
import { AuthPage } from './pages/AuthPage'
import { CharacterPage } from './pages/CharacterPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { CreateSessionPage } from './pages/CreateSessionPage'
import { FindMatchPage } from './pages/FindMatchPage'
import { HomePage } from './pages/HomePage'
import { AurasPage, EffectsPage, ItemGridPage, ItemsHubPage } from './pages/items/ItemsPages'
import { ShopPage } from './pages/items/ShopPage'
import { JoinPage } from './pages/JoinPage'
import { PrivacyPage, TermsPage } from './pages/LegalPages'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordPages'
import { ProfilePage } from './pages/ProfilePage'
import { CourtPage } from './pages/session/CourtPage'
import { SessionPage } from './pages/session/SessionPage'
import { ErrorPage } from './components/ui/ErrorPage'

function RequireAuth() {
  const token = useAuth((s) => s.token)
  const location = useLocation()
  if (!token) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="queue" element={<FindMatchPage />} />
          <Route path="sessions/new" element={<CreateSessionPage />} />
          <Route path="sessions/:sessionId" element={<SessionPage />} />
          <Route path="sessions/:sessionId/courts/:courtNumber" element={<CourtPage />} />
          <Route path="character" element={<CharacterPage />} />
          <Route path="items" element={<ItemsHubPage />} />
          <Route path="items/outfits" element={<ItemGridPage slot="Outfit" />} />
          <Route path="items/backgrounds" element={<ItemGridPage slot="Background" />} />
          <Route path="items/effects" element={<EffectsPage />} />
          <Route path="items/auras" element={<AurasPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="players/:userId" element={<ProfilePage />} />
          <Route
            path="drills"
            element={
              <ComingSoonPage
                title="Pickle Drills"
                phase="Phase 4"
                icon={Gamepad2}
                blurb="Target Practice, Dink Challenge, Volley Rush and Serve Accuracy with your own character. Drills never affect your real record."
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<ErrorPage kind="notFound" />} />
    </Routes>
  )
}
