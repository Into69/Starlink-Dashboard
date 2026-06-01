import { NavLink } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconRadar,
  IconDevices,
  IconBell,
  IconSettings,
} from '@tabler/icons-react'

const NAV = [
  { to: '/',            icon: IconLayoutDashboard, label: 'Dashboard'   },
  { to: '/diagnostics', icon: IconRadar,            label: 'Diagnostics' },
  { to: '/devices',     icon: IconDevices,          label: 'Devices'     },
  { to: '/alerts',      icon: IconBell,             label: 'Alerts'      },
  { to: '/settings',    icon: IconSettings,         label: 'Settings'    },
]

export default function Sidebar() {
  return (
    <nav
      className="flex flex-col items-center py-3 gap-1 shrink-0"
      style={{ width: 52, background: '#0d1017', borderRight: '1px solid #1e2330' }}
    >
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={label}
          className={({ isActive }) =>
            [
              'flex items-center justify-center rounded-md transition-colors',
              'w-9 h-9',
              isActive
                ? 'text-accent'
                : 'text-textmuted hover:text-[#8ba4c4]',
            ].join(' ')
          }
          style={({ isActive }) =>
            isActive ? { background: '#0a2d6e' } : undefined
          }
        >
          {({ isActive }) => (
            <Icon
              size={20}
              stroke={1.6}
              color={isActive ? '#4d9fff' : undefined}
            />
          )}
        </NavLink>
      ))}
    </nav>
  )
}
