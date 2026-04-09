/**
 * Header fixe — branding "intent." + indicateur session active + score du jour.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTodayScore } from '../api/scores'
import { useTaskStore } from '../store/taskStore'

export function Header() {
  const navigate = useNavigate()
  const [score, setScore] = useState<number | null>(null)
  const activeSession = useTaskStore((s) => s.activeSession)

  useEffect(() => {
    fetchTodayScore()
      .then((s) => setScore(s.global_score))
      .catch(() => { /* silencieux en dev */ })
  }, [])

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

      {/* Centre : score du jour ou indicateur session active */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
        {activeSession ? (
          <>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CAF7D', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', color: '#4CAF7D' }}>En cours</span>
          </>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {score !== null ? (
              <>{Math.round(score)}<span style={{ color: 'var(--color-accent)' }}>%</span></>
            ) : (
              <span style={{ color: 'var(--color-border-medium)' }}>—%</span>
            )}
          </span>
        )}
      </div>

      {/* Droite : bouton Param */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => navigate('/manage')}
          aria-label="Paramètres"
          style={{
            background: 'none',
            border: '1px solid #2a2a2a',
            borderRadius: '6px',
            padding: '5px 10px',
            color: '#555',
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
