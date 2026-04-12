/**
 * Appels HTTP vers les endpoints d'authentification Flask.
 */

import { apiClient } from './client'
import type { AuthTokens, LoginCredentials, User } from '../types'

interface RegisterPayload extends LoginCredentials {}

interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

/** Crée un compte et retourne les tokens + l'utilisateur */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
  return data
}

/** Connecte un utilisateur et retourne les tokens + l'utilisateur */
export async function login(payload: LoginCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
  return data
}

/** Renouvelle l'access token via le refresh token */
export async function refresh(): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/refresh')
  return data
}

/** Déclenche l'envoi d'un email de réinitialisation de mot de passe */
export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email })
}

/** Réinitialise le mot de passe avec le token reçu par email */
export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password })
}
