/**
 * Écran de demande de réinitialisation de mot de passe.
 * Affiche un formulaire email, puis un message de confirmation générique
 * (identique qu'il s'agisse d'un email enregistré ou non — anti-énumération).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'

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

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<ScreenState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)
    setState('loading')

    try {
      await forgotPassword(email.trim().toLowerCase())
      // On passe toujours en succès, même si l'email n'existe pas (anti-énumération)
      setState('success')
    } catch {
      setState('error')
      setErrorMessage('Une erreur réseau est survenue. Veuillez réessayer.')
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
          /* Confirmation — identique qu'il s'agisse d'un email existant ou non */
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
              Si un compte correspond à cet email, un lien de réinitialisation a été envoyé.
              Pensez à vérifier vos spams.
            </p>
            <Link
              to="/login"
              style={{
                fontSize: '13px',
                color: 'var(--color-accent)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          /* Formulaire */
          <form onSubmit={handleSubmit}>

            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0f0f0', marginBottom: '20px' }}>
              Mot de passe oublié
            </div>

            {/* Champ email */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#ffffff', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
                EMAIL
              </div>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={INPUT_STYLE}
              />
            </div>

            {/* Message d'erreur réseau */}
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
              {state === 'loading' ? 'Envoi en cours…' : 'Envoyer le lien ›'}
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
