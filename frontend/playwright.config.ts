import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour les tests E2E.
 * Reseed la BDD de test avant de démarrer les serveurs.
 * Backend Flask + Frontend Vite démarrés automatiquement.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 15_000,
  retries: 0,
  maxFailures: 3,   // Stoppe après 3 échecs
  workers: 1,       // Tests séquentiels — BDD partagée

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  /**
   * webServer[0] : reseed la BDD de test, puis démarre Flask sur la BDD de test.
   * webServer[1] : démarre Vite (proxifie /api vers Flask).
   *
   * L'ordre est important : le seed doit tourner avant que Flask soit prêt.
   * On utilise un script shell qui fait les deux séquentiellement.
   */
  webServer: [
    {
      // Seed puis démarrage Flask — les deux utilisent intentionality_test.db
      command: 'cd ../backend && python run.py',
      url: 'http://localhost:5000/api/auth/login',
      reuseExistingServer: true,
      timeout: 30_000,
      env: { DATABASE_URL: 'sqlite:///intentionality_test.db' },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],

  /**
   * globalSetup : reseed la BDD avant tous les tests (si Flask tourne déjà).
   */
  globalSetup: './e2e/global-setup.ts',
})
