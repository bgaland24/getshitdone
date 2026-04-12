/**
 * Constantes globales de l'application.
 * Toute valeur "magic" doit être définie ici avec un nom expressif.
 */

import type { TaskStatus, Urgency, Importance, Delegation } from '../types'

/* ─── Statuts des tâches ─────────────────────────────────────────────── */

export const TASK_STATUS: Record<TaskStatus, string> = {
  new:         'Nouvelle',
  prioritized: 'Épinglée',
  in_progress: 'En cours',
  done:        'Terminée',
  cancelled:   'Annulée',
}

/** Nombre maximum de tâches épinglées par date */
export const MAX_PINNED_PER_DATE = 3

export const SORT_AXIS_LABELS: Record<string, string> = {
  horizon:    'Horizon',
  delegation: 'Délégation',
  urgency:    'Urgence',
  importance: 'Importance',
}

/* ─── Labels de qualification ────────────────────────────────────────── */

export const URGENCY_LABELS: Record<Urgency, string> = {
  urgent:     'Urgent',
  non_urgent: 'Non urgent',
}

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  important:     'Important',
  non_important: 'Non important',
}

/** Retourne la couleur d'un horizon (date ISO) selon l'urgence temporelle */
export function getHorizonColor(dateIso: string): string {
  const days = Math.ceil((new Date(dateIso).getTime() - Date.now()) / 86_400_000)
  if (days <= 1) return '#E86B3E'   // orange — demain ou moins
  if (days <= 7) return '#E8C93E'   // jaune — cette semaine
  return '#7B8FE8'                   // bleu — plus loin
}

/** Formate une date ISO en label court (ex: "10 avr.") */
export function getHorizonLabel(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Calcule une date ISO à partir d'un raccourci (J+n à partir de demain) */
export function horizonShortcutDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

export const DELEGATION_LABELS: Record<Delegation, string> = {
  delegable:     'Délégable',
  non_delegable: 'Non délégable',
  delegated:     'Délégué',
}

/* ─── Navigation ─────────────────────────────────────────────────────── */

export const ROUTES = {
  CAPTURE:    '/capture',
  ORGANIZE:   '/organize',
  QUALIFY:    '/qualify',
  PRIORITIES: '/priorities',
  SCORE:      '/score',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/* ─── Timing ─────────────────────────────────────────────────────────── */

/** Délai en minutes sous lequel une tâche terminée après une session est "efficient" */
export const EFFICIENT_THRESHOLD_MINUTES = 5

/** Fréquence de rafraîchissement du timer actif (en ms) */
export const TIMER_REFRESH_INTERVAL_MS = 1000

/* ─── Tutorial first-run ─────────────────────────────────────────────── */

/** Clé localStorage — présence indique que le tutoriel a été vu ou passé */
export const TUTORIAL_STORAGE_KEY = 'gsd-tutorial-done'

/** Valeur stockée lorsque le tutoriel est terminé */
export const TUTORIAL_DONE_VALUE = '1'

/** Nom de l'attribut HTML utilisé pour localiser les éléments cibles */
export const TUTORIAL_TARGET_ATTR = 'data-tutorial'

/** Identifiants des éléments ciblés par le tutoriel */
export const TUTORIAL_TARGETS = {
  CAPTURE:    'capture-tab',
  QUALIFY:    'qualify-tab',
  ORGANIZE:   'organize-tab',
  PRIORITIES: 'priorities-tab',
  PARAM:      'param-button',
} as const

export type TutorialTarget = (typeof TUTORIAL_TARGETS)[keyof typeof TUTORIAL_TARGETS]

/* ─── Couleurs par défaut ────────────────────────────────────────────── */

export const DEFAULT_CATEGORY_COLOR = '#6b7280'

export const SCORE_COLOR_THRESHOLDS = {
  HIGH:   80,   // vert
  MEDIUM: 50,   // jaune
  // < 50 → rouge
} as const

/** Couleurs associées aux niveaux de score */
export const SCORE_COLORS = {
  HIGH:   '#22c55e',
  MEDIUM: '#E8C93E',
  LOW:    '#ef4444',
} as const
