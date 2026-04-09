/**
 * Carte de tâche draggable pour le board Kanban desktop.
 * Utilise useDraggable de @dnd-kit/core.
 * En mode isOverlay : rendu de la copie flottante pendant le drag.
 */

import type { CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task, Category } from '../../types'
import { getHorizonColor, getHorizonLabel } from '../../constants'
import { Badge } from '../Badge'
import { QualDot } from '../Badge'
import { TaskActionMenu } from './TaskActionMenu'

interface KanbanCardProps {
  task: Task
  categories: Category[]
  isOverlay?: boolean
  onDone?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onOpenMove?: (task: Task) => void
  onOpenQualify?: (task: Task) => void
}

export function KanbanCard({
  task,
  categories,
  isOverlay = false,
  onDone,
  onDelete,
  onOpenMove,
  onOpenQualify,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isOverlay,
  })

  const cat = categories.find((c) => c.id === task.category_id)
  const borderColor = cat?.color ?? '#333'

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    background: '#141414',
    border: '1px solid #1e1e1e',
    borderLeft: `3px solid ${borderColor}`,
    borderRadius: '8px',
    padding: '10px 12px',
    cursor: isOverlay ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
    ...(isOverlay && {
      rotate: '2deg',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      opacity: 1,
    }),
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <QualDot qualified={task.is_qualified} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '13px',
              color: task.status === 'done' ? '#444' : '#ccc',
              margin: '0 0 6px',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              fontStyle: task.delegation === 'delegated' ? 'italic' : 'normal',
            }}
          >
            {task.title}
          </p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {task.horizon && (
              <Badge label={getHorizonLabel(task.horizon)} color={getHorizonColor(task.horizon)} />
            )}
            {task.urgency === 'urgent' && <Badge label="Urgent" color="#E86B3E" />}
          </div>
        </div>

        {/* Menu actions — masqué dans DragOverlay */}
        {!isOverlay && onDone && onDelete && onOpenMove && onOpenQualify && (
          <TaskActionMenu
            task={task}
            onDone={onDone}
            onOpenMove={onOpenMove}
            onOpenQualify={onOpenQualify}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}
