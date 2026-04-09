/**
 * Vue Organiser pour mobile — accordion par catégorie > livrable.
 * Les actions sur chaque tâche sont accessibles via TaskActionMenu.
 */

import { useState } from 'react'
import type { Task, Category, Deliverable } from '../../types'
import { getHorizonColor, getHorizonLabel } from '../../constants'
import { Badge } from '../Badge'
import { QualDot } from '../Badge'
import { TaskActionMenu } from './TaskActionMenu'

interface DeliverableGroup {
  deliverableId: string | null
  deliverableName: string
  tasks: Task[]
}

interface CatGroup {
  cat: Category
  deliverableGroups: DeliverableGroup[]
}

interface MobileOrganizerProps {
  unorganized: Task[]
  grouped: CatGroup[]
  categories: Category[]
  deliverables: Deliverable[]
  onDone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenMove: (task: Task) => void
  onOpenQualify: (task: Task) => void
}

export function MobileOrganizer({
  unorganized,
  grouped,
  categories,
  onDone,
  onDelete,
  onOpenMove,
  onOpenQualify,
}: MobileOrganizerProps) {
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  function toggleCat(catId: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  return (
    <div style={{ padding: '0 0 20px' }}>
      {/* Section Non organisées */}
      {unorganized.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderBottom: '1px solid #1a1a1a',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8A23E' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#E8A23E', letterSpacing: '0.06em' }}>
              NON ORGANISÉES
            </span>
            <span style={{ fontSize: '10px', color: '#333', fontFamily: 'var(--font-mono)' }}>
              {unorganized.length}
            </span>
          </div>
          {unorganized.map((task) => (
            <MobileTaskRow
              key={task.id}
              task={task}
              categories={categories}
              onDone={onDone}
              onDelete={onDelete}
              onOpenMove={onOpenMove}
              onOpenQualify={onOpenQualify}
            />
          ))}
        </section>
      )}

      {/* Sections par catégorie */}
      {grouped.map(({ cat, deliverableGroups }) => {
        const isCollapsed = collapsedCats.has(cat.id)
        const totalTasks = deliverableGroups.reduce((n, dg) => n + dg.tasks.length, 0)
        return (
          <section key={cat.id} style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => toggleCat(cat.id)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${cat.color}30`,
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: cat.color, letterSpacing: '0.06em', flex: 1 }}>
                {cat.name.toUpperCase()}
              </span>
              <span style={{ fontSize: '10px', color: '#333', fontFamily: 'var(--font-mono)' }}>
                {totalTasks}
              </span>
              <span style={{ fontSize: '10px', color: '#333', marginLeft: '4px' }}>
                {isCollapsed ? '›' : '⌄'}
              </span>
            </button>

            {!isCollapsed && deliverableGroups.map((dg) => (
              <div key={dg.deliverableId ?? '__none__'}>
                <div
                  style={{
                    padding: '6px 20px 6px 32px',
                    fontSize: '10px',
                    color: '#444',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    borderBottom: '1px solid #111',
                  }}
                >
                  {dg.deliverableName.toUpperCase()}
                </div>
                {dg.tasks.map((task) => (
                  <MobileTaskRow
                    key={task.id}
                    task={task}
                    categories={categories}
                    onDone={onDone}
                    onDelete={onDelete}
                    onOpenMove={onOpenMove}
                    onOpenQualify={onOpenQualify}
                    indent
                  />
                ))}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

/* ─── Ligne de tâche mobile ──────────────────────────────────────────────── */

function MobileTaskRow({
  task,
  categories,
  onDone,
  onDelete,
  onOpenMove,
  onOpenQualify,
  indent = false,
}: {
  task: Task
  categories: Category[]
  onDone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenMove: (task: Task) => void
  onOpenQualify: (task: Task) => void
  indent?: boolean
}) {
  const cat = categories.find((c) => c.id === task.category_id)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: `10px 16px 10px ${indent ? 32 : 20}px`,
        borderBottom: '1px solid #0f0f0f',
      }}
    >
      <QualDot qualified={task.is_qualified} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 4px',
            fontSize: '13px',
            color: task.status === 'done' ? '#444' : '#ccc',
            lineHeight: 1.35,
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            fontStyle: task.delegation === 'delegated' ? 'italic' : 'normal',
          }}
        >
          {task.title}
        </p>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {cat && <Badge label={cat.name} color={cat.color} />}
          {task.horizon && <Badge label={getHorizonLabel(task.horizon)} color={getHorizonColor(task.horizon)} />}
          {task.urgency === 'urgent' && <Badge label="Urgent" color="#E86B3E" />}
        </div>
      </div>

      <TaskActionMenu
        task={task}
        onDone={onDone}
        onOpenMove={onOpenMove}
        onOpenQualify={onOpenQualify}
        onDelete={onDelete}
      />
    </div>
  )
}
