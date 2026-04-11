/**
 * Écran de gestion des catégories et livrables.
 * Accessible depuis le header (icône ⚙).
 * Permet : créer / renommer / supprimer catégories et livrables,
 *          déplacer un livrable d'une catégorie à l'autre.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchDeliverables,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
} from '../api/categories'
import { useTaskStore } from '../store/taskStore'
import type { Category, Deliverable } from '../types'

/* ─── Palette de couleurs proposées ──────────────────────────────────── */
const COLOR_PALETTE = [
  '#E86B3E', '#E8C93E', '#4CAF7D', '#7B8FE8',
  '#E87B9E', '#4CC9F0', '#F4A261', '#A8DADC',
]

export function ManageScreen() {
  const navigate = useNavigate()
  const { categories, deliverables, setCategories, setDeliverables } = useTaskStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchCategories(), fetchDeliverables()])
      .then(([c, d]) => { setCategories(c); setDeliverables(d) })
  }, [])

  /* ── Helpers ── */
  async function run(fn: () => Promise<void>) {
    setLoading(true); setError(null)
    try { await fn() }
    catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur')
    }
    finally { setLoading(false) }
  }

  /* ── Catégories ── */
  async function handleCreateCategory(name: string, color: string, target: number) {
    await run(async () => {
      const cat = await createCategory({ name, color, weekly_target_minutes: target })
      setCategories([...categories, cat])
    })
  }

  async function handleUpdateCategory(id: string, patch: { name?: string; color?: string; weekly_target_minutes?: number }) {
    await run(async () => {
      const updated = await updateCategory(id, patch)
      setCategories(categories.map((c) => c.id === id ? updated : c))
    })
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ? Les tâches associées perdront leur catégorie et livrable.')) return
    await run(async () => {
      await deleteCategory(id)
      setCategories(categories.filter((c) => c.id !== id))
      setDeliverables(deliverables.filter((d) => d.category_id !== id))
    })
  }

  /* ── Livrables ── */
  async function handleCreateDeliverable(name: string, categoryId: string) {
    await run(async () => {
      const del = await createDeliverable({ name, category_id: categoryId })
      setDeliverables([...deliverables, del])
    })
  }

  async function handleRenameDeliverable(id: string, name: string) {
    await run(async () => {
      const updated = await updateDeliverable(id, { name })
      setDeliverables(deliverables.map((d) => d.id === id ? updated : d))
    })
  }

  async function handleMoveDeliverable(id: string, newCategoryId: string) {
    await run(async () => {
      const updated = await updateDeliverable(id, { category_id: newCategoryId })
      setDeliverables(deliverables.map((d) => d.id === id ? updated : d))
    })
  }

  async function handleDeleteDeliverable(id: string) {
    if (!confirm('Supprimer ce livrable ? Les tâches associées perdront leur livrable (catégorie conservée).')) return
    await run(async () => {
      await deleteDeliverable(id)
      setDeliverables(deliverables.filter((d) => d.id !== id))
    })
  }

  return (
    <div style={{ padding: '20px 20px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '20px', cursor: 'pointer', padding: 0 }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#f0f0f0', fontWeight: 700 }}>
          Catégories & livrables
        </h2>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* ── Liste des catégories ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            deliverables={deliverables.filter((d) => d.category_id === cat.id)}
            allCategories={categories}
            loading={loading}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onCreateDeliverable={handleCreateDeliverable}
            onRenameDeliverable={handleRenameDeliverable}
            onMoveDeliverable={handleMoveDeliverable}
            onDeleteDeliverable={handleDeleteDeliverable}
          />
        ))}
      </div>

      {/* ── Créer une catégorie ── */}
      <CreateCategoryForm loading={loading} onCreate={handleCreateCategory} />
    </div>
  )
}

/* ─── Carte catégorie ────────────────────────────────────────────────── */

interface CategoryCardProps {
  category: Category
  deliverables: Deliverable[]
  allCategories: Category[]
  loading: boolean
  onUpdateCategory: (id: string, patch: { name?: string; color?: string; weekly_target_minutes?: number }) => void
  onDeleteCategory: (id: string) => void
  onCreateDeliverable: (name: string, categoryId: string) => void
  onRenameDeliverable: (id: string, name: string) => void
  onMoveDeliverable: (id: string, categoryId: string) => void
  onDeleteDeliverable: (id: string) => void
}

