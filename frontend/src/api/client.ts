/**
 * Instance Axios configurée pour toutes les requêtes vers l'API Flask.
 * Injecte automatiquement le Bearer token et gère le refresh silencieux.
 * Le refresh est sérialisé via une promesse partagée pour éviter les race conditions
 * quand plusieurs requêtes expirent simultanément.
 */

import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

/** Promesse de refresh en cours — partagée entre toutes les requêtes en attente */
let refreshPromise: Promise<string> | null = null

/* ── Intercepteur requête : ajoute le token d'accès ── */
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* ── Intercepteur réponse : désemballe le wrapper {"success": true, "data": ...} ── */
apiClient.interceptors.response.use(
  (response) => {
    // Le backend Flask enveloppe toutes les réponses dans {"success": true, "data": ...}
    if (response.data?.success === true && 'data' in response.data) {
      response.data = response.data.data
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().clearAuth()
        return Promise.reject(error)
      }

      // Sérialiser les refreshes : si un refresh est déjà en cours, attendre sa résolution
      if (!refreshPromise) {
        refreshPromise = axios
          .post('/api/auth/refresh', { refresh_token: refreshToken })
          .then(({ data }) => {
            const accessToken = data?.data?.access_token ?? data?.access_token
            useAuthStore.getState().setAccessToken(accessToken)
            return accessToken
          })
          .catch((err) => {
            useAuthStore.getState().clearAuth()
            throw err
          })
          .finally(() => { refreshPromise = null })
      }

      try {
        const accessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)
