/**
 * Store Zustand pour les données métier (tâches, catégories, livrables, session active).
 * Les données sont chargées via les hooks API et stockées ici pour éviter
 * les re-fetch inutiles entre les écrans.
 */

import { create } from 'zustand'
import type { Task, Category, Deliverable, WorkSession } from '../types'

interface TaskState {
  /* ── Données ── */
  tasks: Task[]
  categories: Category[]
  deliverables: Deliverable[]
  activeSession: WorkSession | null

  /* ── Setters (appelés par les couches API) ── */

  /** Remplace toute la liste des tâches */
  setTasks: (tasks: Task[]) => void

  /** Met à jour une tâche existante dans le store */
  updateTask: (updated: Task) => void

  /** Ajoute une tâche au store */
  addTask: (task: Task) => void

  /** Supprime une tâche du store */
  removeTask: (taskId: string) => void

  /** Remplace toute la liste des catégories */
  setCategories: (categories: Category[]) => void

  /** Remplace toute la liste des livrables */
  setDeliverables: (deliverables: Deliverable[]) => void

  /** Définit la session de travail active (null = aucune) */
  setActiveSession: (session: WorkSession | null) => void

  /** Réinitialise l'ensemble du store (ex: logout) */
  reset: () => void
}

const INITIAL_STATE = {
  tasks: [],
  categories: [],
  deliverables: [],
  activeSession: null,
}

export const useTaskStore = create<TaskState>()((set) => ({
  ...INITIAL_STATE,

  setTasks: (tasks) => set({ tasks }),

  updateTask: (updated) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t)),
    })),

  addTask: (task) =>
    set((state) => ({ tasks: [task, ...state.tasks] })),

  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),

  setCategories: (categories) => set({ categories }),

  setDeliverables: (deliverables) => set({ deliverables }),

  setActiveSession: (session) => set({ activeSession: session }),

  reset: () => set(INITIAL_STATE),
}))
