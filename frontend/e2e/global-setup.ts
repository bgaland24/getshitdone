/**
 * Global setup Playwright — exécuté une seule fois avant tous les tests E2E.
 * Reseed la BDD de test pour garantir un état connu.
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '../../backend')

  console.log('\n[e2e] Reseed de la base de données de test...')
  try {
    const output = execSync('python seed.py', {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: 'sqlite:///intentionality_test.db',
        FLASK_ENV: 'development',
      },
      encoding: 'utf8',
    })
    console.log(output)
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string }
    console.error('[e2e] Seed échoué :', error.stderr || error.message)
    throw err
  }
}
