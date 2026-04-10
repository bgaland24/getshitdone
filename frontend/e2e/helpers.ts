/**
 * Helpers partagés entre les tests E2E.
 *
 * Compte seedé disponible pour tous les tests :
 *   SEED_EMAIL    = "test@getshitdone.local"
 *   SEED_PASSWORD = "testpassword123"
 *
 * Ce compte a déjà des catégories, livrables et tâches dans la BDD de test.
 * Pour un test qui a besoin d'un environnement vierge, utiliser setupFreshAccount().
 */

import { type Page, type APIRequestContext, expect } from '@playwright/test'

export const BASE_API = 'http://localhost:5000/api'

/** Compte principal du seed — disponible directement sans création */
export const SEED_EMAIL    = 'test@getshitdone.local'
export const SEED_PASSWORD = 'testpassword123'

/* ─── Authentification ───────────────────────────────────────────────────── */

/** Connecte le compte seedé dans le navigateur */
export async function loginSeedAccount(page: Page) {
  await loginInBrowser(page, SEED_EMAIL, SEED_PASSWORD)
}

/** Crée un compte frais (email unique) — pour les tests qui ont besoin d'un environnement vierge */
export async function setupFreshAccount(request: APIRequestContext): Promise<{ token: string; email: string }> {
  const email = `e2e_fresh_${Date.now()}@test.local`
  const res = await request.post(`${BASE_API}/auth/register`, {
    data: { email, password: 'testpassword123' },
  })
  const json = await res.json()
  return { token: json.data.access_token, email }
}

/** Connecte un utilisateur dans le navigateur via l'écran de login */
export async function loginInBrowser(page: Page, email: string, password = 'testpassword123') {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await expect(page).toHaveURL(/\/capture/, { timeout: 8_000 })
}

/* ─── Création de données via API ────────────────────────────────────────── */

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function apiLogin(request: APIRequestContext, email = SEED_EMAIL, password = SEED_PASSWORD): Promise<string> {
  const res = await request.post(`${BASE_API}/auth/login`, {
    data: { email, password },
  })
  return (await res.json()).data.access_token
}

export async function apiCreateCategory(
  request: APIRequestContext,
  token: string,
  name: string,
  color = '#E86B3E',
) {
  const res = await request.post(`${BASE_API}/categories/`, {
    headers: authHeaders(token),
    data: { name, color },
  })
  return (await res.json()).data
}

export async function apiCreateDeliverable(
  request: APIRequestContext,
  token: string,
  categoryId: string,
  name: string,
) {
  const res = await request.post(`${BASE_API}/deliverables/`, {
    headers: authHeaders(token),
    data: { name, category_id: categoryId },
  })
  return (await res.json()).data
}

export async function apiCreateTask(
  request: APIRequestContext,
  token: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  const res = await request.post(`${BASE_API}/tasks/`, {
    headers: authHeaders(token),
    data: { title, ...extra },
  })
  return (await res.json()).data
}

/* ─── Navigation ─────────────────────────────────────────────────────────── */

export async function goToOrganize(page: Page) {
  await page.goto('/organize')
  // Attend que le span titre dans la barre de filtres soit visible
  await expect(
    page.locator('span').filter({ hasText: /^Organiser$/ }).first()
  ).toBeVisible({ timeout: 8_000 })
}
