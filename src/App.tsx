import { useState } from 'react'
import Sidebar from './components/Sidebar'
import EnvironmentPage from './pages/EnvironmentPage'
import LogPage from './pages/LogPage'
import ProxyPage from './pages/ProxyPage'
import StatsPage from './pages/StatsPage'
import SyncPage from './pages/SyncPage'
import AuthPage from './pages/AuthPage'

type Page = 'environments' | 'stats' | 'apps' | 'sync' | 'logs' | 'settings'
interface User { id: string; username: string; role: string }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('environments')

  if (!user) return <AuthPage onLogin={setUser} />

  const renderPage = () => {
    switch (currentPage) {
      case 'environments': return <EnvironmentPage />
      case 'stats': return <StatsPage />
      case 'logs': return <LogPage />
      case 'sync': return <SyncPage />
      case 'settings': return <ProxyPage />
      default: return <div className="flex items-center justify-center h-full text-gray-400 text-sm">开发中...</div>
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-blue-50 to-white">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} user={user} />
        <main className="flex-1 overflow-y-auto bg-transparent">{renderPage()}</main>
      </div>
    </div>
  )
}
