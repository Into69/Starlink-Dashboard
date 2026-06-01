import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { createContext, useContext } from 'react'
import { useLiveData }   from './hooks/useLiveData'
import { useAlertLog }   from './hooks/useAlertLog'
import { useSettings }   from './hooks/useSettings'
import Sidebar  from './components/Layout/Sidebar'
import Header   from './components/Layout/Header'
import Dashboard   from './pages/Dashboard'
import Diagnostics from './pages/Diagnostics'
import Devices     from './pages/Devices'
import Alerts      from './pages/Alerts'
import Settings    from './pages/Settings'

export const LiveContext = createContext(null)
export const useLive     = () => useContext(LiveContext)

function Shell() {
  const live                    = useLiveData()
  const { log: alertLog, clearLog } = useAlertLog(live.data?.alerts ?? [])
  const { settings, update: updateSetting } = useSettings()

  const ctx = { ...live, alertLog, clearLog, settings, updateSetting }

  return (
    <LiveContext.Provider value={ctx}>
      <div className="flex flex-col" style={{ height: '100dvh', background: '#0a0c10' }}>
        <Header
          wsConnected={live.connected}
          dishConnected={live.dishConnected}
          dishAddress={settings.dishAddress}
        />

        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4">
            <Routes>
              <Route path="/"            element={<Dashboard />}   />
              <Route path="/diagnostics" element={<Diagnostics />} />
              <Route path="/devices"     element={<Devices />}     />
              <Route path="/alerts"      element={<Alerts />}      />
              <Route path="/settings"    element={<Settings />}    />
            </Routes>
          </main>
        </div>
      </div>
    </LiveContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
