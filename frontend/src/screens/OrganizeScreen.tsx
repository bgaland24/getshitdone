/**
 * Écran Organiser — orchestrateur.
 * Desktop : board Kanban avec glisser-déposer.
 * Mobile : accordion + bottom sheet "déplacer".
 */

import { useEffect, useState } from 'react'
import { fetchTasks, updateTask, deleteTask, doneTask, qualifyTask } from '../api/tasks'
import { fetchCategories, fetchDeliverables } from '../api/categories'
import { useTaskStore } from '../store/taskStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { KanbanBoard } from '../components/organize/KanbanBoard'
import { MobileOrganizer } from '../components/organize/MobileOrganizer'
import { MoveSheet } from '../components/organize/MoveSheet'
import { QualifyModal } from '../components/organize/QualifyModal'
import type { Task, Category, Deliverable, QualifyTaskPayload } from '../types'

export function OrganizeScreen() {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDeliverable, setFilterDeliverable] = useState<string>('all')
  const [moveTarget, setMoveTarget] = useState<Task | null>(null)
  const [qualifyTarget, setQualifyTarget] = useState<Task | null>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const {
    tasks, categories, deliverables,
    setTasks, setCategories, setDeliverables,
    updateTask: storeUpdate, removeTask,
  } = useTaskStore()

  useEffect(() => {
    Promise.all([fetchTasks(), fetchCategories(), fetchDeliverables()])
      .then(([t, c, d]) => { setTasks(t); setCategories(c); setDeliverables(d) })
  }, [])

  // Livrables filtrables selon la catégorie sélectionnée
  const filterableDeliverables = filterCategory === 'all'
    ? deliverables
    : deliverables.filter((d) => d.category_id === filterCategory)

  const visibleTasks = tasks.filter((t) => {
    if (filterStatus === 'all' && ['done', 'cancelled'].includes(t.status)) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
    if (filterDeliverable !== 'all' && t.deliverable_id !== filterDeliverable) return false
    return true
  })

  const filtersActive = filterStatus !== 'all' || filterCategory !== 'all' || filterDeliverable !== 'all'

  // Tâches sans catégorie — colonne "Non organisées"
  const unorganized = visibleTasks.filter((t) => !t.category_id)
  const grouped = buildGroups(
    visibleTasks.filter((t) => t.category_id),
    categories,
    deliverables,
    !filtersActive,
  )

  /** Déplace une tâche — mise à jour optimiste + rollback sur erreur */
  async function handleMoveTask(
    taskId: string,
    newCategoryId: string | null,
    newDeliverableId: string | null,
  ) {
    const original = tasks.find((t) => t.id === taskId)
    if (!original) return
    storeUpdate({ ...original, category_id: newCategoryId, deliverable_id: newDeliverableId })
    try {
      const updated = await updateTask(taskId, {
        category_id: newCategoryId,
        deliverable_id: newDeliverableId,
      })
      storeUpdate(updated)
    } catch {
      storeUpdate(original) // rollback silencieux
    }
  }

  async function handleDone(taskId: string) {
    try { storeUpdate(await doneTask(taskId)) } catch { /* silencieux */ }
  }

  async function handleQualify(task: Task, payload: QualifyTaskPayload) {
    try { storeUpdate(await qualifyTask(task.id, payload)) } catch { /* silencieux */ }
  }

  async function handleMove(taskId: string, categoryId: string | null, deliverableId: string | null) {
    setMoveTarget(null)
    await handleMoveTask(taskId, categoryId, deliverableId)
  }

  async function handleDelete(taskId: string) {
    try { await deleteTask(taskId); removeTask(taskId) } catch { /* silencieux */ }
  }

  const isEmpty = unorganized.length === 0 && grouped.length === 0

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    padding: '6px 8px',
    color: '#f0f0f0',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isDesktop ? 'calc(100vh - 52px)' : 'auto',
        overflow: isDesktop ? 'hidden' : 'visible',
      }}
    >
      {/* Barre titre + filtres sur la même ligne */}
      <div style={{ padding: '12px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '14px', color: '#f0f0f0', fontWeight: 700, flexShrink: 0, letterSpacing: '-0.01em' }}>
          Organiser
        </span>

        {/* Filtre statut */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tous statuts</option>
          <option value="new">Nouvelle</option>
          <option value="prioritized">Épinglée</option>
          <option value="in_progress">En cours</option>
          <option value="done">Terminée</option>
          <option value="cancelled">Annulée</option>
        </select>

        {/* Filtre catégorie */}
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value)
            setFilterDeliverable('all') // reset livrable quand catégorie change
          }}
          style={selectStyle}
        >
          <option value="all">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Filtre livrable */}
        <select
          value={filterDeliverable}
          onChange={(e) => setFilterDeliverable(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tous livrables</option>
          {filterableDeliverables.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* État vide */}
      {isEmpty && (
        <p style={{ fontSize: '13px', color: '#333', textAlign: 'center', marginTop: '40px' }}>
          Aucune tâche dans cette vue.
        </p>
      )}

      {/* Board ou accordion selon viewport */}
      {!isEmpty && isDesktop && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <KanbanBoard
            unorganized={unorganized}
            grouped={grouped}
            categories={categories}
            deliverables={deliverables}
            onMoveTask={handleMoveTask}
            onDone={handleDone}
            onDelete={handleDelete}
            onOpenMove={setMoveTarget}
            onOpenQualify={setQualifyTarget}
          />
        </div>
      )}

      {!isEmpty && !isDesktop && (
        <MobileOrganizer
          unorganized={unorganized}
          grouped={grouped}
          categories={categories}
          deliverables={deliverables}
          onDone={handleDone}
          onDelete={handleDelete}
          onOpenMove={setMoveTarget}
          onOpenQualify={setQualifyTarget}
        />
      )}

      {/* MoveSheet — partagé desktop + mobile */}
      {moveTarget && (
        <MoveSheet
          task={moveTarget}
          categories={categories}
          deliverables={deliverables}
          onMove={(catId, delId) => handleMove(moveTarget.id, catId, delId)}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {/* Modal de qualification */}
      {qualifyTarget && (
        <QualifyModal
          task={qualifyTarget}
          categories={categories}
          deliverables={deliverables}
          onSubmit={handleQualify}
          onClose={() => setQualifyTarget(null)}
        />
      )}
    </div>
  )
}

/* ─── Groupement ─────────────────────────────────────────────────────────── */

interface DeliverableGroup { deliverableId: string | null; deliverableName: string; tasks: Task[] }
interface CatGroup { cat: Category; deliverableGroups: DeliverableGroup[] }

function buildGroups(
  tasks: Task[],
  categories: Category[],
  deliverables: Deliverable[],
  showEmptyDeliverables = true,
): CatGroup[] {
  // Index des tâches par catégorie → livrable
  const tasksByCatAndDel = new Map<string, Map<string | null, Task[]>>()
  for (const t of tasks) {
    if (!t.category_id) continue
    if (!tasksByCatAndDel.has(t.category_id)) tasksByCatAndDel.set(t.category_id, new Map())
    const delGroup = tasksByCatAndDel.get(t.category_id)!
    if (!delGroup.has(t.deliverable_id)) delGroup.set(t.deliverable_id, [])
    delGroup.get(t.deliverable_id)!.push(t)
  }

  return categories
    .map((cat) => {
      const taskGroups = tasksByCatAndDel.get(cat.id) ?? new Map<string | null, Task[]>()
      const catDeliverables = deliverables.filter((d) => d.category_id === cat.id)

      const groups: DeliverableGroup[] = []

      // "Sans livrable" en tête — uniquement si des tâches existent sans livrable
      const noDelTasks = taskGroups.get(null) ?? []
      if (noDelTasks.length > 0) {
        groups.push({ deliverableId: null, deliverableName: 'Sans livrable', tasks: noDelTasks })
      }

      // Livrables de la catégorie — tous si showEmptyDeliverables, sinon uniquement ceux avec des tâches
      for (const del of catDeliverables) {
        const delTasks = taskGroups.get(del.id) ?? []
        if (showEmptyDeliverables || delTasks.length > 0) {
          groups.push({
            deliverableId: del.id,
            deliverableName: del.name,
            tasks: delTasks,
          })
        }
      }

      return { cat, deliverableGroups: groups }
    })
    .filter((g) => g.deliverableGroups.length > 0)
}
