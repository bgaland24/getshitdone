/**
 * Écran de connexion / inscription.
 * Bascule entre le mode "Connexion" et "Créer un compte".
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { ROUTES } from '../constants'

export function LoginScreen() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const fn = mode === 'login' ? login : register
      const result = await fn({ email, password })
      setAuth(result.user, {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })
      navigate(ROUTES.CAPTURE, { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Une erreur est survenue'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-app)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>

      {/* Branding */}
      <div style={{ marginBottom: '36px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', color: '#f0f0f0', marginBottom: '8px' }}>
          intent<span style={{ color: 'var(--color-accent)' }}>.</span>
        </div>
        <p style={{ fontSize: '13px', color: '#444' }}>
          Rends l'intentionnalité plus facile que la réactivité.
        </p>
      </div>

      {/* Carte formulaire */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '360px' }}>

        {/* Toggle Connexion / Créer un compte */}
        <div style={{
          display: 'flex',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #2a2a2a',
          marginBottom: '24px',
        }}>
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null) }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                background: mode === m ? 'var(--color-accent)' : 'transparent',
                color: mode === m ? '#000' : '#555',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {/* Champ email */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
            EMAIL
          </div>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '6px',
              padding: '10px 12px',
              color: '#f0f0f0',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Champ mot de passe */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
            MOT DE PASSE
          </div>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '6px',
              padding: '10px 12px',
              color: '#f0f0f0',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Message d'erreur */}
        {error && (
          <p style={{
            fontSize: '13px',
            color: '#f87171',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '16px',
          }}>
            {error}
          </p>
        )}

        {/* Bouton submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#1a1a1a' : 'var(--color-accent)',
            color: loading ? '#333' : '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? 'Chargement…'
            : mode === 'login'
            ? 'Se connecter ›'
            : 'Créer le compte ›'}
        </button>
      </form>
    </div>
  )
}
