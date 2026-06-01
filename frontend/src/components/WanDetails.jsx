/**
 * WAN details key/value card.
 * Props: data — object from GET /api/wan, or null while loading.
 */
export default function WanDetails({ data = null }) {
  const rows = [
    { label: 'External IP', value: data?.wan_ip,       mono: true  },
    { label: 'IPv6',        value: data?.ipv6_address, mono: true,
      render: v => v
        ? <span style={{ color: '#22c55e' }}>{v}</span>
        : <span style={{ color: '#4a5568' }}>disabled</span>
    },
    { label: 'DNS',
      value: data?.dns_servers?.length
        ? data.dns_servers.join(', ')
        : null,
      mono: true
    },
    { label: 'NAT type',    value: data?.nat_type },
    { label: 'Gateway',     value: data?.gateway,      mono: true  },
  ]

  return (
    <div className="flex flex-col">
      <p className="label mb-2">WAN Details</p>
      <div className="flex flex-col divide-y" style={{ borderColor: '#1a2030' }}>
        {rows.map(({ label, value, mono, render }) => (
          <div key={label} className="flex justify-between items-baseline py-1.5 gap-3">
            <span style={{ fontSize: 10, color: '#4a5568', whiteSpace: 'nowrap' }}>
              {label}
            </span>
            <span
              className={mono ? 'mono' : ''}
              style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'right', wordBreak: 'break-all' }}
            >
              {render
                ? render(value)
                : (value ?? <span style={{ color: '#2a3344' }}>—</span>)
              }
            </span>
          </div>
        ))}
      </div>

      {!data && (
        <p style={{ fontSize: 10, color: '#2a3344', marginTop: 4 }}>
          Requires Starlink router on local network
        </p>
      )}
    </div>
  )
}
