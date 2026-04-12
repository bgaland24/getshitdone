/**
 * Header fixe — branding "intent." + indicateur session active + score du jour.
 */

import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../store/taskStore'
import { useAuthStore } from '../store/authStore'
import { TUTORIAL_TARGETS, TUTORIAL_STORAGE_KEY } from '../constants'

export function Header() {
  const navigate = useNavigate()
  const activeSession = useTaskStore((s) => s.activeSession)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '52px',
        background: 'var(--color-bg-app)',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 20px',
      }}
    >
      {/* Branding — aligné à gauche, même indentation que le contenu */}
      <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.03em', color: '#f0f0f0' }}>
        intent<span style={{ color: 'var(--color-accent)' }}>.</span>
      </span>

      {/* Centre : indicateur session active uniquement */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
        {activeSession && (
          <>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CAF7D', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', color: '#4CAF7D' }}>En cours</span>
          </>
        )}
      </div>

      {/* Droite : bouton Déconnexion + bouton Tutoriel + bouton Param */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => { clearAuth(); navigate('/login', { replace: true }) }}
          aria-label="Se déconnecter"
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#aaaaaa',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          QUITTER
        </button>
        <button
          onClick={() => {
            window.localStorage.removeItem(TUTORIAL_STORAGE_KEY)
            window.dispatchEvent(new CustomEvent('intent:restart-tutorial'))
          }}
          aria-label="Relancer le tutoriel"
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#888888',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          TUTO
        </button>
        <button
          onClick={() => navigate('/manage')}
          data-tutorial={TUTORIAL_TARGETS.PARAM}
          aria-label="Paramètres"
          style={{
            background: 'none',
            border: '1px solid #ffffff',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          PARAM
        </button>
      </div>
    </header>
  )
}
