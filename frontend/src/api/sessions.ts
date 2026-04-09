/**
 * Appels HTTP vers les endpoints /api/sessions.
 */

import { apiClient } from './client'
import type { WorkSession } from '../types'

/** Récupère les sessions d'une tâche ou d'une date donnée */
export async function fetchSessions(params?: {
  task_id?: string
  date?: string
}): Promise<WorkSession[]> {
  const { data } = await apiClient.get<WorkSession[]>('/sessions/', { params })
  return data
}
