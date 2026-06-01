/**
 * A single stat card.
 *
 * Props:
 *   label      string   — e.g. "DOWNLOAD"
 *   value      any      — displayed large; null/undefined → "—"
 *   unit       string   — e.g. "Mbps", "ms"
 *   sublabel   string   — small colored status text
 *   color      string   — CSS color for sublabel + value accent
 */
export default function StatCard({ label, value, unit, sublabel, color = '#22c55e' }) {
  const display = value === null || value === undefined ? '—' : value

  return (
    <div
      className="rounded-lg flex flex-col gap-1"
      style={{
        background: '#0d1017',
        border: '1px solid #1e2330',
        padding: '10px 12px',
        minWidth: 0,
      }}
    >
      <span
        className="uppercase tracking-widest"
        style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.08em' }}
      >
        {label}
      </span>

      <div className="flex items-baseline gap-1.5">
        <span
          className="font-medium tabular-nums"
          style={{ fontSize: 20, color: '#e2e8f0', lineHeight: 1 }}
        >
          {display}
        </span>
        {unit && (
          <span style={{ fontSize: 11, color: '#4a5568' }}>{unit}</span>
        )}
      </div>

      {sublabel && (
        <span style={{ fontSize: 10, color }}>{sublabel}</span>
      )}
    </div>
  )
}