function CategoryCard({
  category, deliverables, allCategories, loading,
  onUpdateCategory, onDeleteCategory,
  onCreateDeliverable, onRenameDeliverable, onMoveDeliverable, onDeleteDeliverable,
}: CategoryCardProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(category.name)
  const [targetValue, setTargetValue] = useState(category.weekly_target_minutes.toString())
  const [addingDel, setAddingDel] = useState(false)
  const [newDelName, setNewDelName] = useState('')

  function commitName() {
    setEditingName(false)
    if (nameValue.trim() && nameValue !== category.name)
      onUpdateCategory(category.id, { name: nameValue.trim() })
  }

  function commitTarget() {
    const val = parseInt(targetValue, 10)
    if (!isNaN(val) && val !== category.weekly_target_minutes)
      onUpdateCategory(category.id, { weekly_target_minutes: val })
  }

  return (
    <div style={{ background: '#0f0f0f', border: `1px solid ${category.color}33`, borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header catégorie */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Sélecteur couleur */}
        <ColorPicker
          value={category.color}
          onChange={(color) => onUpdateCategory(category.id, { color })}
        />

        {/* Nom */}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: '15px', fontWeight: 600 }}
          />
        ) : (
          <span
            onClick={() => setEditingName(true)}
            style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: '#f0f0f0', cursor: 'text' }}
          >
            {category.name}
          </span>
        )}

        {/* Objectif hebdo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            value={targetValue}
            min={0}
            onChange={(e) => setTargetValue(e.target.value)}
            onBlur={commitTarget}
            onKeyDown={(e) => e.key === 'Enter' && commitTarget()}
            style={{
              width: '52px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              padding: '3px 6px',
              color: '#ffffff',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'right',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '10px', color: '#ffffff' }}>min/sem</span>
        </div>

        {/* Supprimer catégorie */}
        <button
          onClick={() => onDeleteCategory(category.id)}
          disabled={loading}
          style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}
          title="Supprimer la catégorie"
        >
          ✕
        </button>
      </div>

      {/* Liste des livrables */}
      <div style={{ padding: '8px 16px' }}>
        {deliverables.length === 0 && !addingDel && (
          <p style={{ fontSize: '12px', color: '#ffffff', margin: '6px 0' }}>Aucun livrable</p>
        )}

        {deliverables.map((del) => (
          <DeliverableRow
            key={del.id}
            deliverable={del}
            allCategories={allCategories}
            loading={loading}
            onRename={onRenameDeliverable}
            onMove={onMoveDeliverable}
            onDelete={onDeleteDeliverable}
          />
        ))}

        {/* Ajouter un livrable */}
        {addingDel ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0' }}>
            <input
              autoFocus
              value={newDelName}
              onChange={(e) => setNewDelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newDelName.trim()) {
                  onCreateDeliverable(newDelName.trim(), category.id)
                  setNewDelName(''); setAddingDel(false)
                }
                if (e.key === 'Escape') { setAddingDel(false); setNewDelName('') }
              }}
              placeholder="Nom du livrable…"
              style={{ flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '5px', padding: '6px 10px', color: '#f0f0f0', fontSize: '13px', outline: 'none' }}
            />
            <button
              onClick={() => {
                if (newDelName.trim()) {
                  onCreateDeliverable(newDelName.trim(), category.id)
                  setNewDelName(''); setAddingDel(false)
                }
              }}
              style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              OK
            </button>
            <button
              onClick={() => { setAddingDel(false); setNewDelName('') }}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingDel(true)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '12px', cursor: 'pointer', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span style={{ fontSize: '14px' }}>+</span> Ajouter un livrable
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Ligne livrable ─────────────────────────────────────────────────── */

function DeliverableRow({ deliverable, allCategories, loading, onRename, onMove, onDelete }: {
  deliverable: Deliverable
  allCategories: Category[]
  loading: boolean
  onRename: (id: string, name: string) => void
  onMove: (id: string, categoryId: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(deliverable.name)

  function commitRename() {
    setEditing(false)
    if (nameValue.trim() && nameValue !== deliverable.name)
      onRename(deliverable.id, nameValue.trim())
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #111' }}>
      <span style={{ fontSize: '11px', color: '#ffffff', flexShrink: 0 }}>└</span>

      {/* Nom */}
      {editing ? (
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ccc', fontSize: '13px' }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ flex: 1, fontSize: '13px', color: '#ffffff', cursor: 'text' }}
        >
          {deliverable.name}
        </span>
      )}

      {/* Déplacer vers une autre catégorie */}
      <select
        value={deliverable.category_id}
        onChange={(e) => onMove(deliverable.id, e.target.value)}
        disabled={loading}
        title="Déplacer vers…"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '4px',
          padding: '2px 6px',
          color: '#ffffff',
          fontSize: '10px',
          cursor: 'pointer',
          appearance: 'none',
          maxWidth: '90px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {allCategories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Supprimer livrable */}
      <button
        onClick={() => onDelete(deliverable.id)}
        disabled={loading}
        style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '14px', cursor: 'pointer', padding: 0 }}
        title="Supprimer le livrable"
      >
        ✕
      </button>
    </div>
  )
}

/* ─── Sélecteur de couleur inline ────────────────────────────────────── */

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: value,
          border: '2px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: '28px',
          left: 0,
          zIndex: 100,
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
        }}>
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false) }}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: c,
                border: c === value ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Formulaire de création de catégorie ────────────────────────────── */

function CreateCategoryForm({ loading, onCreate }: {
  loading: boolean
  onCreate: (name: string, color: string, target: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#E8C93E')
  const [target, setTarget] = useState('0')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim(), color, parseInt(target, 10) || 0)
    setName(''); setColor('#E8C93E'); setTarget('0')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: '1px dashed rgba(255,255,255,0.3)',
          borderRadius: '10px',
          color: '#ffffff',
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        + Nouvelle catégorie
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      <p style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600 }}>
        NOUVELLE CATÉGORIE
      </p>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <ColorPicker value={color} onChange={setColor} />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la catégorie…"
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '8px 12px', color: '#f0f0f0', fontSize: '14px', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '11px', color: '#ffffff' }}>Objectif hebdo (min)</label>
        <input
          type="number"
          value={target}
          min={0}
          onChange={(e) => setTarget(e.target.value)}
          style={{ width: '70px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '5px', padding: '5px 8px', color: '#888', fontSize: '12px', fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'right' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '7px', color: '#ffffff', fontSize: '13px', cursor: 'pointer' }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!name.trim() || loading}
          style={{ flex: 2, padding: '10px', background: name.trim() ? 'var(--color-accent)' : '#1a1a1a', color: name.trim() ? '#000' : '#ffffff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          Créer
        </button>
      </div>
    </form>
  )
}
