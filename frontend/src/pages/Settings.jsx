import { useState } from 'react'
import { IconPlugConnected, IconPlugConnectedX, IconRefresh } from '@tabler/icons-react'
import { useLive } from '../App'

// ── sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div
      className="rounded-lg p-4 space-y-4"
      style={{ background: '#0d1017', border: '1px solid #1e2330' }}
    >
      <p className="label">{title}</p>
      {children}
    </div>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span style={{ fontSize: 12, color: '#e2e8f0' }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: '#2a3344' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

const POLL_OPTIONS = [1, 2, 5, 10]

export default function Settings() {
  const { settings, updateSetting, connected } = useLive()

  // Local state for the IP field (controlled while editing)
  const [ipDraft,     setIpDraft]     = useState(settings.dishAddress)
  const [testStatus,  setTestStatus]  = useState(null)   // null | 'testing' | 'ok' | 'fail'
  const [testMessage, setTestMessage] = useState('')

  async function testConnection() {
    setTestStatus('testing')
    setTestMessage('')
    try {
      const r   = await fetch('/api/health', { signal: AbortSignal.timeout(5000) })
      const data = await r.json()
      if (data.dish_reachable) {
        setTestStatus('ok')
        setTestMessage(`Dish reachable at ${data.dish_address}`)
      } else {
        setTestStatus('fail')
        setTestMessage(data.error ?? 'Dish not reachable')
      }
    } catch (err) {
      setTestStatus('fail')
      setTestMessage(err.message ?? 'Request failed')
    }
  }

  function saveIp() {
    if (ipDraft.trim()) updateSetting('dishAddress', ipDraft.trim())
  }

  const statusColor = {
    ok:      '#22c55e',
    fail:    '#ef4444',
    testing: '#f59e0b',
  }[testStatus] ?? 'transparent'

  return (
    <div className="space-y-3 max-w-lg">

      {/* ── Connection ── */}
      <Card title="Connection">
        <FieldRow
          label="Dish address"
          hint="host:port — changing requires app reload"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={ipDraft}
              onChange={e => setIpDraft(e.target.value)}
              onBlur={saveIp}
              onKeyDown={e => e.key === 'Enter' && saveIp()}
              className="flex-1 rounded px-3 py-1.5 mono outline-none"
              style={{
                fontSize: 12,
                background: '#111520',
                border: '1px solid #1e2330',
                color: '#e2e8f0',
              }}
              spellCheck={false}
            />
            <button
              onClick={testConnection}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-opacity disabled:opacity-50"
              style={{ fontSize: 12, background: '#0a2d6e', color: '#4d9fff', border: '1px solid #1a4a9e', whiteSpace: 'nowrap' }}
            >
              {testStatus === 'testing'
                ? <IconRefresh size={13} stroke={2} className="animate-spin" />
                : <IconPlugConnected size={13} stroke={2} />}
              Test
            </button>
          </div>

          {testStatus && testStatus !== 'testing' && (
            <div
              className="flex items-center gap-2 rounded px-3 py-2 mt-1"
              style={{
                background: testStatus === 'ok' ? '#0a3320' : '#3b0c0c',
                border: `1px solid ${statusColor}`,
              }}
            >
              {testStatus === 'ok'
                ? <IconPlugConnected  size={13} stroke={2} style={{ color: '#22c55e', flexShrink: 0 }} />
                : <IconPlugConnectedX size={13} stroke={2} style={{ color: '#ef4444', flexShrink: 0 }} />}
              <span style={{ fontSize: 11, color: statusColor }}>{testMessage}</span>
            </div>
          )}
        </FieldRow>

        {/* Live WS status */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{
              width: 7, height: 7,
              background: connected ? '#22c55e' : '#4a5568',
              boxShadow: connected ? '0 0 5px #22c55e' : 'none',
            }}
          />
          <span style={{ fontSize: 11, color: connected ? '#22c55e' : '#4a5568' }}>
            WebSocket {connected ? 'connected' : 'disconnected'}
          </span>
        </div>
      </Card>

      {/* ── Display ── */}
      <Card title="Display">
        <FieldRow label="Temperature unit">
          <div className="flex gap-1">
            {['C', 'F'].map(unit => (
              <button
                key={unit}
                onClick={() => updateSetting('tempUnit', unit)}
                className="rounded px-4 py-1.5 font-medium transition-colors"
                style={{
                  fontSize: 12,
                  background: settings.tempUnit === unit ? '#0a2d6e' : '#111520',
                  color:      settings.tempUnit === unit ? '#4d9fff' : '#4a5568',
                  border:     `1px solid ${settings.tempUnit === unit ? '#1a4a9e' : '#1e2330'}`,
                }}
              >
                °{unit}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Theme" hint="Additional themes coming later">
          <div
            className="flex items-center gap-2 rounded px-3 py-2"
            style={{ background: '#111520', border: '1px solid #1e2330', width: 'fit-content' }}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: '#4d9fff' }}
            />
            <span style={{ fontSize: 12, color: '#4a5568' }}>Dark (Starlink)</span>
          </div>
        </FieldRow>
      </Card>

      {/* ── Polling ── */}
      <Card title="Polling">
        <FieldRow
          label="Diagnostics &amp; device poll interval"
          hint="WebSocket telemetry is always 1 s"
        >
          <div className="flex gap-1 flex-wrap">
            {POLL_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => updateSetting('pollIntervalS', s)}
                className="rounded px-3 py-1.5 font-medium transition-colors"
                style={{
                  fontSize: 12,
                  background: settings.pollIntervalS === s ? '#0a2d6e' : '#111520',
                  color:      settings.pollIntervalS === s ? '#4d9fff' : '#4a5568',
                  border:     `1px solid ${settings.pollIntervalS === s ? '#1a4a9e' : '#1e2330'}`,
                }}
              >
                {s}s
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#2a3344' }}>
            Applies on next page load — currently active: {settings.pollIntervalS}s
          </p>
        </FieldRow>
      </Card>

      {/* ── About ── */}
      <Card title="About">
        <div className="space-y-1.5">
          {[
            ['Application',  'Starlink Monitor'],
            ['Version',      '0.2.0'],
            ['Backend',      'FastAPI + Python 3.12'],
            ['Frontend',     'React 18 + Vite + Tailwind CSS'],
            ['Data source',  'Starlink dish gRPC API (192.168.100.1:9200)'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-baseline gap-4">
              <span style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </span>
              <span style={{ fontSize: 11, color: '#4a5568' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
