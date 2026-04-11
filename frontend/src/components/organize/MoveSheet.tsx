/**
 * Bottom sheet mobile — sélection de la destination d'une tâche.
 * S'ouvre depuis MobileOrganizer quand l'utilisateur tape "déplacer".
 */

import { useEffect } from 'react'
import type { Task, Category, Deliverable } from '../../types'

interface MoveSheetProps {
  task: Task
  categories: Category[]
  deliverables: Deliverable[]
  onMove: (categoryId: string | null, deliverableId: string | null) => void
  onClose: () => void
}

export function MoveSheet({ task, categories, deliverables, onMove, onClose }: MoveSheetProps) {
  /* Bloque le scroll de la page pendant que la sheet est ouverte */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function isCurrent(catId: string | null, delId: string | null) {
    return task.category_id === catId && task.deliverable_id === delId
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 199,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: '#111',
          borderRadius: '12px 12px 0 0',
          borderTop: '1px solid #ffffff',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid #1a1a1a',
            flexShrink: 0,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: '#ffffff', letterSpacing: '0.06em' }}>DÉPLACER</p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '14px',
                color: '#ffffff',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '260px',
              }}
            >
              {task.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Liste des destinations */}
        <div style={{ overflowY: 'auto', padding: '8px 0 80px' }}>
          {/* Option "Non organisée" */}
          <DestRow
            label="Non organisée"
            sublabel="Aucune catégorie"
            color="#E8A23E"
            isCurrent={isCurrent(null, null)}
            onSelect={() => onMove(null, null)}
          />

          {/* Destinations par catégorie */}
          {categories.map((cat) => {
            const catDeliverables = deliverables.filter((d) => d.category_id === cat.id)
            return (
              <div key={cat.id}>
                {/* Catégorie sans livrable */}
                <DestRow
                  label={cat.name}
                  sublabel="Sans livrable"
                  color={cat.color}
                  isCurrent={isCurrent(cat.id, null)}
                  onSelect={() => onMove(cat.id, null)}
                />
                {/* Livrables de la catégorie */}
                {catDeliverables.map((del) => (
                  <DestRow
                    key={del.id}
                    label={del.name}
                    sublabel={cat.name}
                    color={cat.color}
                    isCurrent={isCurrent(cat.id, del.id)}
                    onSelect={() => onMove(cat.id, del.id)}
                    indent
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

/* ─── Sous-composant ligne destination ───────────────────────────────────── */

function DestRow({
  label,
  sublabel,
  color,
  isCurrent,
  onSelect,
  indent = false,
}: {
  label: string
  sublabel: string
  color: string
  isCurrent: boolean
  onSelect: () => void
  indent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        background: isCurrent ? `${color}12` : 'transparent',
        border: 'none',
        padding: `10px 20px 10px ${indent ? 36 : 20}px`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#ffffff', fontWeight: isCurrent ? 600 : 400 }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#ffffff' }}>{sublabel}</p>
      </div>
      {isCurrent && (
        <span style={{ color, fontSize: '14px', flexShrink: 0 }}>✓</span>
      )}
    </button>
  )
}
