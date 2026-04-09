/**
 * Badge coloré réutilisable — catégorie, horizon, urgence.
 */

interface BadgeProps {
  label: string
  color: string
}

export function Badge({ label, color }: BadgeProps) {
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color,
        background: color + '18',
        padding: '2px 7px',
        borderRadius: '3px',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}

/** Point de qualification (vert = qualifiée, orange = non qualifiée) */
export function QualDot({ qualified }: { qualified: boolean }) {
  return (
    <span
      title={qualified ? 'Qualifiée' : 'Non qualifiée'}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: qualified ? '#4CAF7D' : '#E8A23E',
        display: 'inline-block',
        flexShrink: 0,
        marginTop: 2,
      }}
    />
  )
}
