/**
 * TutorialOverlay — overlay séquentiel affiché à la première connexion.
 * Met en surbrillance chaque élément cible un par un avec une bulle explicative.
 * Ne s'affiche plus après avoir été complété ou passé (persisté en localStorage).
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_DONE_VALUE,
  TUTORIAL_TARGET_ATTR,
  TUTORIAL_TARGETS,
} from '../constants'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface TutorialStep {
  /** Correspond à la valeur de data-tutorial sur l'élément cible */
  targetId: string
  /** Texte explicatif affiché dans la bulle */
  message: string
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

/** Abstraction de storage injectable — facilite les tests unitaires */
interface StorageAdapter {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

/* ─── Étapes du tutoriel ─────────────────────────────────────────────────── */

/** Séquence ordonnée des étapes. Tous les identifiants viennent de TUTORIAL_TARGETS. */
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetId: TUTORIAL_TARGETS.CAPTURE,
    message: "Saisis ici par une phrase, les tâches ou idées de tâches. L'objectif est de ne pas garder en tête ce qui est à faire plus tard.",
  },
  {
    targetId: TUTORIAL_TARGETS.QUALIFY,
    message: "Sur cette page il faut qualifier chaque tâche : niveau d'urgence, d'importance et date de réalisation max. Cela permet de fixer les  critères de tri pour décider sur quoi se concentrer.",
  },
  {
    targetId: TUTORIAL_TARGETS.ORGANIZE,
    message: "Visualise et réorganise tes tâches par catégorie et livrable. Sur desktop, utilise le glisser-déposer pour les déplacer.",
  },
  {
    targetId: TUTORIAL_TARGETS.PRIORITIES,
    message: "Cette page te propose une liste priorisée de tâches à faire, basée sur les critères que tu as définis. C'est ici que tu peux décider sur quoi tu vas te concentrer aujourd'hui et/ou demain (en épinglant les tâches que tu veux faire en priorité).",
  },
  {
    targetId: TUTORIAL_TARGETS.PARAM,
    message: "Configure tes catégories et livrables.",
  },
]

/** Padding visuel autour de l'élément mis en surbrillance (en px) */
const HIGHLIGHT_PADDING = 6

/** Largeur fixe de la bulle (en px) */
const BUBBLE_WIDTH = 280

/** Marge minimale par rapport aux bords du viewport (en px) */
const BUBBLE_EDGE_MARGIN = 16

/* ─── Hook logique ───────────────────────────────────────────────────────── */

/**
 * Encapsule tout l'état et la logique du tutoriel.
 * Séparé du rendu pour pouvoir être testé indépendamment.
 */
function useTutorial(storage: StorageAdapter) {
  const [isVisible, setIsVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)

  /** Marque le tutoriel comme terminé et masque l'overlay */
  const dismiss = useCallback(() => {
    storage.setItem(TUTORIAL_STORAGE_KEY, TUTORIAL_DONE_VALUE)
    setIsVisible(false)
  }, [storage])

  /** Avance à l'étape suivante, ou termine si on est sur la dernière */
  const advance = useCallback(() => {
    if (stepIndex < TUTORIAL_STEPS.length - 1) {
      setStepIndex((prev) => prev + 1)
    } else {
      dismiss()
    }
  }, [stepIndex, dismiss])

  /** Au montage : affiche le tutoriel uniquement s'il n'a pas encore été vu */
  useEffect(() => {
    const alreadyDone = storage.getItem(TUTORIAL_STORAGE_KEY) === TUTORIAL_DONE_VALUE
    if (!alreadyDone) setIsVisible(true)
  }, [storage])

  /** Écoute l'événement custom pour relancer le tutoriel depuis n'importe où */
  useEffect(() => {
    const handleRestart = () => {
      setStepIndex(0)
      setIsVisible(true)
    }
    window.addEventListener('intent:restart-tutorial', handleRestart)
    return () => window.removeEventListener('intent:restart-tutorial', handleRestart)
  }, [])

  /**
   * À chaque changement d'étape : localise l'élément cible via son attribut
   * data-tutorial et enregistre son rect. requestAnimationFrame garantit que
   * le DOM est peint avant la mesure.
   */
  useEffect(() => {
    if (!isVisible) return

    const measure = () => {
      const currentStep = TUTORIAL_STEPS[stepIndex]
      const el = document.querySelector(
        `[${TUTORIAL_TARGET_ATTR}="${currentStep.targetId}"]`
      )
      if (el) {
        const r = el.getBoundingClientRect()
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      } else {
        // Élément absent du DOM — bulle centrée sans surbrillance
        setTargetRect(null)
      }
    }

    const rafId = requestAnimationFrame(measure)

    // Remesure si la fenêtre est redimensionnée (ex: rotation mobile)
    window.addEventListener('resize', measure)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', measure)
    }
  }, [isVisible, stepIndex])

  return {
    isVisible,
    currentStep: TUTORIAL_STEPS[stepIndex],
    stepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    targetRect,
    advance,
    dismiss,
  }
}

