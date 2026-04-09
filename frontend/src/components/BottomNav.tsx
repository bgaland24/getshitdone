/**
 * Barre de navigation inférieure fixe avec 5 onglets.
 * Affiche des badges numériques selon l'état des données.
 */

import { NavLink } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useTaskStore } from '../store/taskStore'

interface NavItem {
  route: string
  label: string
  icon: string
  badge?: number
}

export function BottomNav() {
  const tasks = useTaskStore((s) => s.tasks)

  /** Nouvelles tâches sans qualification — badge sur Capture */
  const unorganizedCount = tasks.filter((t) => t.status === 'new' && !t.is_qualified).length

  /** Tâches non qualifiées — badge sur Qualifier */
  const unqualifiedCount = tasks.filter((t) => !t.is_qualified).length

  const navItems: NavItem[] = [
    { route: ROUTES.CAPTURE,    label: 'Capture',    icon: '✦', badge: unorganizedCount || undefined },
    { route: ROUTES.ORGANIZE,   label: 'Organiser',  icon: '≡' },
    { route: ROUTES.QUALIFY,    label: 'Qualifier',  icon: '◈', badge: unqualifiedCount || undefined },
    { route: ROUTES.PRIORITIES, label: 'Priorités',  icon: '◎' },
    { route: ROUTES.SCORE,      label: 'Score',      icon: '▲' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border-subtle)',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.route}
          to={item.route}
          className="relative flex flex-col items-center gap-1 px-4 py-1 transition-colors"
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
          })}
        >
          {/* Icône avec badge optionnel */}
          <span className="relative" style={{ fontSize: '18px', lineHeight: 1 }}>
            {item.icon}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full text-black font-mono font-bold"
                style={{
                  background: 'var(--color-accent)',
                  fontSize: '9px',
                  minWidth: '15px',
                  height: '15px',
                  padding: '0 3px',
                }}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </span>

          {/* Label */}
          <span style={{ fontSize: '10px', letterSpacing: '0.03em' }}>
            {item.label}
          </span>
        </NavLink>
      ))}
    </nav>
  )
}
