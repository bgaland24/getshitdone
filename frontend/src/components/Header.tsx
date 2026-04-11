/**
 * Header fixe — branding "intent." + indicateur session active + score du jour.
 */

import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../store/taskStore'

export function Header() {
  const navigate = useNavigate()
  const activeSession = useTaskStore((s) => s.activeSession)

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

      {/* Droite : bouton Param */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => navigate('/manage')}
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
