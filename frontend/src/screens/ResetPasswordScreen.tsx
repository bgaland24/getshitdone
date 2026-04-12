/**
 * Écran de réinitialisation du mot de passe.
 * Accessible via le lien envoyé par email : /reset-password/:token
 * Valide le token côté serveur lors de la soumission du formulaire.
 */

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'

type ScreenState = 'idle' | 'loading' | 'success' | 'error'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '6px',
  padding: '10px 12px',
  color: '#f0f0f0',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
}

export function ResetPasswordScreen() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [state, setState] = useState<ScreenState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Token absent dans l'URL — lien invalide
  if (!token) {
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
        <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
          Lien invalide — veuillez refaire une demande de réinitialisation.
        </p>
        <Link to="/forgot-password" style={{ color: 'var(--color-accent)', fontSize: '13px' }}>
          Mot de passe oublié ?
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    if (password !== confirmation) {
      setErrorMessage('Les mots de passe ne correspondent pas.')
      setState('error')
      return
    }

    setState('loading')

    try {
      await resetPassword(token, password)
      setState('success')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Une erreur est survenue. Le lien est peut-être expiré ou déjà utilisé.'
      setState('error')
      setErrorMessage(message)
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
        <p style={{ fontSize: '13px', color: '#ffffff' }}>
          Augmente le temps passé à faire ce que tu as décidé de faire
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '360px' }}>

        {state === 'success' ? (
          /* Confirmation de succès */
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '14px',
              color: '#f0f0f0',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}>
              Votre mot de passe a été mis à jour avec succès.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              style={{
                width: '100%',
                background: 'var(--color-accent)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Se connecter ›
            </button>
          </div>
        ) : (
          /* Formulaire de nouveau mot de passe */
          <form onSubmit={handleSubmit}>

            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0f0f0', marginBottom: '20px' }}>
              Nouveau mot de passe
            </div>

            {/* Champ nouveau mot de passe */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
                NOUVEAU MOT DE PASSE
              </div>
              <input
                type="password"
                required
                autoFocus
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={INPUT_STYLE}
              />
            </div>

            {/* Champ confirmation */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
                CONFIRMER LE MOT DE PASSE
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="••••••••"
                style={INPUT_STYLE}
              />
            </div>

            {/* Message d'erreur */}
            {state === 'error' && errorMessage && (
              <p style={{
                fontSize: '13px',
                color: '#f87171',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '16px',
              }}>
                {errorMessage}
              </p>
            )}

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={state === 'loading'}
              style={{
                width: '100%',
                background: state === 'loading' ? '#1a1a1a' : 'var(--color-accent)',
                color: state === 'loading' ? '#ffffff' : '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginBottom: '16px',
              }}
            >
              {state === 'loading' ? 'Mise à jour…' : 'Enregistrer le mot de passe ›'}
            </button>

            {/* Lien retour */}
            <div style={{ textAlign: 'center' }}>
              <Link
                to="/login"
                style={{ fontSize: '12px', color: '#aaaaaa', textDecoration: 'none' }}
              >
                ← Retour à la connexion
              </Link>
            </div>

          </form>
        )}

      </div>
    </div>
  )
}
