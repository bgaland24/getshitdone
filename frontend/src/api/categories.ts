/**
 * Appels HTTP vers les endpoints /api/categories et /api/deliverables.
 */

import { apiClient } from './client'
import type {
  Category,
  Deliverable,
  CreateCategoryPayload,
  CreateDeliverablePayload,
} from '../types'

/* ─── Catégories ─────────────────────────────────────────────────────── */

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>('/categories/')
  return data
}

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  const { data } = await apiClient.post<Category>('/categories/', payload)
  return data
}

export async function updateCategory(
  id: string,
  payload: Partial<CreateCategoryPayload>
): Promise<Category> {
  const { data } = await apiClient.put<Category>(`/categories/${id}`, payload)
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}

/* ─── Livrables ──────────────────────────────────────────────────────── */

export async function fetchDeliverables(categoryId?: string): Promise<Deliverable[]> {
  const params = categoryId ? { category_id: categoryId } : {}
  const { data } = await apiClient.get<Deliverable[]>('/deliverables/', { params })
  return data
}

export async function createDeliverable(payload: CreateDeliverablePayload): Promise<Deliverable> {
  const { data } = await apiClient.post<Deliverable>('/deliverables/', payload)
  return data
}

export async function updateDeliverable(
  id: string,
  payload: { name?: string; category_id?: string }
): Promise<Deliverable> {
  const { data } = await apiClient.put<Deliverable>(`/deliverables/${id}`, payload)
  return data
}

export async function deleteDeliverable(id: string): Promise<void> {
  await apiClient.delete(`/deliverables/${id}`)
}
