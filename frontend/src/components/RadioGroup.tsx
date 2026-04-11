/**
 * Groupe de boutons outlined à sélection unique.
 * Partagé entre QualifyForm et DetailedCaptureForm.
 */

export interface RadioOption {
  val: string
  label: string
  color?: string
}

export function RadioGroup({
  label,
  required,
  options,
  value,
  onChange,
}: {
  label: string
  required?: boolean
  options: RadioOption[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          fontSize: '11px',
          color: '#ffffff',
          letterSpacing: '0.08em',
          fontWeight: 600,
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {label.toUpperCase()}
        {required && <span style={{ color: '#E86B3E' }}>*</span>}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
        {options.map(({ val, label: lbl, color }) => {
          const isSelected = value === val
          const activeColor = color || '#f0f0f0'
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(isSelected ? null : val)}
              style={{
                flex: 1,
                padding: '7px 6px',
                borderRadius: '6px',
                border: `1px solid ${isSelected ? activeColor : 'rgba(255,255,255,0.3)'}`,
                background: isSelected ? activeColor + '22' : 'transparent',
                color: isSelected ? activeColor : '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: isSelected ? 600 : 400,
                transition: 'all 0.15s',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}
