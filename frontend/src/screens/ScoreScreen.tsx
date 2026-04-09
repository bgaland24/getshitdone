/**
 * Écran Score — anneau global, 3 jauges, histogramme 4 semaines, détail catégories.
 */

import { useEffect, useState } from 'react'
import { fetchTodayScore, fetchWeeklyScore, fetchScoreHistory } from '../api/scores'
import { ScoreRing } from '../components/ScoreRing'
import type { TodayScore, WeeklyScore, HistoryEntry } from '../types'

export function ScoreScreen() {
  const [todayScore,  setTodayScore]  = useState<TodayScore | null>(null)
  const [weeklyScore, setWeeklyScore] = useState<WeeklyScore | null>(null)
  const [history,     setHistory]     = useState<HistoryEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([fetchTodayScore(), fetchWeeklyScore(), fetchScoreHistory(4)])
      .then(([today, weekly, hist]) => { setTodayScore(today); setWeeklyScore(weekly); setHistory(hist) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#333', fontSize: '13px' }}>Chargement…</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px 0' }}>
      <h2 style={{ margin: '0 0 28px', fontSize: '24px', color: '#f0f0f0', fontWeight: 700, letterSpacing: '-0.02em' }}>
        Score
      </h2>

      {/* Anneau */}
      <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative', display: 'inline-block', left: '50%', transform: 'translateX(-50%)' }}>
        <ScoreRing score={todayScore?.global_score ?? 0} size={160} strokeWidth={14} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '38px', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {Math.round(todayScore?.global_score ?? 0)}
          </div>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.06em', marginTop: '4px' }}>
            INTENTIONNALITÉ
          </div>
        </div>
      </div>

      {/* 3 sous-scores */}
      {todayScore && (
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <SubBar label="Respect des priorités"     value={todayScore.intentionality_score} color="#4CAF7D" desc="Tâches prioritaires complétées vs planifiées" />
          <SubBar label="Allocations temporelles"   value={todayScore.efficiency_score}     color="#7B8FE8" desc="Temps réel par catégorie vs objectifs hebdo" />
          <SubBar label="Qualité de clôture"        value={todayScore.engagement_score}     color="#E8C93E" desc="Tâches terminées dans les 5 min après session" />
        </div>
      )}

      {/* Histogramme 4 semaines */}
      {history.length > 0 && (
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', marginBottom: '16px', fontWeight: 600 }}>
            ÉVOLUTION 4 SEMAINES
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px' }}>
            {history.map((entry, i) => {
              const isLast = i === history.length - 1
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: isLast ? 'var(--color-accent)' : '#444', fontFamily: 'var(--font-mono)' }}>
                    {Math.round(entry.score)}
                  </span>
                  <div style={{
                    width: '100%',
                    background: isLast ? 'var(--color-accent)' : '#2a2a2a',
                    borderRadius: '3px 3px 0 0',
                    height: `${(entry.score / 100) * 48}px`,
                    minHeight: '4px',
                  }} />
                  <span style={{ fontSize: '9px', color: '#333' }}>
                    S-{history.length - 1 - i}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Détail catégories */}
      {weeklyScore && weeklyScore.category_breakdown.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>
            PAR CATÉGORIE — CETTE SEMAINE
          </p>
          {weeklyScore.category_breakdown.map((cat) => (
            <div
              key={cat.category_id}
              style={{
                background: '#0f0f0f',
                border: '1px solid #1e1e1e',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#ccc' }}>{cat.category_name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#555', fontFamily: 'var(--font-mono)' }}>
                  {cat.time_spent_minutes}m / {cat.weekly_target_minutes}m
                </span>
              </div>
              <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(cat.completion_rate * 100, 100)}%`,
                  background: cat.color,
                  borderRadius: '2px',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Sous-composants ─────────────────────────────────────────────────── */

function SubBar({ label, value, color, desc }: { label: string; value: number; color: string; desc: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: '#aaa' }}>{label}</span>
        <span style={{ fontSize: '16px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {Math.round(value)}%
        </span>
      </div>
      <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px' }} />
      </div>
      <p style={{ fontSize: '11px', color: '#555', marginTop: '4px', fontStyle: 'italic' }}>{desc}</p>
    </div>
  )
}
