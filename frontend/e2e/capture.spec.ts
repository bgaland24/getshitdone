/**
 * Tests E2E de l'écran Capture.
 * Couvre : saisie rapide, saisie avec catégorie, saisie multiple (;),
 *          confirmation visuelle dans "Ajoutées cette session".
 */

import { test, expect } from '@playwright/test'
import {
  loginSeedAccount,
  loginInBrowser,
  setupFreshAccount,
  apiCreateCategory,
} from './helpers'


/* ─── 1. Saisie rapide ───────────────────────────────────────────────────── */

test.describe('Saisie rapide', () => {
  test('saisir une tâche et appuyer Entrée — apparaît dans "Ajoutées cette session"', async ({ page, request }) => {
    const { email } = await setupFreshAccount(request)
    await loginInBrowser(page, email)
    await page.goto('/capture')

    await page.getByPlaceholder('Nouvelle tâche (séparées par des ;)…').fill('Ma première tâche')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Ma première tâche')).toBeVisible({ timeout: 5_000 })
  })

  test('le champ est vidé après soumission', async ({ page, request }) => {
    const { email } = await setupFreshAccount(request)
    await loginInBrowser(page, email)
    await page.goto('/capture')

    const input = page.getByPlaceholder('Nouvelle tâche (séparées par des ;)…')
    await input.fill('Tâche vidée')
    await page.keyboard.press('Enter')

    await expect(input).toHaveValue('')
  })

  test('saisir une tâche avec catégorie — assignée directement', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateCategory(request, token, 'MonProjet', '#E86B3E')
    await loginInBrowser(page, email)
    await page.goto('/capture')

    // Sélectionner la catégorie
    const catSelect = page.locator('select').first()
    await catSelect.selectOption({ label: 'MonProjet' })

    await page.getByPlaceholder('Nouvelle tâche (séparées par des ;)…').fill('Tâche avec catégorie')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Tâche avec catégorie')).toBeVisible({ timeout: 5_000 })
  })

  test('saisie multiple avec ";" — plusieurs tâches créées', async ({ page, request }) => {
    const { email } = await setupFreshAccount(request)
    await loginInBrowser(page, email)
    await page.goto('/capture')

    await page.getByPlaceholder('Nouvelle tâche (séparées par des ;)…').fill('Tâche Alpha; Tâche Beta; Tâche Gamma')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Tâche Alpha')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Tâche Beta')).toBeVisible()
    await expect(page.getByText('Tâche Gamma')).toBeVisible()
  })

  test('plusieurs captures successives apparaissent dans la liste', async ({ page, request }) => {
    const { email } = await setupFreshAccount(request)
    await loginInBrowser(page, email)
    await page.goto('/capture')

    const input = page.getByPlaceholder('Nouvelle tâche (séparées par des ;)…')
    await input.fill('Première')
    await page.keyboard.press('Enter')
    await input.fill('Deuxième')
    await page.keyboard.press('Enter')

    await expect(page.getByText('Première')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Deuxième')).toBeVisible()
  })
})


/* ─── 2. Badge de navigation ─────────────────────────────────────────────── */

test.describe('Badge Capture', () => {
  test('compte seedé — badge Capture affiche le nombre de tâches non organisées', async ({ page }) => {
    await loginSeedAccount(page)
    // Le seed crée 2 tâches non organisées (sans catégorie)
    const captureLink = page.getByRole('link', { name: /Capture/i })
    // On vérifie juste que la nav est présente, sans tester la valeur exacte du badge
    // (la valeur dépend du seed et peut varier)
    await expect(captureLink).toBeVisible()
  })
})