/* ─── Composant de rendu pur ─────────────────────────────────────────────── */

interface TutorialOverlayViewProps {
  step: TutorialStep
  stepIndex: number
  totalSteps: number
  targetRect: TargetRect | null
  onAdvance: () => void
  onDismiss: () => void
}

/**
 * Rendu visuel du tutoriel — ne contient aucune logique métier.
 * Quatre bandes sombres forment le "trou" autour de l'élément cible.
 */
function TutorialOverlayView({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onAdvance,
  onDismiss,
}: TutorialOverlayViewProps) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const isLastStep = stepIndex === totalSteps - 1

  // Zone mise en surbrillance (avec padding autour de l'élément)
  const hl = targetRect
    ? {
        top:    targetRect.top    - HIGHLIGHT_PADDING,
        left:   targetRect.left   - HIGHLIGHT_PADDING,
        width:  targetRect.width  + HIGHLIGHT_PADDING * 2,
        height: targetRect.height + HIGHLIGHT_PADDING * 2,
      }
    : null

  // Position horizontale de la bulle — centrée sur la cible, bornée aux bords
  const bubbleLeft = hl
    ? Math.max(
        BUBBLE_EDGE_MARGIN,
        Math.min(
          hl.left + hl.width / 2 - BUBBLE_WIDTH / 2,
          vw - BUBBLE_WIDTH - BUBBLE_EDGE_MARGIN,
        ),
      )
    : vw / 2 - BUBBLE_WIDTH / 2

  // Position verticale — au-dessus si la cible est dans la moitié basse
  const targetCenterY = hl ? hl.top + hl.height / 2 : vh / 2
  const bubbleAbove = targetCenterY > vh / 2

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10000,
    width: `${BUBBLE_WIDTH}px`,
    left: `${bubbleLeft}px`,
    ...(bubbleAbove && hl
      ? { bottom: `${vh - hl.top + 12}px` }
      : { top: hl ? `${hl.top + hl.height + 12}px` : `${vh / 2}px` }),
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  }

  return (
    <>
      {/* ── Quatre bandes sombres formant le "trou" ── */}
      {hl ? (
        <>
          {/* Bande haute */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, top: 0, left: 0, right: 0, height: `${hl.top}px`, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none' }} />
          {/* Bande basse */}
          <div style={{ position: 'fixed', zIndex: 9999, top: `${hl.top + hl.height}px`, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none' }} />
          {/* Bande gauche */}
          <div style={{ position: 'fixed', zIndex: 9999, top: `${hl.top}px`, left: 0, width: `${hl.left}px`, height: `${hl.height}px`, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none' }} />
          {/* Bande droite */}
          <div style={{ position: 'fixed', zIndex: 9999, top: `${hl.top}px`, left: `${hl.left + hl.width}px`, right: 0, height: `${hl.height}px`, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none' }} />
          {/* Anneau de surbrillance autour de l'élément cible */}
          <div style={{
            position: 'fixed',
            zIndex: 9999,
            top: `${hl.top}px`,
            left: `${hl.left}px`,
            width: `${hl.width}px`,
            height: `${hl.height}px`,
            border: '2px solid var(--color-accent)',
            borderRadius: '8px',
            pointerEvents: 'none',
          }} />
        </>
      ) : (
        // Pas de cible : overlay plein
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none' }} />
      )}

      {/* ── Bulle explicative ── */}
      <div style={bubbleStyle}>
        {/* Compteur d'étapes */}
        <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', marginBottom: '10px', textAlign: 'right' }}>
          {stepIndex + 1} / {totalSteps}
        </div>

        {/* Message */}
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#f0f0f0', lineHeight: 1.5 }}>
          {step.message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#aaaaaa',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Passer
          </button>
          <button
            onClick={onAdvance}
            style={{
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              color: '#000',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isLastStep ? 'Terminer ✓' : 'Suivant →'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── Composant exporté ──────────────────────────────────────────────────── */

interface TutorialOverlayProps {
  /** Adapter de storage injectable — utilise window.localStorage par défaut */
  storage?: StorageAdapter
}

/**
 * Point d'entrée du tutoriel.
 * Rendu via un Portal sur document.body pour échapper à tout contexte de stacking.
 */
export function TutorialOverlay({ storage = window.localStorage }: TutorialOverlayProps) {
  const { isVisible, currentStep, stepIndex, totalSteps, targetRect, advance, dismiss } =
    useTutorial(storage)

  if (!isVisible) return null

  return createPortal(
    <TutorialOverlayView
      step={currentStep}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      targetRect={targetRect}
      onAdvance={advance}
      onDismiss={dismiss}
    />,
    document.body,
  )
}
