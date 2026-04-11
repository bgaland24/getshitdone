/**
 * Types TypeScript centralisés — miroir fidèle des modèles SQLAlchemy backend.
 * Toute entité de l'application est définie ici et importée depuis ce fichier.
 */

/* ─── Enums (statuts & qualifications) ──────────────────────────────── */

export type TaskStatus =
  | 'new'
  | 'prioritized'
  | 'in_progress'
  | 'done'
  | 'cancelled'

export type Urgency = 'urgent' | 'non_urgent'
export type Importance = 'important' | 'non_important'
/** Horizon = date ISO cible (YYYY-MM-DD) */
export type Horizon = string
export type Delegation = 'delegable' | 'non_delegable' | 'delegated'

/* ─── Entités ────────────────────────────────────────────────────────── */

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string               // hex, ex: "#E8C93E"
  weekly_target_minutes: number
}

export interface Deliverable {
  id: string
  name: string
  category_id: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  category_id: string | null
  deliverable_id: string | null
  status: TaskStatus
  urgency: Urgency | null
  importance: Importance | null
  horizon: Horizon | null
  delegation: Delegation | null
  estimated_minutes: number | null
  priority_firstset_date: string | null  // ISO date — date du premier épinglage (immuable)
  priority_current_date: string | null   // ISO date — date d'épinglage actuelle
  is_qualified: boolean
  created_at: string
  done_at: string | null
}

export type SortAxis = 'horizon' | 'delegation' | 'urgency' | 'importance'

export interface UserPreferences {
  user_id: string
  sort_axes: SortAxis[]
}

export interface WorkSession {
  id: string
  task_id: string
  started_at: string
  stopped_at: string | null
  duration_minutes: number | null
  efficient: boolean | null
}

/* ─── Scores ─────────────────────────────────────────────────────────── */

export interface TodayScore {
  global: number        // score global 0–100
  priorities: number    // sous-score respect des priorités
  allocations: number   // sous-score allocations temporelles
  closure: number       // sous-score qualité de clôture
}

export interface WeeklyScore {
  global: number
  priorities: number
  allocations: number
  closure: number
  categories: CategoryScore[]
}

export interface CategoryScore {
  category_id: string
  category_name: string
  category_color: string
  actual_minutes: number
  target_minutes: number
}

export interface HistoryEntry {
  week_start: string
  global: number
  priorities: number
  allocations: number
  closure: number
}

/* ─── Auth ───────────────────────────────────────────────────────────── */

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

/* ─── Payloads API ───────────────────────────────────────────────────── */

export interface CreateTaskPayload {
  title: string
  category_id?: string | null
  deliverable_id?: string | null
  // Champs de qualification optionnels (mode saisie détaillée)
  urgency?: Urgency
  importance?: Importance
  horizon?: Horizon
  delegation?: Delegation
  estimated_minutes?: number | null
}

export interface UpdateTaskPayload {
  title?: string
  category_id?: string | null
  deliverable_id?: string | null
  estimated_minutes?: number | null
}

export interface QualifyTaskPayload {
  urgency: Urgency
  importance: Importance
  horizon: Horizon
  delegation?: Delegation
  estimated_minutes?: number | null
  category_id?: string | null
  deliverable_id?: string | null
}

export interface CreateCategoryPayload {
  name: string
  color: string
  weekly_target_minutes?: number
}

export interface CreateDeliverablePayload {
  name: string
  category_id: string
}
