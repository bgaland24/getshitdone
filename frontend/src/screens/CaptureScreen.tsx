/**
 * Écran Capturer — saisie rapide + liste des captures de la session.
 */

import { useEffect, useRef, useState } from 'react'
import { fetchTasks, createTask, updateTask } from '../api/tasks'
import { fetchCategories, fetchDeliverables } from '../api/categories'
import { useTaskStore } from '../store/taskStore'
import { DetailedCaptureForm } from '../components/DetailedCaptureForm'
import type { Task, CreateTaskPayload } from '../types'

export function CaptureScreen() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDetailed, setIsDetailed] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [recentCaptures, setRecentCaptures] = useState<Task[]>([])

  const {
    tasks, categories, deliverables,
    setTasks, setCategories, setDeliverables,
    addTask, updateTask: storeUpdateTask,
  } = useTaskStore()

  const filteredDeliverables = deliverables.filter((d) => d.category_id === selectedCategoryId)

  useEffect(() => {
    Promise.all([fetchTasks({ status: 'new' }), fetchCategories(), fetchDeliverables()])
      .then(([t, c, d]) => { setTasks(t); setCategories(c); setDeliverables(d) })
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelectedDeliverableId('') }, [selectedCategoryId])

  async function handleAdd() {
    const trimmed = title.trim()
    if (!trimmed || submitting) return

    /* Découpe sur ";" et ignore les segments vides */
    const titles = trimmed.split(';').map((s) => s.trim()).filter(Boolean)
    if (titles.length === 0) return

    setSubmitting(true)
    try {
      const tasks = await Promise.all(
        titles.map((t) =>
          createTask({
            title: t,
            category_id: selectedCategoryId || null,
            deliverable_id: selectedDeliverableId || null,
          })
        )
      )
      tasks.forEach(addTask)
      setRecentCaptures((prev) => [...tasks.reverse(), ...prev].slice(0, 5))
      setTitle('')
      setSelectedCategoryId('')
      setSelectedDeliverableId('')
      inputRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDetailedAdd(payload: CreateTaskPayload) {
    setSubmitting(true)
    try {
      const task = await createTask(payload)
      addTask(task)
      setRecentCaptures((prev) => [task, ...prev.slice(0, 4)])
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssignCategory(task: Task, categoryId: string) {
    try {
      const updated = await updateTask(task.id, { category_id: categoryId || null, deliverable_id: null })
      storeUpdateTask(updated)
      setRecentCaptures((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    } catch { /* silencieux */ }
  }

  return (
    <div style={{ padding: '16px 20px 0' }}>
      {/* Sous-titre + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#ffffff', fontWeight: 500 }}>
          {isDetailed ? 'Saisie détaillée avec qualification.' : 'Videz votre tête. Organisez plus tard.'}
        </p>
        <button
          onClick={() => setIsDetailed((v) => !v)}
          style={{
            background: 'none',
            border: `1px solid ${isDetailed ? 'var(--color-accent)' : '#2a2a2a'}`,
            borderRadius: '6px',
            padding: '6px 12px',
            color: isDetailed ? 'var(--color-accent)' : '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {isDetailed ? 'RAPIDE' : 'DÉTAILLÉ'}
        </button>
      </div>

      {/* Mode détaillé */}
      {isDetailed ? (
        <DetailedCaptureForm
          categories={categories}
          deliverables={deliverables}
          onSubmit={handleDetailedAdd}
          loading={submitting}
        />
      ) : (
        /* Mode rapide */
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nouvelle tâche (séparées par des ;)…"
            disabled={submitting}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f0f0',
              fontSize: '16px',
              marginBottom: '14px',
              boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
            }}
          />

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '5px',
                padding: '6px 10px',
                color: selectedCategoryId ? '#f0f0f0' : '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              <option value="">Sans catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {selectedCategoryId && filteredDeliverables.length > 0 && (
              <select
                value={selectedDeliverableId}
                onChange={(e) => setSelectedDeliverableId(e.target.value)}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '5px',
                  padding: '6px 10px',
                  color: '#f0f0f0',
                  fontSize: '12px',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="">Sans livrable</option>
                {filteredDeliverables.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleAdd}
              disabled={!title.trim() || submitting}
              style={{
                marginLeft: 'auto',
                background: title.trim() ? 'var(--color-accent)' : '#1a1a1a',
                color: title.trim() ? '#000' : '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: title.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              + Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Captures de la session */}
      {recentCaptures.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>
            AJOUTÉES CETTE SESSION
          </p>
          {recentCaptures.map((t) => {
            const cat = categories.find((c) => c.id === t.category_id)
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 0',
                  borderBottom: '1px solid #111',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: cat ? cat.color : '#333',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', color: '#ffffff', flex: 1 }}>{t.title}</span>

                {cat ? (
                  <span style={{ fontSize: '10px', color: cat.color }}>{cat.name}</span>
                ) : (
                  /* Select inline pour assigner une catégorie */
                  <select
                    defaultValue=""
                    onChange={(e) => handleAssignCategory(t, e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '10px',
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    <option value="" disabled>Non organisée</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tâches non organisées existantes */}
      {tasks.filter((t) => t.status === 'new' && !recentCaptures.find((r) => r.id === t.id)).length > 0 && (
        <div style={{ marginTop: recentCaptures.length > 0 ? '24px' : 0 }}>
          <p style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '12px' }}>
            NOUVELLES — {tasks.filter((t) => t.status === 'new').length}
          </p>
          {tasks.filter((t) => t.status === 'new' && !recentCaptures.find((r) => r.id === t.id)).map((t) => {
            const cat = categories.find((c) => c.id === t.category_id)
            return (
              <div
                key={t.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #111' }}
              >
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#333', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#ffffff', flex: 1 }}>{t.title}</span>
                {cat
                  ? <span style={{ fontSize: '10px', color: cat.color }}>{cat.name}</span>
                  : <span style={{ fontSize: '10px', color: '#ffffff' }}>Non organisée</span>
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
