/**
 * Modal de qualification d'une tâche depuis l'écran Organiser.
 * Overlay plein écran avec QualifyForm à l'intérieur.
 * Pas de mode session (pas de progress, pas de onSkip).
 */

import { useEffect } from 'react'
import type { Task, Category, Deliverable, QualifyTaskPayload } from '../../types'
import { QualifyForm } from '../QualifyForm'

interface QualifyModalProps {
  task: Task
  categories: Category[]
  deliverables: Deliverable[]
  onSubmit: (task: Task, payload: QualifyTaskPayload) => Promise<void>
  onClose: () => void
}

export function QualifyModal({ task, categories, deliverables, onSubmit, onClose }: QualifyModalProps) {
  /* Bloque le scroll de la page pendant l'ouverture */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  async function handleSubmit(payload: QualifyTaskPayload) {
    await onSubmit(task, payload)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 299,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          background: 'var(--color-bg-app)',
          borderRadius: '12px 12px 0 0',
          borderTop: '1px solid #2a2a2a',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '20px 20px 0',
        }}
      >
        {/* En-tête */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#555',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            QUALIFIER
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <QualifyForm
          task={task}
          categories={categories}
          deliverables={deliverables}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  )
}
