/**
 * Tests E2E de l'écran Priorités.
 * Couvre : affichage des tâches qualifiées, épinglage/désépinglage,
 *          limite 3 épinglées, toggle Aujourd'hui/Demain.
 */

import { test, expect } from '@playwright/test'
import {
  loginInBrowser,
  setupFreshAccount,
  apiCreateTask,
  BASE_API,
  authHeaders,
  apiLogin,
} from './helpers'
import type { APIRequestContext } from '@playwright/test'


/* ─── Helpers locaux ─────────────────────────────────────────────────────── */

async function apiPinTask(
  request: APIRequestContext,
  token: string,
  taskId: string,
  pinDate: string,
) {
  const resp = await request.post(`${BASE_API}/tasks/${taskId}/pin`, {
    headers: authHeaders(token),
    data: { pin_date: pinDate },
  })
  return (await resp.json()).data
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}


/* ─── 1. Affichage des tâches ────────────────────────────────────────────── */

test.describe("Écran Priorités — affichage", () => {
  test('tâche qualifiée non épinglée apparaît dans "À faire"', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Tâche qualifiée non épinglée', {
      urgency: 'urgent',
      importance: 'important',
      horizon: tomorrowISO(),
    })
    await loginInBrowser(page, email)
    await page.goto('/priorities')

    await expect(page.getByText('Tâche qualifiée non épinglée')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/À FAIRE/i)).toBeVisible()
  })

  test('tâche non qualifiée n\'apparaît pas dans les priorités', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Tâche sans qualification')
    await loginInBrowser(page, email)
    await page.goto('/priorities')

    await expect(page.getByText('Tâche sans qualification')).not.toBeVisible()
  })

  test('compte vide — section À FAIRE sans tâches', async ({ page, request }) => {
    const { email } = await setupFreshAccount(request)
    await loginInBrowser(page, email)
    await page.goto('/priorities')

    await expect(page.getByText(/Aucune tâche qualifiée disponible/i)).toBeVisible({ timeout: 5_000 })
  })
})


/* ─── 2. Épinglage depuis l'écran Priorités ──────────────────────────────── */

test.describe('Épinglage', () => {
  test('épingler une tâche — apparaît dans "Épinglées"', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const task = await apiCreateTask(request, token, 'Tâche à épingler', {
      urgency: 'urgent',
      importance: 'important',
      horizon: tomorrowISO(),
    })
    await loginInBrowser(page, email)
    await page.goto('/priorities')

    // Trouver le bouton épingle sur la tâche
    const pinButton = page.locator('button[title="Épingler"]').first()
    const pinResponse = page.waitForResponse(r => r.url().includes('/pin') && r.request().method() === 'POST')
    await pinButton.click()
    await pinResponse

    // La tâche apparaît dans la section ÉPINGLÉES
    await expect(page.getByText(/ÉPINGLÉES/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Tâche à épingler')).toBeVisible()
  })

  test('désépingler — tâche retourne dans "À faire"', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const task = await apiCreateTask(request, token, 'Tâche épinglée', {
      urgency: 'urgent',
      importance: 'important',
      horizon: todayISO(),
    })
    // Épingler via API
    await apiPinTask(request, token, task.id, todayISO())
    await loginInBrowser(page, email)
    await page.goto('/priorities')

    // La tâche est dans ÉPINGLÉES
    await expect(page.getByText('Tâche épinglée')).toBeVisible({ timeout: 5_000 })

    // Désépingler
    const unpinButton = page.locator('button[title="Désépingler"]').first()
    const unpinResponse = page.waitForResponse(r => r.url().includes('/unpin') && r.request().method() === 'POST')
    await unpinButton.click()
    await unpinResponse

    // La section ÉPINGLÉES disparaît (plus de tâches dedans)
    await expect(page.locator('button[title="Désépingler"]')).not.toBeVisible({ timeout: 5_000 })
  })

  test('limite 3 épinglées — bouton Épingler désactivé', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)

    // Créer 4 tâches qualifiées et en épingler 3 via API
    const today = todayISO()
    for (let i = 0; i < 3; i++) {
      const t = await apiCreateTask(request, token, `Épinglée ${i + 1}`, {
        urgency: 'urgent', importance: 'important', horizon: today,
      })
      await apiPinTask(request, token, t.id, today)
    }
    // 4ème tâche non épinglée
    await apiCreateTask(request, token, 'Non épinglée', {
      urgency: 'non_urgent', importance: 'important', horizon: tomorrowISO(),
    })

    await loginInBrowser(page, email)
    await page.goto('/priorities')

    // Le bouton épingle de la 4ème tâche est désactivé
    await expect(page.locator('button[title="Maximum atteint"]').first()).toBeVisible({ timeout: 5_000 })
  })
})


/* ─── 3. Toggle Aujourd'hui / Demain ─────────────────────────────────────── */

test.describe("Toggle Aujourd'hui / Demain", () => {
  test('toggle demain — tâches épinglées demain visibles', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const tomorrow = tomorrowISO()
    const task = await apiCreateTask(request, token, 'Tâche pour demain', {
      urgency: 'urgent', importance: 'important', horizon: tomorrow,
    })
    await apiPinTask(request, token, task.id, tomorrow)

    await loginInBrowser(page, email)
    await page.goto('/priorities')

    // Sur l'onglet "Aujourd'hui" → pas visible dans les épinglées
    await page.getByRole('button', { name: /Demain/i }).click()

    await expect(page.getByText('Tâche pour demain')).toBeVisible({ timeout: 5_000 })
  })

  test("toggle aujourd'hui — les épinglées demain sont masquées", async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const tomorrow = tomorrowISO()
    const task = await apiCreateTask(request, token, 'Seulement demain', {
      urgency: 'urgent', importance: 'important', horizon: tomorrow,
    })
    await apiPinTask(request, token, task.id, tomorrow)

    await loginInBrowser(page, email)
    await page.goto('/priorities')

    // Sur "Aujourd'hui", la tâche épinglée pour demain ne doit pas être dans les épinglées
    // (elle peut être dans À FAIRE car qualifiée, mais pas dans la section épinglées)
    await expect(page.locator('button[title="Désépingler"]')).not.toBeVisible({ timeout: 5_000 })
  })
})
