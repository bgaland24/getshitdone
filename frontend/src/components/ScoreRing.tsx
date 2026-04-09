/**
 * Anneau SVG animé représentant un score global (0–100).
 * L'animation se déclenche au montage.
 */

import { useEffect, useRef } from 'react'
import { SCORE_COLORS, SCORE_COLOR_THRESHOLDS } from '../constants'

interface ScoreRingProps {
  score: number       // 0–100
  size?: number       // diamètre en px (défaut 160)
  strokeWidth?: number
}

function scoreColor(score: number): string {
  if (score >= SCORE_COLOR_THRESHOLDS.HIGH)   return SCORE_COLORS.HIGH
  if (score >= SCORE_COLOR_THRESHOLDS.MEDIUM) return SCORE_COLORS.MEDIUM
  return SCORE_COLORS.LOW
}

export function ScoreRing({ score, size = 160, strokeWidth = 10 }: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = scoreColor(score)

  /* ── Animation au montage ── */
  useEffect(() => {
    const el = circleRef.current
    if (!el) return

    // Démarre depuis circumference (vide) puis va vers offset
    el.style.strokeDashoffset = `${circumference}`
    el.style.transition = 'none'

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
        el.style.strokeDashoffset = `${offset}`
      })
    })
  }, [score, circumference, offset])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Fond de l'anneau */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-medium)"
          strokeWidth={strokeWidth}
        />
        {/* Anneau de score */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>

      {/* Score centré */}
      <div
        className="absolute flex flex-col items-center"
        style={{ transform: 'none' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2rem',
            fontWeight: 500,
            color,
            lineHeight: 1,
          }}
        >
          {Math.round(score)}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: '2px',
          }}
        >
          Score
        </span>
      </div>
    </div>
  )
}
