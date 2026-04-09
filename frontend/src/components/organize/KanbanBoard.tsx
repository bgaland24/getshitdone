/**
 * Board Kanban desktop — colonnes = livrables, cartes = tâches.
 * Wrappé dans DndContext. Gère le drag state local et l'appel optimiste à onMoveTask.
 */

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Task, Category, Deliverable } from '../../types'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'

interface DeliverableGroup {
  deliverableId: string | null
  deliverableName: string
  tasks: Task[]
}

interface CatGroup {
  cat: Category
  deliverableGroups: DeliverableGroup[]
}

interface KanbanBoardProps {
  unorganized: Task[]
  grouped: CatGroup[]
  categories: Category[]
  deliverables: Deliverable[]
  onMoveTask: (taskId: string, newCategoryId: string | null, newDeliverableId: string | null) => void
  onDone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenMove: (task: Task) => void
  onOpenQualify: (task: Task) => void
}

/**
 * Répartit les livrables en colonnes physiques :
 * ≤ 3 livrables → 1 colonne, > 3 → 2 colonnes (1ère remplie en priorité)
 */
function splitIntoPhysicalColumns(groups: DeliverableGroup[]): DeliverableGroup[][] {
  if (groups.length <= 3) return [groups]
  const half = Math.ceil(groups.length / 2)
  return [groups.slice(0, half), groups.slice(half)]
}

/** Encode les IDs de colonne sous la forme "cat:<catId>:del:<delId|null>" */
function encodeColumnId(categoryId: string | null, deliverableId: string | null): string {
  if (!categoryId) return 'unorganized'
  return `cat:${categoryId}:del:${deliverableId ?? 'null'}`
}

/** Décode un columnId → { categoryId, deliverableId } */
function decodeColumnId(columnId: string): { categoryId: string | null; deliverableId: string | null } {
  if (columnId === 'unorganized') return { categoryId: null, deliverableId: null }
  const match = columnId.match(/^cat:(.+):del:(.+)$/)
  if (!match) return { categoryId: null, deliverableId: null }
  return {
    categoryId: match[1],
    deliverableId: match[2] === 'null' ? null : match[2],
  }
}

export function KanbanBoard({
  unorganized,
  grouped,
  categories,
  onMoveTask,
  onDone,
  onDelete,
  onOpenMove,
  onOpenQualify,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !activeTask) return

    const sourceColumnId = encodeColumnId(activeTask.category_id, activeTask.deliverable_id)
    if (over.id === sourceColumnId) return // même colonne, rien à faire

    const { categoryId, deliverableId } = decodeColumnId(over.id as string)
    onMoveTask(active.id as string, categoryId, deliverableId)
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          alignItems: 'flex-start',
          padding: '4px 20px 20px',
        }}
      >
        {/* Colonne "Non organisées" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <div style={{ padding: '0 4px', height: '20px' }} />
          <KanbanColumn
            columnId="unorganized"
            title="Non organisées"
            color="#E8A23E"
            tasks={unorganized}
            categories={categories}
            onDone={onDone}
            onDelete={onDelete}
            onOpenMove={onOpenMove}
            onOpenQualify={onOpenQualify}
          />
        </div>

        {/* Groupes par catégorie */}
        {grouped.map(({ cat, deliverableGroups }) => {
          const physicalCols = splitIntoPhysicalColumns(deliverableGroups)
          return (
            <div
              key={cat.id}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}
            >
              {/* En-tête catégorie */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 4px',
                  height: '20px',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: cat.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {cat.name}
                </span>
              </div>

              {/* Colonnes physiques côte à côte (max 2) */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {physicalCols.map((colGroups, colIdx) => (
                  <div
                    key={colIdx}
                    style={{
                      width: '260px',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      maxHeight: 'calc(100vh - 140px)',
                      overflowY: 'auto',
                    }}
                  >
                    {colGroups.map((dg) => (
                      <KanbanColumn
                        key={dg.deliverableId ?? '__none__'}
                        columnId={encodeColumnId(cat.id, dg.deliverableId)}
                        title={dg.deliverableName}
                        color={cat.color}
                        tasks={dg.tasks}
                        categories={categories}
                        onDone={onDone}
                        onDelete={onDelete}
                        onOpenMove={onOpenMove}
                        onOpenQualify={onOpenQualify}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Copie flottante pendant le drag */}
      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            categories={categories}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
