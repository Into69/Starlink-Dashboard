import { NavLink } from 'react-router-dom'
import { IconSettings } from '@tabler/icons-react'

export default function Header({ connected, dishAddress }) {
  return (
    <header
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: 44,
        background: '#0d1017',
        borderBottom: '1px solid #1e2330',
      }}
    >
      {/* Wordmark */}
      <span
        className="font-sans font-medium tracking-widest select-none"
        style={{ fontSize: 13, letterSpacing: 3 }}
      >
        <span className="text-textprimary">STAR</span>
        <span style={{ color: '#4d9fff' }}>LINK</span>
        <span className="text-textprimary"> MONITOR</span>
      </span>

      {/* Status + IP */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{
              width: 7,
              height: 7,
              background: connected ? '#22c55e' : '#4a5568',
              boxShadow: connected ? '0 0 6px #22c55e' : 'none',
              transition: 'background 0.3s, box-shadow 0.3s',
            }}
          />
          <span
            className="font-sans"
            style={{ fontSize: 11, color: connected ? '#22c55e' : '#4a5568' }}
          >
            {connected ? 'Connected — dish online' : 'Disconnected'}
          </span>
        </div>

        {dishAddress && (
          <span
            className="mono"
            style={{ fontSize: 11, color: '#4a5568' }}
          >
            {dishAddress}
          </span>
        )}

        <NavLink
          to="/settings"
          title="Settings"
          className="text-textmuted hover:text-textprimary transition-colors"
        >
          <IconSettings size={16} stroke={1.6} />
        </NavLink>
      </div>
    </header>
  )
}
