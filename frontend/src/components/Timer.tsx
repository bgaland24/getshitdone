/**
 * Composant Timer — affiche le temps écoulé depuis started_at.
 * Se met à jour chaque seconde tant que la session est active.
 */

import { useEffect, useState } from 'react'
import { TIMER_REFRESH_INTERVAL_MS } from '../constants'

interface TimerProps {
  startedAt: string   // ISO string
  stopped?: boolean   // si true, le timer est figé
}

/** Formate une durée en secondes → MM:SS ou HH:MM:SS */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function Timer({ startedAt, stopped = false }: TimerProps) {
  const start = new Date(startedAt).getTime()

  const [elapsed, setElapsed] = useState(
    Math.floor((Date.now() - start) / 1000)
  )

  useEffect(() => {
    if (stopped) return

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, TIMER_REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [start, stopped])

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '2rem',
        fontWeight: 500,
        color: 'var(--color-accent)',
        letterSpacing: '0.02em',
      }}
    >
      {formatDuration(elapsed)}
    </span>
  )
}
