/**
 * Appels HTTP vers les endpoints /api/scores.
 */

import { apiClient } from './client'
import type { TodayScore, WeeklyScore, HistoryEntry } from '../types'

/** Score du jour en cours */
export async function fetchTodayScore(): Promise<TodayScore> {
  const { data } = await apiClient.get<TodayScore>('/scores/today')
  return data
}

/** Score de la semaine en cours */
export async function fetchWeeklyScore(): Promise<WeeklyScore> {
  const { data } = await apiClient.get<WeeklyScore>('/scores/weekly')
  return data
}

/** Historique des scores sur N semaines (défaut 4) */
export async function fetchScoreHistory(weeks = 4): Promise<HistoryEntry[]> {
  const { data } = await apiClient.get<HistoryEntry[]>('/scores/history', {
    params: { weeks },
  })
  return data
}
