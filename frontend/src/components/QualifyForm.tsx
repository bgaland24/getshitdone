/**
 * Formulaire de qualification d'une tâche.
 * Compact : Urgence+Importance sur la même ligne, Horizon+Durée sur la même ligne.
 * Horizon = date ISO (raccourcis J+1/J+7/J+25 ou sélecteur de date).
 */

import { useState, useEffect } from 'react'
import type { Task, Category, Deliverable, Urgency, Importance, Delegation, QualifyTaskPayload } from '../types'
import {
  URGENCY_LABELS,
  IMPORTANCE_LABELS,
  DELEGATION_LABELS,
  horizonShortcutDate,
  getHorizonColor,
  getHorizonLabel,
} from '../constants'
import { Badge } from './Badge'
import { RadioGroup } from './RadioGroup'

interface QualifyFormProps {
  task: Task
  categories: Category[]
  deliverables: Deliverable[]
  progress?: { current: number; total: number }
  onSubmit: (payload: QualifyTaskPayload) => Promise<void>
  onSkip?: () => void
  loading?: boolean
}

export function QualifyForm({
  task,
  categories,
  deliverables,
  progress,
  onSubmit,
  onSkip,
  loading,
}: QualifyFormProps) {
  const [urgency, setUrgency]       = useState<Urgency | null>(task.urgency)
  const [importance, setImportance] = useState<Importance | null>(task.importance)
  const [horizonDate, setHorizonDate] = useState<string>(task.horizon ?? '')
  const [delegation, setDelegation] = useState<Delegation | null>(task.delegation)
  const [estimatedMinutes, setEstimated] = useState<string>(
    task.estimated_minutes?.toString() ?? ''
  )
  const [categoryId, setCategoryId] = useState<string>(task.category_id ?? '')
  const [deliverableId, setDeliverableId] = useState<string>(task.deliverable_id ?? '')
  const [error, setError] = useState<string | null>(null)

  const filteredDeliverables = deliverables.filter((d) => d.category_id === categoryId)

  useEffect(() => {
    setUrgency(task.urgency)
    setImportance(task.importance)
    setHorizonDate(task.horizon ?? '')
    setDelegation(task.delegation)
    setEstimated(task.estimated_minutes?.toString() ?? '')
    setCategoryId(task.category_id ?? '')
    setDeliverableId(task.deliverable_id ?? '')
    setError(null)
  }, [task.id])

  useEffect(() => {
    if (deliverableId && !filteredDeliverables.find((d) => d.id === deliverableId)) {
      setDeliverableId('')
    }
  }, [categoryId])

  const isValid = urgency !== null && importance !== null && horizonDate !== ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid) { setError('Urgence, importance et horizon sont obligatoires.'); return }
    setError(null)
    await onSubmit({
      urgency: urgency!,
      importance: importance!,
      horizon: horizonDate,
      delegation: delegation ?? undefined,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      category_id: categoryId || null,
      deliverable_id: deliverableId || null,
    })
  }

  const horizonColor = horizonDate ? getHorizonColor(horizonDate) : '#555'

  return (
    <form onSubmit={handleSubmit}>
      {/* Barre de progression (mode session) */}
      {progress && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.06em' }}>SESSION DE QUALIFICATION</span>
            <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
              {progress.current}/{progress.total}
            </span>
          </div>
          <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px' }}>
            <div style={{
              height: '100%',
              width: `${(progress.current / progress.total) * 100}%`,
              background: 'var(--color-accent)',
              borderRadius: '2px',
              transition: 'width 0.4s',
            }} />
          </div>
        </div>
      )}

      {/* Carte de la tâche */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: '10px',
        padding: '14px 16px',
        marginBottom: '20px',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#444', letterSpacing: '0.06em' }}>TÂCHE</p>
        <p style={{ margin: 0, fontSize: '15px', color: '#f0f0f0', fontWeight: 600, lineHeight: 1.4 }}>
          {task.title}
        </p>
        {categoryId && (() => {
          const cat = categories.find((c) => c.id === categoryId)
          return cat ? <div style={{ marginTop: '6px' }}><Badge label={cat.name} color={cat.color} /></div> : null
        })()}
      </div>

      {/* Catégorie + livrable */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>CATÉGORIE</div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '7px 10px', color: categoryId ? '#f0f0f0' : '#555', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Sans catégorie</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        {categoryId && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>LIVRABLE</div>
            <select
              value={deliverableId}
              onChange={(e) => setDeliverableId(e.target.value)}
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '7px 10px', color: deliverableId ? '#f0f0f0' : '#555', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Sans livrable</option>
              {filteredDeliverables.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Urgence + Importance sur la même ligne */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <RadioGroup
          label="Urgence"
          required
          options={[
            { val: 'urgent',     label: URGENCY_LABELS.urgent,     color: '#E86B3E' },
            { val: 'non_urgent', label: URGENCY_LABELS.non_urgent },
          ]}
          value={urgency}
          onChange={(v) => setUrgency(v as Urgency | null)}
        />
        <RadioGroup
          label="Importance"
          required
          options={[
            { val: 'important',     label: IMPORTANCE_LABELS.important,     color: '#E8C93E' },
            { val: 'non_important', label: IMPORTANCE_LABELS.non_important },
          ]}
          value={importance}
          onChange={(v) => setImportance(v as Importance | null)}
        />
      </div>

      {/* Horizon + Durée */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          HORIZON <span style={{ color: '#E86B3E' }}>*</span>
          {horizonDate && (
            <span style={{ color: horizonColor, fontFamily: 'var(--font-mono)', fontSize: '10px', marginLeft: '6px' }}>
              {getHorizonLabel(horizonDate)}
            </span>
          )}
        </div>
        {/* Raccourcis pleine largeur — identique à Urgence/Importance */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {[
            { label: '1 jour', days: 1 },
            { label: '1 sem',  days: 7 },
            { label: '1 mois', days: 25 },
          ].map(({ label, days }) => {
            const val = horizonShortcutDate(days)
            const isSelected = horizonDate === val
            const color = getHorizonColor(val)
            return (
              <button
                key={days}
                type="button"
                onClick={() => setHorizonDate(val)}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? color : '#2a2a2a'}`,
                  background: isSelected ? color + '22' : 'transparent',
                  color: isSelected ? color : '#555',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.15s',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {/* Date + Durée sur la même ligne */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="date"
            value={horizonDate}
            onChange={(e) => setHorizonDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              flex: 1,
              background: '#1a1a1a',
              border: `1px solid ${horizonDate ? horizonColor + '60' : '#2a2a2a'}`,
              borderRadius: '6px',
              padding: '7px 10px',
              color: horizonDate ? horizonColor : '#555',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              minWidth: 0,
              boxSizing: 'border-box',
              colorScheme: 'dark',
            }}
          />
          <input
            type="number"
            min={1}
            max={480}
            value={estimatedMinutes}
            onChange={(e) => setEstimated(e.target.value)}
            placeholder="DURÉE"
            style={{
              flex: 1,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '6px',
              padding: '7px 6px',
              color: estimatedMinutes ? '#f0f0f0' : '#555',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              minWidth: 0,
              textAlign: 'center',
            }}
          />
        </div>
      </div>

      <RadioGroup
        label="Délégation"
        options={(['non_delegable', 'delegable', 'delegated'] as Delegation[]).map((d) => ({
          val: d, label: DELEGATION_LABELS[d],
        }))}
        value={delegation}
        onChange={(v) => setDelegation(v as Delegation | null)}
      />

      {error && <p style={{ fontSize: '13px', color: '#f87171', marginBottom: '12px' }}>{error}</p>}

      {/* Actions sticky */}
      <div style={{
        display: 'flex',
        gap: '10px',
        position: 'sticky',
        bottom: '64px',
        background: 'var(--color-bg-app)',
        paddingTop: '12px',
        paddingBottom: '16px',
        marginTop: '8px',
      }}>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              background: '#0f0f0f',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              padding: '14px',
              color: '#888',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Passer →
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || loading}
          style={{
            flex: 2,
            background: isValid ? 'var(--color-accent)' : '#1a1a1a',
            color: isValid ? '#000' : '#333',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Mise à jour…' : 'Mettre à jour ›'}
        </button>
      </div>
    </form>
  )
}
