/**
 * Formulaire de capture détaillée — saisie du titre + qualification en une seule étape.
 * Compact : Urgence+Importance sur la même ligne, Horizon+Durée sur la même ligne.
 */

import { useRef, useEffect, useState } from 'react'
import type { Category, Deliverable, Urgency, Importance, Delegation, CreateTaskPayload } from '../types'
import {
  URGENCY_LABELS,
  IMPORTANCE_LABELS,
  DELEGATION_LABELS,
  horizonShortcutDate,
  getHorizonColor,
  getHorizonLabel,
} from '../constants'
import { RadioGroup } from './RadioGroup'

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '6px',
  padding: '8px 10px',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
}

interface DetailedCaptureFormProps {
  categories: Category[]
  deliverables: Deliverable[]
  onSubmit: (payload: CreateTaskPayload) => Promise<void>
  loading?: boolean
}

export function DetailedCaptureForm({ categories, deliverables, onSubmit, loading }: DetailedCaptureFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle]               = useState('')
  const [categoryId, setCategoryId]     = useState('')
  const [deliverableId, setDeliverableId] = useState('')
  const [urgency, setUrgency]           = useState<Urgency | null>(null)
  const [importance, setImportance]     = useState<Importance | null>(null)
  const [horizonDate, setHorizonDate]   = useState('')
  const [delegation, setDelegation]     = useState<Delegation | null>(null)
  const [estimatedMinutes, setEstimated] = useState('')
  const [error, setError]               = useState<string | null>(null)

  const filteredDeliverables = deliverables.filter((d) => d.category_id === categoryId)
  const isValid = title.trim() !== '' && urgency !== null && importance !== null && horizonDate !== ''
  const horizonColor = horizonDate ? getHorizonColor(horizonDate) : '#ffffff'

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (deliverableId && !filteredDeliverables.find((d) => d.id === deliverableId)) {
      setDeliverableId('')
    }
  }, [categoryId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid) { setError('Titre, urgence, importance et horizon sont obligatoires.'); return }
    setError(null)
    await onSubmit({
      title: title.trim(),
      category_id: categoryId || null,
      deliverable_id: deliverableId || null,
      urgency: urgency!,
      importance: importance!,
      horizon: horizonDate,
      delegation: delegation ?? undefined,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
    })
    setTitle(''); setCategoryId(''); setDeliverableId('')
    setUrgency(null); setImportance(null); setHorizonDate('')
    setDelegation(null); setEstimated('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} style={{ paddingBottom: '120px' }}>
      {/* Titre */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
          TÂCHE <span style={{ color: '#E86B3E' }}>*</span>
        </div>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Description de la tâche…"
          disabled={loading}
          style={{
            width: '100%',
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
            color: '#f0f0f0',
            fontSize: '15px',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Catégorie + livrable */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>CATÉGORIE</div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ ...SELECT_STYLE, color: categoryId ? '#f0f0f0' : '#ffffff' }}>
            <option value="">Sans catégorie</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {categoryId && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>LIVRABLE</div>
            <select value={deliverableId} onChange={(e) => setDeliverableId(e.target.value)} style={{ ...SELECT_STYLE, color: deliverableId ? '#f0f0f0' : '#ffffff' }}>
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
        <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          HORIZON <span style={{ color: '#E86B3E' }}>*</span>
          {horizonDate && (
            <span style={{ color: horizonColor, fontFamily: 'var(--font-mono)', fontSize: '10px', marginLeft: '6px' }}>
              {getHorizonLabel(horizonDate)}
            </span>
          )}
        </div>
        {/* Raccourcis pleine largeur — identique à Urgence/Importance */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {[{ label: '1 jour', days: 1 }, { label: '1 sem', days: 7 }, { label: '1 mois', days: 25 }].map(({ label, days }) => {
            const val = horizonShortcutDate(days)
            const isSelected = horizonDate === val
            const color = getHorizonColor(val)
            return (
              <button key={days} type="button" onClick={() => setHorizonDate(val)}
                style={{
                  flex: 1,
                  padding: '7px 6px', borderRadius: '6px',
                  border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.3)'}`,
                  background: isSelected ? color + '22' : 'transparent',
                  color: isSelected ? color : '#ffffff',
                  fontSize: '12px', cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                  textAlign: 'center', whiteSpace: 'nowrap',
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
              border: `1px solid ${horizonDate ? horizonColor + '60' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: '6px', padding: '7px 10px',
              color: horizonDate ? horizonColor : '#ffffff',
              fontSize: '13px', fontFamily: 'var(--font-mono)',
              outline: 'none', minWidth: 0, boxSizing: 'border-box',
              colorScheme: 'dark',
            }}
          />
          <input
            type="number" min={1} max={480}
            value={estimatedMinutes}
            onChange={(e) => setEstimated(e.target.value)}
            placeholder="DURÉE"
            style={{
              flex: 1,
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px', padding: '7px 6px',
              color: estimatedMinutes ? '#f0f0f0' : '#ffffff',
              fontSize: '12px', fontFamily: 'var(--font-mono)',
              outline: 'none', minWidth: 0, textAlign: 'center',
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

      <div style={{ position: 'sticky', bottom: '64px', background: 'var(--color-bg-app)', paddingTop: '12px', paddingBottom: '16px', marginTop: '8px' }}>
        <button
          type="submit"
          disabled={!isValid || loading}
          style={{
            width: '100%',
            background: isValid ? 'var(--color-accent)' : '#1a1a1a',
            color: isValid ? '#000' : '#ffffff',
            border: 'none', borderRadius: '8px', padding: '14px',
            fontSize: '14px', fontWeight: 700,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Ajout…' : 'Ajouter et qualifier ›'}
        </button>
      </div>
    </form>
  )
}
