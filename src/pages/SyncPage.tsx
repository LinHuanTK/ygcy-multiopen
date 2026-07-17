import { useState } from 'react'
import { PlayIcon, StopIcon, CheckIcon } from '@radix-ui/react-icons'

interface SyncGroup {
  id: string
  name: string
  envIds: string[]
  actions: string[]
  status: 'idle' | 'syncing' | 'completed' | 'error'
  lastSync: string
}

const MOCK_GROUPS: SyncGroup[] = [
  { id: 'sg-1', name: 'B站矩阵同步组', envIds: ['ENV-001', 'ENV-005'], actions: ['滚动', '点赞', '评论'], status: 'idle', lastSync: '2026-07-16 14:30' },
  { id: 'sg-2', name: '抖音批量操作', envIds: ['ENV-002'], actions: ['刷新', '截屏'], status: 'completed', lastSync: '2026-07-16 15:00' },
]

const ACTION_LABELS: Record<string, string> = {
  scroll: '同步滚动',
  click: '同步点击',
  like: '点赞',
  comment: '评论',
  refresh: '刷新',
  screenshot: '截屏',
  input: '输入同步',
}

export default function SyncPage() {
  const [groups, setGroups] = useState<SyncGroup[]>(MOCK_GROUPS)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const handleSync = (id: string) => {
    setGroups(p => p.map(g => g.id === id ? { ...g, status: 'syncing' as const } : g))
    setTimeout(() => {
      setGroups(p => p.map(g => g.id === id ? { ...g, status: 'completed' as const, lastSync: new Date().toLocaleString() } : g))
    }, 2000)
  }

  const handleStop = (id: string) => {
    setGroups(p => p.map(g => g.id === id ? { ...g, status: 'idle' as const } : g))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">窗口同步</h1>
        <p className="text-sm text-gray-400 mt-1">跨浏览器窗口的同步操作</p>
      </div>

      {/* 同步组列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {groups.map(group => (
          <div key={group.id}
            className={`bg-white border rounded-lg p-5 transition-colors duration-75 cursor-pointer ${selectedGroup === group.id ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100 hover:border-gray-200'}`}
            onClick={() => setSelectedGroup(group.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  group.status === 'syncing' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                  group.status === 'completed' ? 'bg-green-50 text-green-600' :
                  group.status === 'error' ? 'bg-red-50 text-red-600' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {group.status === 'completed' ? <CheckIcon className="w-4 h-4" /> : group.envIds.length}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">{group.name}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {group.envIds.length} 个环境 · 上次同步: {group.lastSync}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {group.status === 'syncing' ? (
                  <button onClick={() => handleStop(group.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                    <StopIcon className="w-3.5 h-3.5" /> 停止
                  </button>
                ) : (
                  <button onClick={() => handleSync(group.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <PlayIcon className="w-3.5 h-3.5" /> 同步
                  </button>
                )}
              </div>
            </div>

            {/* 同步动作标签 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {group.actions.map(action => (
                <span key={action}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-500">
                  {ACTION_LABELS[action] || action}
                </span>
              ))}
            </div>

            {/* 展开详情 */}
            {selectedGroup === group.id && (
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                <p className="text-xs font-medium text-gray-500 mb-2">包含的环境</p>
                {group.envIds.map(envId => (
                  <div key={envId} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <span className="text-xs font-mono text-gray-400">{envId}</span>
                    <span className="text-gray-600">环境名称占位</span>
                    <span className="ml-auto text-xs text-gray-400">待同步</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 空状态 */}
        {groups.length === 0 && (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            暂无同步组，创建一个开始同步
          </div>
        )}
      </div>
    </div>
  )
}
