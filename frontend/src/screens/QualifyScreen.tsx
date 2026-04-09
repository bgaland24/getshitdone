/**
 * Écran Qualifier — session de qualification en mode "flash cards".
 * Présente une tâche à la fois avec barre de progression.
 */

import { useEffect, useState } from 'react'
import { fetchTasks, qualifyTask } from '../api/tasks'
import { fetchCategories, fetchDeliverables } from '../api/categories'
import { useTaskStore } from '../store/taskStore'
import { QualifyForm } from '../components/QualifyForm'
import type { Task, QualifyTaskPayload } from '../types'

export function QualifyScreen() {
  const { tasks, categories, deliverables, setTasks, setCategories, setDeliverables, updateTask: storeUpdate } = useTaskStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)

  /** Toutes les tâches non qualifiées, hors done/cancelled */
  const queue: Task[] = tasks.filter(
    (t) => !t.is_qualified && t.status !== 'done' && t.status !== 'cancelled'
  )

  const currentTask = queue[currentIndex] ?? null
  const total = queue.length

  /* ── Chargement initial ── */
  useEffect(() => {
    fetchCategories().then(setCategories)
    fetchDeliverables().then(setDeliverables)
    // Charger toutes les tâches non qualifiées (tous statuts sauf done/cancelled)
    fetchTasks().then((fetched) => {
      setTasks(fetched)
      setCurrentIndex(0)
      setSessionDone(false)
    })
  }, [])

  async function handleQualify(payload: QualifyTaskPayload) {
    if (!currentTask) return
    setLoading(true)
    try {
      const updated = await qualifyTask(currentTask.id, payload)
      storeUpdate(updated)
      advance()
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    advance()
  }

  function advance() {
    if (currentIndex + 1 >= total) {
      setSessionDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  /* ── Session terminée ── */
  if (sessionDone || (total === 0 && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-accent-dim)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {total === 0 ? 'Rien à qualifier' : 'Session terminée !'}
        </p>
        <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {total === 0
            ? 'Toutes tes tâches sont qualifiées.'
            : `${total} tâche${total > 1 ? 's' : ''} qualifiée${total > 1 ? 's' : ''}.`}
        </p>
        {sessionDone && (
          <button
            onClick={() => { setCurrentIndex(0); setSessionDone(false) }}
            className="mt-2 px-6 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-medium)' }}
          >
            Recommencer
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px 0' }}>
      {/* ── Formulaire de qualification ── */}
      {currentTask && (
        <QualifyForm
          task={currentTask}
          categories={categories}
          deliverables={deliverables}
          progress={{ current: currentIndex + 1, total }}
          onSubmit={handleQualify}
          onSkip={handleSkip}
          loading={loading}
        />
      )}
    </div>
  )
}
