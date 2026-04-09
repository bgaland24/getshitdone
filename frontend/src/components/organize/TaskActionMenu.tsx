/**
 * Menu contextuel d'actions sur une tâche.
 * Le dropdown est rendu en position: fixed pour éviter les clipping par overflow.
 * Actions : Terminée · Déplacer · Qualifier · Supprimer.
 */

import { useRef, useState, useEffect } from 'react'
import type { Task } from '../../types'

interface TaskActionMenuProps {
  task: Task
  onDone: (taskId: string) => void
  onOpenMove: (task: Task) => void
  onOpenQualify: (task: Task) => void
  onDelete: (taskId: string) => void
}

interface MenuPos { top: number; right: number }

const ITEM_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '9px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

export function TaskActionMenu({ task, onDone, onOpenMove, onOpenQualify, onDelete }: TaskActionMenuProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)

  /* Ferme le menu si on clique ailleurs */
  useEffect(() => {
    if (!menuPos) return
    function handleOutside(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuPos(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuPos])

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (menuPos) { setMenuPos(null); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
  }

  function handleAction(e: React.MouseEvent, fn: () => void) {
    e.stopPropagation()
    setMenuPos(null)
    fn()
  }

  const isDone = task.status === 'done'

  return (
    <>
      {/* Bouton déclencheur — trois points horizontaux */}
      <button
        ref={btnRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleToggle}
        title="Actions"
        style={{
          background: menuPos ? '#2a2a2a' : 'none',
          border: 'none',
          borderRadius: '4px',
          padding: '3px 6px',
          cursor: 'pointer',
          color: '#555',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="2.5" cy="8" r="1.5" />
          <circle cx="8"   cy="8" r="1.5" />
          <circle cx="13.5" cy="8" r="1.5" />
        </svg>
      </button>

      {/* Dropdown fixe */}
      {menuPos && (
        <>
          {/* Backdrop transparent pour fermer au clic extérieur */}
          <div
            onClick={() => setMenuPos(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 299 }}
          />
          <div
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 300,
              background: '#161616',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              minWidth: '160px',
            }}
          >
            {/* Terminée */}
            {!isDone && (
              <button
                type="button"
                onClick={(e) => handleAction(e, () => onDone(task.id))}
                style={{ ...ITEM_STYLE, color: '#4CAF7D' }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8l4 4 8-8" />
                </svg>
                Terminée
              </button>
            )}

            {/* Déplacer */}
            <button
              type="button"
              onClick={(e) => handleAction(e, () => onOpenMove(task))}
              style={{ ...ITEM_STYLE, color: '#ccc' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h6M8 5l3 3-3 3" />
                <path d="M11 8H5M8 11l-3-3 3-3" opacity="0.4"/>
              </svg>
              Déplacer
            </button>

            {/* Qualifier */}
            <button
              type="button"
              onClick={(e) => handleAction(e, () => onOpenQualify(task))}
              style={{ ...ITEM_STYLE, color: '#ccc' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4L2.2 6.2l4-.6z" />
              </svg>
              Qualifier
            </button>

            {/* Séparateur */}
            <div style={{ height: '1px', background: '#2a2a2a', margin: '2px 0' }} />

            {/* Supprimer */}
            <button
              type="button"
              onClick={(e) => handleAction(e, () => onDelete(task.id))}
              style={{ ...ITEM_STYLE, color: '#ef4444' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" />
              </svg>
              Supprimer
            </button>
          </div>
        </>
      )}
    </>
  )
}
