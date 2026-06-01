import { IconAlertTriangle, IconX } from '@tabler/icons-react'

/**
 * Props:
 *   alerts     array    — [{ key, label }]
 *   dismissed  Set      — set of dismissed keys
 *   onDismiss  fn(key)  — called when user dismisses one alert
 */
export default function AlertBanner({ alerts = [], dismissed = new Set(), onDismiss }) {
  const visible = alerts.filter(a => !dismissed.has(a.key))
  if (!visible.length) return null

  return (
    <div className="flex flex-col gap-1 mb-3">
      {visible.map(alert => (
        <div
          key={alert.key}
          className="flex items-center gap-2 rounded-md px-3 py-2"
          style={{
            background: '#7c2d12',
            border: '1px solid #c2410c',
          }}
        >
          <IconAlertTriangle size={15} stroke={2} style={{ color: '#fb923c', flexShrink: 0 }} />
          <span className="flex-1 text-sm font-medium" style={{ color: '#fed7aa' }}>
            {alert.label}
          </span>
          {onDismiss && (
            <button
              onClick={() => onDismiss(alert.key)}
              className="hover:opacity-70 transition-opacity"
              style={{ color: '#fb923c', lineHeight: 0 }}
              aria-label="Dismiss"
            >
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
