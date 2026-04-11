/**
 * Tests E2E de l'écran Organiser.
 * Simule les interactions utilisateur dans un vrai navigateur Chromium.
 */

import { test, expect } from '@playwright/test'
import {
  loginSeedAccount,
  loginInBrowser,
  goToOrganize,
  setupFreshAccount,
  apiCreateCategory,
  apiCreateDeliverable,
  apiCreateTask,
} from './helpers'


/* ─── 1. Affichage initial ───────────────────────────────────────────────── */

test.describe('Affichage initial', () => {
  test('compte seedé — catégories et livrables visibles', async ({ page }) => {
    await loginSeedAccount(page)
    await goToOrganize(page)

    await expect(page.locator('span').filter({ hasText: /^Travail$/ }).first()).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Perso$/ }).first()).toBeVisible()
    await expect(page.locator('span, div').filter({ hasText: /^Sprint 1$/ }).first()).toBeVisible()
    await expect(page.locator('span, div').filter({ hasText: /^Sprint 2$/ }).first()).toBeVisible()
    await expect(page.getByText(/Non organisées/i)).toBeVisible()
  })

  test('les tâches terminées et annulées sont masquées par défaut', async ({ page }) => {
    await loginSeedAccount(page)
    await goToOrganize(page)

    await expect(page.getByText(/Déployer la version 1\.2/i)).not.toBeVisible()
    await expect(page.getByText(/Migrer vers PostgreSQL/i)).not.toBeVisible()
  })

  test('compte vide — message "Aucune tâche"', async ({ page, request }) => {
    const { email } = await setupFreshAccount(request)
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await expect(page.getByText(/Aucune tâche dans cette vue/i)).toBeVisible()
  })

  test('tâche non organisée apparaît dans la colonne dédiée', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Ma tâche sans catégorie')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await expect(page.getByText('Ma tâche sans catégorie')).toBeVisible()
    await expect(page.getByText(/Non organisées/i)).toBeVisible()
  })
})

/* ─── 2. Filtres ─────────────────────────────────────────────────────────── */

test.describe('Filtres', () => {
  test('filtre "Terminée" — affiche les tâches done du seed', async ({ page }) => {
    await loginSeedAccount(page)
    await goToOrganize(page)

    await page.locator('select').first().selectOption('done')

    await expect(page.getByText(/Déployer la version 1\.2/i)).toBeVisible()
  })

  test('filtre "Annulée" — affiche les tâches cancelled du seed', async ({ page }) => {
    await loginSeedAccount(page)
    await goToOrganize(page)

    await page.locator('select').first().selectOption('cancelled')

    await expect(page.getByText(/Migrer vers PostgreSQL/i)).toBeVisible()
  })

  test('filtre par catégorie — masque les tâches des autres catégories', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const cat1 = await apiCreateCategory(request, token, 'Alpha', '#4CAF7D')
    const cat2 = await apiCreateCategory(request, token, 'Beta', '#E86B3E')
    await apiCreateTask(request, token, 'Tâche Alpha', { category_id: cat1.id })
    await apiCreateTask(request, token, 'Tâche Beta', { category_id: cat2.id })
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await expect(page.getByText('Tâche Alpha')).toBeVisible()
    await expect(page.getByText('Tâche Beta')).toBeVisible()

    await page.locator('select').nth(1).selectOption(cat1.id)

    await expect(page.getByText('Tâche Alpha')).toBeVisible()
    await expect(page.getByText('Tâche Beta')).not.toBeVisible()
  })

  test('filtre par livrable — restreint les résultats', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const cat = await apiCreateCategory(request, token, 'Test')
    const del1 = await apiCreateDeliverable(request, token, cat.id, 'Livrable A')
    const del2 = await apiCreateDeliverable(request, token, cat.id, 'Livrable B')
    await apiCreateTask(request, token, 'Tâche A', { category_id: cat.id, deliverable_id: del1.id })
    await apiCreateTask(request, token, 'Tâche B', { category_id: cat.id, deliverable_id: del2.id })
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('select').nth(1).selectOption(cat.id)
    await page.locator('select').nth(2).selectOption(del1.id)

    await expect(page.getByText('Tâche A')).toBeVisible()
    await expect(page.getByText('Tâche B')).not.toBeVisible()
  })

  test('changer de catégorie remet le filtre livrable à "Tous livrables"', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const cat1 = await apiCreateCategory(request, token, 'Cat1', '#4CAF7D')
    const cat2 = await apiCreateCategory(request, token, 'Cat2', '#E86B3E')
    const del = await apiCreateDeliverable(request, token, cat1.id, 'Del1')
    await apiCreateTask(request, token, 'T', { category_id: cat1.id, deliverable_id: del.id })
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('select').nth(1).selectOption(cat1.id)
    await page.locator('select').nth(2).selectOption(del.id)
    await page.locator('select').nth(1).selectOption(cat2.id)

    await expect(page.locator('select').nth(2)).toHaveValue('all')
  })

  test('filtre actif — les livrables vides disparaissent', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const cat = await apiCreateCategory(request, token, 'Cat')
    const del1 = await apiCreateDeliverable(request, token, cat.id, 'Avec contenu')
    await apiCreateDeliverable(request, token, cat.id, 'Col vide')
    await apiCreateTask(request, token, 'T', { category_id: cat.id, deliverable_id: del1.id })
    await loginInBrowser(page, email)
    await goToOrganize(page)

    // Sans filtre : les deux livrables sont affichés
    await expect(page.locator('span, div').filter({ hasText: /^Avec contenu$/ }).first()).toBeVisible()
    await expect(page.locator('span, div').filter({ hasText: /^Col vide$/ }).first()).toBeVisible()

    // Filtre catégorie actif : le livrable vide disparaît
    await page.locator('select').nth(1).selectOption(cat.id)

    await expect(page.locator('span, div').filter({ hasText: /^Avec contenu$/ }).first()).toBeVisible()
    await expect(page.locator('span, div').filter({ hasText: /^Col vide$/ })).not.toBeVisible()
  })
})

