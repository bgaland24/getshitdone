/**
 * API preferences — lecture et mise à jour des préférences utilisateur.
 */

import { apiClient } from './client'
import type { UserPreferences, SortAxis } from '../types'

/** Retourne les préférences de l'utilisateur (crées si inexistantes) */
export async function fetchPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get<UserPreferences>('/preferences')
  return data
}

/** Met à jour l'ordre des axes de tri */
export async function updateSortAxes(sortAxes: SortAxis[]): Promise<UserPreferences> {
  const { data } = await apiClient.put<UserPreferences>('/preferences', { sort_axes: sortAxes })
  return data
}
