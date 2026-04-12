/**
 * Point d'entrée du routing.
 * Redirige vers /capture par défaut, protège les routes authentifiées.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from './constants'
import { useAuthStore } from './store/authStore'

import { BottomNav } from './components/BottomNav'
import { Header } from './components/Header'
import { CaptureScreen }    from './screens/CaptureScreen'
import { OrganizeScreen }   from './screens/OrganizeScreen'
import { QualifyScreen }    from './screens/QualifyScreen'
import { PrioritiesScreen } from './screens/PrioritiesScreen'
import { ScoreScreen }      from './screens/ScoreScreen'
import { LoginScreen }          from './screens/LoginScreen'
import { ManageScreen }          from './screens/ManageScreen'
import { ForgotPasswordScreen }  from './screens/ForgotPasswordScreen'
import { ResetPasswordScreen }   from './screens/ResetPasswordScreen'

/** Wrapper qui redirige vers /login si l'utilisateur n'est pas connecté */
function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-app)' }}>
      <Header />
      {/* Zone de contenu — scrollable, prend toute la place disponible */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path={ROUTES.CAPTURE}    element={<CaptureScreen />} />
          <Route path={ROUTES.ORGANIZE}   element={<OrganizeScreen />} />
          <Route path={ROUTES.QUALIFY}    element={<QualifyScreen />} />
          <Route path={ROUTES.PRIORITIES} element={<PrioritiesScreen />} />
          <Route path={ROUTES.SCORE}      element={<ScoreScreen />} />
          <Route path="/manage"           element={<ManageScreen />} />
          {/* Fallback vers Capture */}
          <Route path="*" element={<Navigate to={ROUTES.CAPTURE} replace />} />
        </Routes>
      </main>

      {/* Bottom navigation fixe */}
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"                  element={<LoginScreen />} />
        <Route path="/forgot-password"        element={<ForgotPasswordScreen />} />
        <Route path="/reset-password/:token"  element={<ResetPasswordScreen />} />
        <Route path="/*"                      element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