/* ─── 3. Menu d'actions ──────────────────────────────────────────────────── */

test.describe("Menu d'actions", () => {
  test('le menu affiche les 4 options attendues', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Tâche menu')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()

    // Cible les boutons dans le dropdown (fixed, z-index 300), pas les cartes draggables
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await expect(dropdown.getByText('Terminée', { exact: true })).toBeVisible()
    await expect(dropdown.getByText('Déplacer', { exact: true })).toBeVisible()
    await expect(dropdown.getByText('Qualifier', { exact: true })).toBeVisible()
    await expect(dropdown.getByText('Supprimer', { exact: true })).toBeVisible()
  })

  test('"Terminée" — la tâche disparaît de la vue par défaut', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'À terminer')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await expect(dropdown.getByText('Terminée', { exact: true })).toBeVisible()
    const responsePromise = page.waitForResponse(r => r.url().includes('/done'))
    await dropdown.getByText('Terminée', { exact: true }).click()
    await responsePromise

    await expect(page.getByText('À terminer').first()).not.toBeVisible({ timeout: 8_000 })
  })

  test('"Terminée" — visible en filtrant sur "done"', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Tâche done test')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    const doneResponse = page.waitForResponse(r => r.url().includes('/done'))
    await dropdown.getByText('Terminée', { exact: true }).click()
    await doneResponse
    await expect(page.getByText('Tâche done test').first()).not.toBeVisible({ timeout: 5_000 })

    await page.locator('select').first().selectOption('done')
    await expect(page.getByText('Tâche done test').first()).toBeVisible()
  })

  test('"Supprimer" — la tâche est définitivement supprimée', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'À supprimer')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    const deleteResponse = page.waitForResponse(r => r.url().includes('/tasks/') && r.request().method() === 'DELETE')
    await dropdown.getByText('Supprimer', { exact: true }).click()
    await deleteResponse

    await expect(page.getByText('À supprimer').first()).not.toBeVisible({ timeout: 5_000 })
    await page.locator('select').first().selectOption('done')
    await expect(page.getByText('À supprimer').first()).not.toBeVisible()
  })
})

/* ─── 4. Déplacer une tâche ──────────────────────────────────────────────── */

test.describe('Déplacer une tâche', () => {
  test('déplacer vers une autre catégorie via la MoveSheet', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const cat1 = await apiCreateCategory(request, token, 'Origine', '#4CAF7D')
    await apiCreateCategory(request, token, 'Destination', '#E86B3E')
    await apiCreateTask(request, token, 'Tâche à déplacer', { category_id: cat1.id })
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown.getByText('Déplacer', { exact: true }).click()

    // La MoveSheet affiche "DÉPLACER" en header et liste les destinations
    await expect(page.getByText('DÉPLACER', { exact: true })).toBeVisible()
    const moveResponse = page.waitForResponse(r => r.url().includes('/tasks/') && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /Destination/i }).first().click()
    await moveResponse

    await expect(page.getByText('Tâche à déplacer')).toBeVisible()
  })

  test('déplacer vers "Non organisées" retire la catégorie', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    const cat = await apiCreateCategory(request, token, 'MaCat', '#4CAF7D')
    await apiCreateTask(request, token, 'Tâche organisée', { category_id: cat.id })
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown.getByText('Déplacer', { exact: true }).click()
    await expect(page.getByText('DÉPLACER', { exact: true })).toBeVisible()
    const moveResponse = page.waitForResponse(r => r.url().includes('/tasks/') && r.request().method() === 'PUT')
    // "Non organisée" (sans s) est le label dans MoveSheet
    await page.getByRole('button', { name: /Non organisée/i }).first().click()
    await moveResponse

    await expect(page.getByText('Non organisées')).toBeVisible()
    await expect(page.getByText('Tâche organisée')).toBeVisible()
  })
})

