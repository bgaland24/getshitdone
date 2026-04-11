/**
 * Tests E2E de l'écran Qualifier.
 * Couvre : session de qualification (flash-cards), bouton Passer,
 *          barre de progression, fin de session.
 *
 * Note : setupFreshAccount déclenche l'onboarding (10 tâches de démo dont
 * certaines non qualifiées). Les tests mesurent des comportements relatifs
 * (progression qui avance, titre qui change) plutôt que des valeurs absolues.
 */

import { test, expect } from '@playwright/test'
import {
  loginInBrowser,
  setupFreshAccount,
  apiCreateTask,
  BASE_API,
  authHeaders,
} from './helpers'
import type { APIRequestContext } from '@playwright/test'


/* ─── Helper local ───────────────────────────────────────────────────────── */

/** Qualifie toutes les tâches non qualifiées d'un compte via l'API (requêtes parallèles). */
async function apiQualifyAllPending(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const resp = await request.get(`${BASE_API}/tasks/`, { headers: authHeaders(token) })
  const tasks: Array<{ id: string; is_qualified: boolean; status: string }> =
    (await resp.json()).data
  const pending = tasks.filter((t) => !t.is_qualified && t.status !== 'done' && t.status !== 'cancelled')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const horizonDate = tomorrow.toISOString().split('T')[0]

  await Promise.all(pending.map((t) =>
    request.post(`${BASE_API}/tasks/${t.id}/qualify`, {
      headers: authHeaders(token),
      data: { urgency: 'urgent', importance: 'important', horizon: horizonDate },
    })
  ))
}


/* ─── 1. Affichage initial ───────────────────────────────────────────────── */

test.describe('Écran Qualifier — affichage initial', () => {
  test('sans tâche non qualifiée — message "Rien à qualifier"', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    // Qualifier toutes les tâches de démo pour avoir un compte vide
    await apiQualifyAllPending(request, token)
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    await expect(page.getByText(/Rien à qualifier|Session terminée/i)).toBeVisible({ timeout: 5_000 })
  })

  test('avec tâches non qualifiées — titre de la première tâche visible', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    // Qualifier toutes les tâches de démo puis ajouter une connue
    await apiQualifyAllPending(request, token)
    await apiCreateTask(request, token, 'Tâche à qualifier en session')
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    await expect(page.getByText('Tâche à qualifier en session')).toBeVisible({ timeout: 5_000 })
  })

  test('barre de progression affiche X/N', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    // Qualifier toutes les tâches de démo puis ajouter 2 connues
    await apiQualifyAllPending(request, token)
    await apiCreateTask(request, token, 'Tâche 1')
    await apiCreateTask(request, token, 'Tâche 2')
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    // La barre de progression doit afficher 1/2
    await expect(page.getByText('1/2')).toBeVisible({ timeout: 5_000 })
  })
})


/* ─── 2. Session de qualification ────────────────────────────────────────── */

test.describe('Session de qualification', () => {
  test('qualifier une tâche — elle disparaît de la session', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiQualifyAllPending(request, token)
    await apiCreateTask(request, token, 'Ma tâche unique')
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    // La tâche unique est affichée
    await expect(page.getByText('Ma tâche unique')).toBeVisible({ timeout: 5_000 })

    // La qualifier
    await page.getByRole('button', { name: 'Urgent', exact: true }).click()
    await page.getByRole('button', { name: 'Important', exact: true }).click()
    await page.getByRole('button', { name: /1 sem/i }).click()
    const qualifyResponse = page.waitForResponse(r => r.url().includes('/qualify') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /Mettre à jour/i }).click()
    await qualifyResponse

    // La tâche qualifiée n'est plus présentée
    await expect(page.getByText('Ma tâche unique')).not.toBeVisible({ timeout: 5_000 })
  })

  test('bouton "Passer" — avance dans la session', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiQualifyAllPending(request, token)
    await apiCreateTask(request, token, 'Tâche à ignorer')
    await apiCreateTask(request, token, 'Tâche suivante')
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    // La première tâche est affichée à 1/2
    await expect(page.getByText('1/2')).toBeVisible({ timeout: 5_000 })

    // Passer la première tâche
    await page.getByRole('button', { name: /Passer/i }).click()

    // La deuxième tâche est maintenant présentée
    await expect(page.getByText('2/2')).toBeVisible({ timeout: 5_000 })
  })

  test('qualifier toutes les tâches — message de fin de session', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiQualifyAllPending(request, token)
    await apiCreateTask(request, token, 'Unique tâche')
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    await page.getByRole('button', { name: 'Urgent', exact: true }).click()
    await page.getByRole('button', { name: 'Important', exact: true }).click()
    await page.getByRole('button', { name: /1 sem/i }).click()
    const qualifyResponse = page.waitForResponse(r => r.url().includes('/qualify') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /Mettre à jour/i }).click()
    await qualifyResponse

    // Session terminée
    await expect(page.getByText(/Rien à qualifier|Session terminée/i)).toBeVisible({ timeout: 5_000 })
  })

  test('passer toutes les tâches — message de fin de session', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiQualifyAllPending(request, token)
    await apiCreateTask(request, token, 'Tâche à passer')
    await loginInBrowser(page, email)
    await page.goto('/qualify')

    await page.getByRole('button', { name: /Passer/i }).click()

    await expect(page.getByText(/Rien à qualifier|Session terminée/i)).toBeVisible({ timeout: 5_000 })
  })
})
