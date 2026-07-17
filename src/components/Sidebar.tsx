import { useState } from 'react'
import { LayersIcon, DashboardIcon, GlobeIcon, FileTextIcon, GearIcon, PlusIcon, ExitIcon, LockClosedIcon } from '@radix-ui/react-icons'
import ChangePasswordDialog from './ChangePasswordDialog'

type Page = 'environments' | 'stats' | 'apps' | 'sync' | 'logs' | 'settings'

interface User { id: string; username: string; role: string }
interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  user: User
}

const navItems: { key: Page; label: string; icon: React.ReactNode }[] = [
  { key: 'environments', label: '环境管理', icon: <LayersIcon className="w-4 h-4" /> },
  { key: 'stats', label: '数据统计', icon: <DashboardIcon className="w-4 h-4" /> },
  { key: 'apps', label: '应用中心', icon: <DashboardIcon className="w-4 h-4" /> },
  { key: 'sync', label: '窗口同步', icon: <GlobeIcon className="w-4 h-4" /> },
  { key: 'logs', label: '操作日志', icon: <FileTextIcon className="w-4 h-4" /> },
  { key: 'settings', label: '代理管理', icon: <GearIcon className="w-4 h-4" /> },
]

export default function Sidebar({ currentPage, onNavigate, user }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)

  return (
    <aside
      className="h-full flex flex-col border-r border-gray-100 bg-gradient-to-b from-blue-50/40 to-white select-none"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg" />
        <span className="text-base font-semibold text-gray-900">愿光指纹浏览器</span>
      </div>

      {/* 新建按钮 */}
      <div className="px-3 mb-4">
        <button className="w-full flex items-center justify-between gap-2 bg-[#2563eb] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]">
          <span>新建浏览器</span>
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* 导航 */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.key
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-75 ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 用户信息 - 底部 */}
      <div className="relative px-3 pb-4 pt-2 border-t border-gray-100">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-75"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-800">{user.role === 'admin' ? '管理员' : user.username}</p>
            <p className="text-xs text-gray-400">{user.role === 'admin' ? 'root' : user.username}</p>
          </div>
        </button>

        {/* 下拉菜单 */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            <button onClick={() => { setMenuOpen(false); setChangePwdOpen(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <LockClosedIcon className="w-4 h-4 text-gray-400" />
              修改密码
            </button>
            <button onClick={() => window.location.reload()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <ExitIcon className="w-4 h-4" />
              退出登录
            </button>
          </div>
        )}
      </div>

      <ChangePasswordDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} username={user.username} />
    </aside>
  )
}
