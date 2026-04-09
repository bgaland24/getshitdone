/**
 * Appels HTTP vers les endpoints /api/tasks.
 */

import { apiClient } from './client'
import type {
  Task,
  TaskStatus,
  CreateTaskPayload,
  UpdateTaskPayload,
  QualifyTaskPayload,
} from '../types'

interface FetchTasksParams {
  status?: TaskStatus
  category_id?: string
  qualified?: boolean
}

/** Récupère la liste des tâches, avec filtres optionnels */
export async function fetchTasks(params?: FetchTasksParams): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>('/tasks/', { params })
  return data
}

/** Crée une nouvelle tâche (status = new par défaut) */
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>('/tasks/', payload)
  return data
}

/** Met à jour le titre, la catégorie ou le livrable d'une tâche */
export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/tasks/${id}`, payload)
  return data
}

/** Supprime une tâche */
export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}

/** Qualifie une tâche (urgence + importance + horizon) */
export async function qualifyTask(id: string, payload: QualifyTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/qualify`, payload)
  return data
}

/** Épingle une tâche sur une date donnée */
export async function pinTask(id: string, pinDate: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/pin`, { pin_date: pinDate })
  return data
}

/** Désépingle une tâche */
export async function unpinTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/unpin`)
  return data
}

/** Démarre une session de travail sur la tâche */
export async function startTask(id: string): Promise<{ task: Task; session: object }> {
  const { data } = await apiClient.post<{ task: Task; session: object }>(`/tasks/${id}/start`)
  return data
}

/** Met en pause la session active */
export async function pauseTask(id: string): Promise<{ task: Task; session: object }> {
  const { data } = await apiClient.post<{ task: Task; session: object }>(`/tasks/${id}/pause`)
  return data
}

/** Marque la tâche comme terminée */
export async function doneTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/done`)
  return data
}

/** Annule la tâche */
export async function cancelTask(id: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/cancel`)
  return data
}
