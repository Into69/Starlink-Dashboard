import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const GRID     = '#1e2330'
const LAT_CLR  = '#a78bfa'
const DROP_CLR = '#f59e0b'

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded px-2 py-1.5 text-xs"
      style={{ background: '#0d1017', border: '1px solid #1e2330' }}
    >
      <p style={{ color: '#4a5568', marginBottom: 4 }}>{fmtTime(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value != null ? p.value.toFixed(p.dataKey === 'drop_rate_pct' ? 2 : 0) : '—'}
          {p.dataKey === 'drop_rate_pct' ? ' %' : ' ms'}
        </p>
      ))}
    </div>
  )
}

export default function LatencyChart({ data = [] }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <span className="label">Latency &amp; Drop rate</span>
        <span className="flex items-center gap-1 text-xs" style={{ color: LAT_CLR }}>
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: LAT_CLR }} />
          Latency
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: DROP_CLR }}>
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: DROP_CLR }} />
          Drop rate
        </span>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 28, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />

          <XAxis
            dataKey="timestamp"
            tickFormatter={fmtTime}
            tick={{ fontSize: 9, fill: '#4a5568' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />

          {/* Left Y axis: latency ms */}
          <YAxis
            yAxisId="lat"
            tick={{ fontSize: 9, fill: '#4a5568' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}`}
            width={28}
          />

          {/* Right Y axis: drop rate % */}
          <YAxis
            yAxisId="drop"
            orientation="right"
            tick={{ fontSize: 9, fill: '#4a5568' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            width={28}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            yAxisId="lat"
            type="monotone"
            dataKey="latency_ms"
            name="Latency"
            stroke={LAT_CLR}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            yAxisId="drop"
            type="monotone"
            dataKey="drop_rate_pct"
            name="Drop rate"
            stroke={DROP_CLR}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
