/**
 * Store Zustand pour l'authentification.
 * Gère les tokens JWT et l'état de connexion de l'utilisateur.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthTokens } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null

  /** Stocke les tokens et l'utilisateur après login/register */
  setAuth: (user: User, tokens: AuthTokens) => void

  /** Met à jour l'access token après un refresh */
  setAccessToken: (accessToken: string) => void

  /** Efface toutes les données d'auth (logout) */
  clearAuth: () => void

  /** Indique si l'utilisateur est connecté */
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      isAuthenticated: () => get().accessToken !== null,
    }),
    {
      name: 'gsd-auth',   // clé localStorage
      // Ne persister que les tokens, pas les données dérivées
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
