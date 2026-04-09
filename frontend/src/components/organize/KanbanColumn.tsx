/**
 * Colonne droppable du board Kanban.
 * Représente un livrable (ou la zone "Non organisées").
 */

import { useDroppable } from '@dnd-kit/core'
import type { Task, Category } from '../../types'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  columnId: string
  title: string
  color: string
  tasks: Task[]
  categories: Category[]
  onDone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenMove: (task: Task) => void
  onOpenQualify: (task: Task) => void
}

export function KanbanColumn({
  columnId,
  title,
  color,
  tasks,
  categories,
  onDone,
  onDelete,
  onOpenMove,
  onOpenQualify,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId })

  return (
    <div
      ref={setNodeRef}
      style={{
        width: '100%',
        background: isOver ? `${color}0a` : '#0d0d0d',
        border: `1px solid ${isOver ? color + '80' : '#1e1e1e'}`,
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* En-tête de colonne */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #1e1e1e',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#666',
            letterSpacing: '0.04em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#333',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
            marginLeft: '6px',
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cartes scrollables */}
      <div
        style={{
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minHeight: '60px',
        }}
      >
        {tasks.length === 0 && (
          <div
            style={{
              border: '1px dashed #1e1e1e',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'center',
              color: '#2a2a2a',
              fontSize: '11px',
              letterSpacing: '0.04em',
            }}
          >
            Glisser ici
          </div>
        )}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            categories={categories}
            onDone={onDone}
            onDelete={onDelete}
            onOpenMove={onOpenMove}
            onOpenQualify={onOpenQualify}
          />
        ))}
      </div>
    </div>
  )
}