/* ─── 5. Qualifier depuis le modal ───────────────────────────────────────── */

test.describe('Qualifier depuis le modal', () => {
  test('ouvrir le modal — titre de la tâche visible', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Tâche à qualifier')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown.getByText('Qualifier', { exact: true }).click()

    await expect(page.getByText('QUALIFIER', { exact: true })).toBeVisible()
    await expect(page.getByText('Tâche à qualifier').first()).toBeVisible()
  })

  test('qualifier une tâche — modal se ferme après soumission', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Non qualifiée')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown.getByText('Qualifier', { exact: true }).click()

    // Attendre que le modal soit affiché avant d'interagir avec les boutons
    const modal = page.locator('[style*="position: fixed"][style*="border-radius: 12px"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    await modal.getByRole('button', { name: 'Urgent', exact: true }).click()
    await modal.getByRole('button', { name: 'Important', exact: true }).click()
    await modal.getByRole('button', { name: /1 sem/i }).click()
    await modal.getByRole('button', { name: /Mettre à jour/i }).click()

    await expect(page.getByText('QUALIFIER', { exact: true })).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Non qualifiée')).toBeVisible()
  })

  test('fermer le modal sans soumettre — tâche inchangée', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateTask(request, token, 'Pas modifiée')
    await loginInBrowser(page, email)
    await goToOrganize(page)

    await page.locator('[title="Actions"]').first().click()
    const dropdown = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown.getByText('Qualifier', { exact: true }).click()

    // Attendre que le modal soit visible avant d'interagir (un <select> peut intercepter les clics sinon)
    const modal = page.locator('[style*="position: fixed"][style*="border-radius: 12px"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })
    await modal.getByRole('button', { name: 'Urgent', exact: true }).click()

    // Fermer via le bouton ×
    await page.locator('button').filter({ hasText: '×' }).click()

    await expect(page.getByText('QUALIFIER', { exact: true })).not.toBeVisible()
    await expect(page.getByText('Pas modifiée')).toBeVisible()
  })
})

/* ─── 6. Flux complet utilisateur ────────────────────────────────────────── */

test.describe('Flux complet', () => {
  test('capturer → organiser → qualifier une tâche', async ({ page, request }) => {
    const { token, email } = await setupFreshAccount(request)
    await apiCreateCategory(request, token, 'MonProjet', '#6B8DE8')
    await loginInBrowser(page, email)

    // 1. Capturer
    await page.goto('/capture')
    await page.getByPlaceholder('Nouvelle tâche (séparées par des ;)…').fill('Tâche flux complet E2E')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Tâche flux complet E2E')).toBeVisible()

    // 2. Organiser
    await goToOrganize(page)
    await expect(page.getByText('Tâche flux complet E2E')).toBeVisible()

    // 3. Déplacer vers MonProjet
    await page.locator('[title="Actions"]').first().click()
    const dropdown1 = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown1.getByText('Déplacer', { exact: true }).click()
    await page.getByRole('button', { name: /MonProjet/i }).first().click()
    await expect(page.getByText('Tâche flux complet E2E')).toBeVisible()

    // 4. Qualifier
    await page.locator('[title="Actions"]').first().click()
    const dropdown2 = page.locator('[style*="position: fixed"][style*="z-index: 300"]').last()
    await dropdown2.getByText('Qualifier', { exact: true }).click()
    await page.getByRole('button', { name: /Non urgent/i }).first().click()
    await page.getByRole('button', { name: 'Important', exact: true }).first().click()
    await page.getByRole('button', { name: /1 mois/i }).click()
    await page.getByRole('button', { name: /Mettre à jour/i }).click()

    await expect(page.getByText('QUALIFIER', { exact: true })).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Tâche flux complet E2E')).toBeVisible()
  })
})
