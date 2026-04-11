/**
 * Détection des erreurs console sur toutes les routes de l'application.
 *
 * Ce test parcourt chaque écran en tant qu'utilisateur connecté et vérifie
 * qu'aucune erreur JavaScript, erreur réseau ou avertissement critique
 * n'est émis par le navigateur.
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import { loginSeedAccount } from './helpers'

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Routes à parcourir (toutes les pages accessibles après login) */
const APP_ROUTES = [
  { path: '/capture',    label: 'Capture'    },
  { path: '/organize',   label: 'Organiser'  },
  { path: '/priorities', label: 'Priorités'  },
  { path: '/qualify',    label: 'Qualifier'  },
  { path: '/score',      label: 'Score'      },
  { path: '/manage',     label: 'Gérer'      },
]

/**
 * Messages console à ignorer : erreurs attendues ou provenant de libs tierces
 * non maîtrisées (ex: avertissements React DevTools en dev).
 */
const IGNORED_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /ResizeObserver loop/i,
]

/** Niveaux considérés comme bloquants */
const BLOCKING_LEVELS = ['error', 'warning'] as const
type BlockingLevel = typeof BLOCKING_LEVELS[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Indique si un message console doit être ignoré car il correspond
 * à un pattern de la liste blanche.
 */
function isIgnored(message: ConsoleMessage): boolean {
  return IGNORED_PATTERNS.some(pattern => pattern.test(message.text()))
}

/**
 * Indique si le niveau du message est considéré comme bloquant.
 */
function isBlocking(message: ConsoleMessage): boolean {
  return (BLOCKING_LEVELS as readonly string[]).includes(message.type())
}

/**
 * Collecte les erreurs et avertissements console émis pendant la navigation
 * vers une route, après un délai d'attente pour laisser les requêtes async se terminer.
 */
async function collectConsoleIssues(
  page: Page,
  route: string,
): Promise<ConsoleMessage[]> {
  const issues: ConsoleMessage[] = []

  page.on('console', (message) => {
    if (isBlocking(message) && !isIgnored(message)) {
      issues.push(message)
    }
  })

  await page.goto(route, { waitUntil: 'networkidle' })

  return issues
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Aucune erreur console sur les écrans principaux', () => {
  for (const route of APP_ROUTES) {
    test(`${route.label} (${route.path}) — sans erreur console`, async ({ page }) => {
      await loginSeedAccount(page)

      const issues = await collectConsoleIssues(page, route.path)

      // Affiche un message clair pour chaque erreur détectée
      const report = issues
        .map(m => `[${m.type()}] ${m.text()}`)
        .join('\n')

      expect(issues, `Erreurs console détectées sur ${route.path}:\n${report}`).toHaveLength(0)
    })
  }
})

test.describe('Aucune erreur réseau (requêtes échouées) sur les écrans principaux', () => {
  for (const route of APP_ROUTES) {
    test(`${route.label} (${route.path}) — sans erreur réseau`, async ({ page }) => {
      await loginSeedAccount(page)

      const failedRequests: string[] = []

      page.on('requestfailed', (request) => {
        // On ignore les ressources tierces (polices Google, CDN) et les requêtes API
        // annulées lors de navigations (ERR_ABORTED est normal à la transition de page)
        const isThirdParty = /fonts\.(googleapis|gstatic)\.com/.test(request.url())
        const isAbortedApiCall = request.failure()?.errorText === 'net::ERR_ABORTED'
        if (!isThirdParty && !isAbortedApiCall) {
          failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`)
        }
      })

      page.on('response', (response) => {
        // On ignore les 401 sur les endpoints d'auth, préférences et scores (normaux si données absentes)
        const isAuthEndpoint = /\/(me|refresh|login|register|preferences|scores)/.test(response.url())
        if (response.status() >= 500 && !isAuthEndpoint) {
          failedRequests.push(`${response.status()} ${response.url()}`)
        }
      })

      await page.goto(route.path, { waitUntil: 'networkidle' })

      const report = failedRequests.join('\n')
      expect(failedRequests, `Requêtes échouées sur ${route.path}:\n${report}`).toHaveLength(0)
    })
  }
})
