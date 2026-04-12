/**
 * Écran Priorités — deux onglets Aujourd'hui / Demain.
 * Chaque onglet affiche les tâches épinglées sur cette date en haut,
 * puis la liste triée des tâches qualifiées non épinglées en dessous.
 * Tri configurable via les préférences utilisateur.
 */

import { useEffect, /* useRef, */ useState } from 'react'
import { fetchTasks, /* startTask, pauseTask, */ doneTask, undoneTask, pinTask, unpinTask, qualifyTask } from '../api/tasks'
import { fetchCategories, fetchDeliverables } from '../api/categories'
// import { fetchSessions } from '../api/sessions'  // désactivé : timer démarrer/pause
import { fetchPreferences } from '../api/preferences'
import { useTaskStore } from '../store/taskStore'
import { Badge } from '../components/Badge'
import { QualifyForm } from '../components/QualifyForm'
import { getHorizonColor, getHorizonLabel, MAX_PINNED_PER_DATE } from '../constants'
import type { Task, /* WorkSession, */ SortAxis, Category, QualifyTaskPayload } from '../types'

type Mode = 'today' | 'tomorrow'

/** Retourne la date ISO du jour (today) ou de demain (tomorrow) */
function modeDate(mode: Mode): string {
  const d = new Date()
  if (mode === 'tomorrow') d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

/** Tri des tâches selon les axes configurés */
function sortTasks(tasks: Task[], axes: SortAxis[]): Task[] {
  const delegOrder: Record<string, number> = { delegable: 0, non_delegable: 1, delegated: 2 }
  const urgOrder:   Record<string, number> = { urgent: 0, non_urgent: 1 }
  const impOrder:   Record<string, number> = { important: 0, non_important: 1 }

  return [...tasks].sort((a, b) => {
    for (const axis of axes) {
      let cmp = 0
      if (axis === 'horizon') {
        const ah = a.horizon ?? '9999-12-31'
        const bh = b.horizon ?? '9999-12-31'
        cmp = ah.localeCompare(bh)
      } else if (axis === 'delegation') {
        cmp = (delegOrder[a.delegation ?? ''] ?? 3) - (delegOrder[b.delegation ?? ''] ?? 3)
      } else if (axis === 'urgency') {
        cmp = (urgOrder[a.urgency ?? ''] ?? 2) - (urgOrder[b.urgency ?? ''] ?? 2)
      } else if (axis === 'importance') {
        cmp = (impOrder[a.importance ?? ''] ?? 2) - (impOrder[b.importance ?? ''] ?? 2)
      }
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

export function PrioritiesScreen() {
  const [mode, setMode] = useState<Mode>('today')
  const [sortAxes, setSortAxes] = useState<SortAxis[]>(['horizon', 'delegation', 'urgency', 'importance'])
  const [loading, setLoading] = useState(false)
  const [requalifyTask, setRequalifyTask] = useState<Task | null>(null)
  const { tasks, categories, deliverables, setTasks, setCategories, setDeliverables, updateTask: storeUpdate } = useTaskStore()
  // const [activeSession, setActiveSession] = useState<WorkSession | null>(null) // désactivé : timer démarrer/pause

  const todayStr    = modeDate('today')
  const tomorrowStr = modeDate('tomorrow')
  const currentDate = modeDate(mode)

  /** Tâches épinglées sur la date affichée */
  const pinnedTasks = tasks.filter((t) => t.priority_current_date === currentDate)

  /** Tâches qualifiées non épinglées — exclut les épinglées sur les deux dates */
  const qualifiedTasks = sortTasks(
    tasks.filter((t) =>
      t.is_qualified &&
      t.status !== 'done' &&
      t.status !== 'cancelled' &&
      t.priority_current_date !== todayStr &&
      t.priority_current_date !== tomorrowStr
    ),
    sortAxes,
  )

  const pinnedCountForDate = pinnedTasks.length
  const canPin = pinnedCountForDate < MAX_PINNED_PER_DATE

  useEffect(() => {
    const DEFAULT_SORT_AXES: SortAxis[] = ['horizon', 'delegation', 'urgency', 'importance']
    // fetchPreferences peut retourner 401 si le token n'est pas encore disponible
    // au rechargement de page — on fallback sur les valeurs par défaut silencieusement.
    const safeFetchPreferences = () =>
      fetchPreferences().catch(() => ({ user_id: '', sort_axes: DEFAULT_SORT_AXES }))

    Promise.all([fetchTasks(), fetchCategories(), fetchDeliverables(), safeFetchPreferences()])
      .then(([t, c, d, prefs]) => {
        setTasks(t)
        setCategories(c)
        setDeliverables(d)
        setSortAxes(prefs.sort_axes)
      })
  }, [])

  // async function handleStart(task: Task) {
  //   setLoading(true)
  //   try {
  //     const result = await startTask(task.id)
  //     storeUpdate(result.task)
  //     const sessions = await fetchSessions({ date: todayStr })
  //     setActiveSession(sessions.find((s) => s.stopped_at === null) ?? null)
  //   } finally { setLoading(false) }
  // }

  // async function handlePause(task: Task) {
  //   setLoading(true)
  //   try {
  //     const result = await pauseTask(task.id)
  //     storeUpdate(result.task)
  //     setActiveSession(null)
  //   } finally { setLoading(false) }
  // }

  async function handleDone(task: Task) {
    setLoading(true)
    try {
      storeUpdate(await doneTask(task.id))
      // setActiveSession(null) // désactivé : timer démarrer/pause
    } finally { setLoading(false) }
  }

  async function handleUndone(task: Task) {
    setLoading(true)
    try { storeUpdate(await undoneTask(task.id)) }
    finally { setLoading(false) }
  }

  async function handleRequalify(task: Task, payload: QualifyTaskPayload) {
    setLoading(true)
    try {
      storeUpdate(await qualifyTask(task.id, payload))
      setRequalifyTask(null)
    } finally { setLoading(false) }
  }

  async function handlePin(task: Task) {
    if (!canPin) return
    setLoading(true)
    try { storeUpdate(await pinTask(task.id, currentDate)) }
    finally { setLoading(false) }
  }

  async function handleUnpin(task: Task) {
    setLoading(true)
    try { storeUpdate(await unpinTask(task.id)) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '16px 20px 0' }}>
      {/* Toggle Aujourd'hui / Demain */}
      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ffffff', marginBottom: '20px' }}>
        {(['today', 'tomorrow'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 700,
              background: mode === m ? 'var(--color-accent)' : 'transparent',
              color: mode === m ? '#000' : '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {m === 'today' ? "Aujourd'hui" : 'Demain'}
          </button>
        ))}
      </div>

      {/* Section épinglées */}
      {pinnedTasks.length > 0 && (
        <section style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px' }}>
            ÉPINGLÉES — {pinnedCountForDate}/{MAX_PINNED_PER_DATE}
          </div>
          {pinnedTasks.map((task) => (
            <PriorityTaskCard
              key={task.id}
              task={task}
              category={categories.find((c) => c.id === task.category_id) ?? null}
              isPinned
              // isActive={task.status === 'in_progress'}      // désactivé : timer
              // activeSession={task.status === 'in_progress' ? activeSession : null}
              loading={loading}
              // onStart={handleStart}   // désactivé : timer
              // onPause={handlePause}   // désactivé : timer
              onDone={handleDone}
              onUndone={handleUndone}
              onUnpin={handleUnpin}
              onRequalify={(t) => setRequalifyTask(t)}
            />
          ))}
        </section>
      )}

      {/* Section liste triée */}
      <section>
        <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>À FAIRE</span>
          {!canPin && <span style={{ color: '#E86B3E', fontWeight: 400 }}>Max {MAX_PINNED_PER_DATE} épinglées</span>}
        </div>

        {qualifiedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#ffffff' }}>
            <p style={{ fontSize: '13px' }}>Aucune tâche qualifiée disponible.</p>
          </div>
        ) : (
          qualifiedTasks.map((task) => (
            <PriorityTaskCard
              key={task.id}
              task={task}
              category={categories.find((c) => c.id === task.category_id) ?? null}
              isPinned={false}
              // isActive={task.status === 'in_progress'}      // désactivé : timer
              // activeSession={task.status === 'in_progress' ? activeSession : null}
              loading={loading}
              canPin={canPin}
              // onStart={handleStart}   // désactivé : timer
              // onPause={handlePause}   // désactivé : timer
              onDone={handleDone}
              onUndone={handleUndone}
              onPin={handlePin}
              onRequalify={(t) => setRequalifyTask(t)}
            />
          ))
        )}
      </section>

      {/* Barre sticky en bas */}
      <div style={{
        position: 'sticky',
        bottom: '64px',
        background: 'var(--color-bg-app)',
        paddingTop: '12px',
        paddingBottom: '16px',
        marginTop: '8px',
      }}>
        <div style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                maxWidth: '80px',
                height: '6px',
                borderRadius: '3px',
                background: i < pinnedCountForDate ? 'var(--color-accent)' : '#1a1a1a',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Modal de requalification */}
      {requalifyTask && (
        <div
          onClick={() => setRequalifyTask(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              background: '#111', borderRadius: '16px 16px 0 0',
              padding: '20px 20px 40px',
              borderTop: '1px solid #ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600, letterSpacing: '0.08em' }}>RE-QUALIFIER</span>
              <button onClick={() => setRequalifyTask(null)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#ffffff' }}>{requalifyTask.title}</p>
            <QualifyForm
              task={requalifyTask}
              categories={categories}
              deliverables={deliverables}
              onSubmit={(payload) => handleRequalify(requalifyTask, payload)}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Carte de tâche ─────────────────────────────────────────────────────── */

function PriorityTaskCard({
  task,
  category,
  isPinned,
  // isActive,       // désactivé : timer démarrer/pause
  // activeSession,  // désactivé : timer démarrer/pause
  loading,
  canPin,
  // onStart,        // désactivé : timer démarrer/pause
  // onPause,        // désactivé : timer démarrer/pause
  onDone,
  onUndone,
  onPin,
  onUnpin,
  onRequalify,
}: {
  task: Task
  category: Category | null
  isPinned: boolean
  // isActive: boolean             // désactivé : timer démarrer/pause
  // activeSession: WorkSession | null  // désactivé : timer démarrer/pause
  loading: boolean
  canPin?: boolean
  // onStart: (t: Task) => void    // désactivé : timer démarrer/pause
  // onPause?: (t: Task) => void   // désactivé : timer démarrer/pause
  onDone: (t: Task) => void
  onUndone: (t: Task) => void
  onPin?: (t: Task) => void
  onUnpin?: (t: Task) => void
  onRequalify: (t: Task) => void
}) {
  const isDone = task.status === 'done'
  const catColor = category?.color ?? '#ffffff'

  // Désactivé : timer en temps réel sur la session active
  // const [elapsed, setElapsed] = useState(0)
  // const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // useEffect(() => {
  //   if (isActive && activeSession) {
  //     const start = new Date(activeSession.started_at).getTime()
  //     setElapsed(Math.floor((Date.now() - start) / 1000))
  //     intervalRef.current = setInterval(() => {
  //       setElapsed(Math.floor((Date.now() - start) / 1000))
  //     }, 1000)
  //   } else {
  //     if (intervalRef.current) clearInterval(intervalRef.current)
  //     setElapsed(0)
  //   }
  //   return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // }, [isActive, activeSession?.started_at])
  // const fmt = (s: number) =>
  //   `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div style={{
      background: isDone ? '#0d0d0d' : '#0f0f0f',
      border: `1px solid ${isPinned ? catColor + '33' : '#1e1e1e'}`,
      borderLeft: `3px solid ${isDone ? '#ffffff' : isPinned ? catColor : '#ffffff'}`,
      borderRadius: '8px',
      padding: '12px 14px',
      marginBottom: '8px',
      opacity: isDone ? 0.4 : 1,
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
            {category && <Badge label={category.name} color={category.color} />}
            {task.horizon && <Badge label={getHorizonLabel(task.horizon)} color={getHorizonColor(task.horizon)} />}
          </div>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: isDone ? '#ffffff' : '#d0d0d0',
            fontWeight: 500,
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            {task.title}
          </p>
          {/* Désactivé : affichage du chrono en cours de session
          {isActive && (
            <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '22px', color: catColor }}>
              {fmt(elapsed)}
            </div>
          )} */}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Désactivé : boutons Démarrer / Pause (timer de session)
          {!isDone && !isActive && (
            <button
              onClick={() => onStart(task)}
              disabled={loading}
              style={{ background: catColor, color: '#000', border: 'none', borderRadius: '5px', padding: '6px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minWidth: '90px' }}
            >
              ▶ Démarrer
            </button>
          )}
          {!isDone && isActive && onPause && (
            <button
              onClick={() => onPause(task)}
              disabled={loading}
              title="Mettre en pause"
              style={{ background: 'transparent', color: '#ffffff', border: '1px solid #ffffff', borderRadius: '5px', padding: '6px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minWidth: '90px' }}
            >
              ⏸ Pause
            </button>
          )} */}

          {/* Re-qualifier */}
          {!isDone && (
            <button
              onClick={() => onRequalify(task)}
              disabled={loading}
              title="Re-qualifier cette tâche"
              style={{ background: 'transparent', color: '#ffffff', border: '1px solid #ffffff', borderRadius: '5px', padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}
            >
              ✎
            </button>
          )}

          {/* Terminer / Rouvrir */}
          {!isDone && (
            <button
              onClick={() => onDone(task)}
              disabled={loading}
              style={{ background: '#1e3a2a', color: '#4CAF7D', border: '1px solid #4CAF7D44', borderRadius: '5px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              ✓
            </button>
          )}
          {isDone && (
            <button
              onClick={() => onUndone(task)}
              disabled={loading}
              title="Marquer comme non terminée"
              style={{ background: 'transparent', color: '#ffffff', border: '1px solid #ffffff', borderRadius: '5px', padding: '6px 10px', fontSize: '13px', cursor: 'pointer' }}
            >
              ↩
            </button>
          )}

          {/* Épingler / désépingler — toujours le plus à droite */}
          {isPinned && onUnpin && (
            <button
              onClick={() => onUnpin(task)}
              disabled={loading}
              title="Désépingler"
              style={{ background: 'transparent', color: catColor, border: `1px solid ${catColor}44`, borderRadius: '5px', padding: '6px 8px', fontSize: '13px', cursor: 'pointer' }}
            >
              📌
            </button>
          )}
          {!isPinned && onPin && (
            <button
              onClick={() => canPin && onPin(task)}
              disabled={loading || !canPin}
              title={canPin ? 'Épingler' : 'Maximum atteint'}
              style={{ background: 'transparent', color: canPin ? '#ffffff' : '#ffffff', border: '1px solid #ffffff', borderRadius: '5px', padding: '6px 8px', fontSize: '13px', cursor: canPin ? 'pointer' : 'not-allowed' }}
            >
              📌
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
