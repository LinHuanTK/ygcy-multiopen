import { useEffect } from 'react'
import ReactEChartsCore from 'echarts-for-react'
import useStore, { computeStatsByDate, computeStatsByEnv, computeTotalHours, computeTotalRequests } from '../stores/rootStore'

export default function StatsPage() {
  const store = useStore()
  useEffect(() => { store.loadStats(); store.loadEnvironments() }, [])

  const byDate = computeStatsByDate(store.stats)
  const byEnv = computeStatsByEnv(store.stats, store.environments)
  const totalHours = computeTotalHours(store.stats)
  const totalReqs = computeTotalRequests(store.stats)

  const lineOpt = {
    tooltip: { trigger: 'axis' as const, formatter: (p: any) => `${p[0].axisValue}<br/>运行时长: ${(p[0].value/3600).toFixed(1)} 小时` },
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category' as const, data: byDate.map(s => s.date.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' as const, name: '秒', nameTextStyle: { fontSize: 10 } },
    series: [{ type: 'line' as const, smooth: true, data: byDate.map(s => s.running), lineStyle: { color: '#2563eb', width: 2 }, areaStyle: { color: 'rgba(37,99,235,0.1)' }, symbol: 'circle', symbolSize: 4 }],
  }
  const barOpt = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category' as const, data: byEnv.map(s => s.envName), axisLabel: { fontSize: 10, rotate: 15 } },
    yAxis: { type: 'value' as const, name: '请求次数', nameTextStyle: { fontSize: 10 } },
    series: [{ type: 'bar' as const, data: byEnv.map(s => s.requests), itemStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#60a5fa' }] } as any, borderRadius: [4,4,0,0] } }],
  }
  const pieOpt = {
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${(p.value/3600).toFixed(1)} 小时` },
    series: [{ type: 'pie' as const, radius: ['30%','60%'], center: ['50%','50%'], data: byEnv.map(s => ({ name: s.envName, value: s.running })), label: { fontSize: 10 } }],
  }

  if (store.statLoading) return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">数据统计</h1>
        <p className="text-sm text-gray-400 mt-1">运行时长与 HTTP 请求统计（近 30 天）</p>
      </div>
      <div className="px-6 py-4 border-b border-gray-50 grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">总运行时长</p>
          <p className="text-2xl font-bold text-blue-600">{totalHours}<span className="text-sm font-normal text-gray-400 ml-1">小时</span></p>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">HTTP 总请求</p>
          <p className="text-2xl font-bold text-blue-600">{totalReqs.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-1">次</span></p>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">浏览器环境</p>
          <p className="text-2xl font-bold text-blue-600">{store.environments.length}<span className="text-sm font-normal text-gray-400 ml-1">个</span></p>
        </div>
      </div>
      <div className="flex-1 p-6 space-y-6">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">每日运行时长趋势</h3>
          <ReactEChartsCore option={lineOpt} style={{ height: 260 }} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">各环境 HTTP 请求</h3>
            <ReactEChartsCore option={barOpt} style={{ height: 260 }} />
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">运行时长占比</h3>
            <ReactEChartsCore option={pieOpt} style={{ height: 260 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
