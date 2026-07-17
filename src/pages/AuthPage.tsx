import { useState, useEffect } from 'react'

interface AuthPageProps {
  onLogin: (user: { id: string; username: string; role: string }) => void
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'loading' | 'bind' | 'login' | 'register'>('loading')
  const [bindPassword, setBindPassword] = useState('')
  const [bindError, setBindError] = useState('')
  const [bindLoading, setBindLoading] = useState(false)
  const [bindMsg, setBindMsg] = useState('')

  // 登录/注册状态
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // 检查 Keychain 是否已绑定
  useEffect(() => {
    checkKeychain()
  }, [])

  const checkKeychain = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const bound: boolean = await invoke('is_keychain_bound')
      setMode(bound ? 'login' : 'bind')
    } catch {
      setMode('login') // 非 Tauri 环境直接显示登录
    }
  }

  const handleBind = async () => {
    setBindError('')
    if (!bindPassword) { setBindError('请输入管理员密码'); return }
    setBindLoading(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const ok: boolean = await invoke('bind_keychain', { password: bindPassword })
      if (ok) {
        // 初始化数据库
        await invoke('finalize_bind')
        setBindPassword('')
        setBindMsg('密钥已保存，正在刷新...')
        // 重新加载整个应用（用真实密钥重新初始化）
        setTimeout(() => { window.location.reload() }, 1000)
      } else {
        setBindError('管理员密码错误')
      }
    } catch (e: any) {
      setBindError(e?.toString() || '绑定失败')
    }
    setBindLoading(false)
  }

  const handleLogin = async () => {
    setAuthError('')
    if (!username || !password) { setAuthError('请输入用户名和密码'); return }
    setAuthLoading(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const result: any = await invoke('login', { username, password })
      if (result.success) {
        onLogin(result.user)
      } else {
        setAuthError(result.error || '登录失败')
      }
    } catch (e: any) {
      setAuthError(e?.toString() || '登录失败')
    }
    setAuthLoading(false)
  }

  const handleRegister = async () => {
    setAuthError('')
    if (!username || !password) { setAuthError('请填写完整信息'); return }
    if (password !== confirmPassword) { setAuthError('两次密码不一致'); return }
    if (password.length < 4) { setAuthError('密码至少 4 位'); return }
    setAuthLoading(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const result: any = await invoke('register', { username, password })
      if (result.success) {
        onLogin(result.user)
      } else {
        setAuthError(result.error || '注册失败')
      }
    } catch (e: any) {
      setAuthError(e?.toString() || '注册失败')
    }
    setAuthLoading(false)
  }

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setAuthError('')
    setPassword('')
    setConfirmPassword('')
  }

  // 加载中
  if (mode === 'loading') {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">初始化中...</span>
        </div>
      </div>
    )
  }

  // Keychain 绑定页
  if (mode === 'bind') {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="w-[400px] bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-6">
            <img src="/icon.png" alt="" className="w-12 h-12 rounded-xl mx-auto mb-3" />
            <h1 className="text-lg font-bold text-gray-900">愿光指纹浏览器</h1>
            <p className="text-sm text-gray-400 mt-1">首次使用，请输入管理员密码初始化</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">管理员密码</label>
              <input
                type="password"
                value={bindPassword}
                onChange={e => { setBindPassword(e.target.value); setBindError('') }}
                onKeyDown={e => e.key === 'Enter' && handleBind()}
                placeholder="输入管理员密码"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                           focus:outline-none focus:border-blue-400 transition-colors"
                autoFocus
              />
              {bindError && <p className="text-xs text-red-500 mt-1.5">{bindError}</p>}
              {bindMsg && <p className="text-xs text-blue-500 mt-1.5">{bindMsg}</p>}
            </div>

            <button
              onClick={handleBind}
              disabled={bindLoading}
              className="w-full py-2.5 text-sm font-medium text-white bg-[#2563eb] rounded-lg
                         hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bindLoading ? '验证中...' : '初始化密钥'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 登录/注册页
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-[400px] bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-6">
          <img src="/icon.png" alt="" className="w-12 h-12 rounded-xl mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">愿光指纹浏览器</h1>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' ? '登录以管理浏览器环境' : '注册新账号'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setAuthError('') }}
              placeholder="输入用户名"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                         focus:outline-none focus:border-blue-400 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter' && mode === 'login') handleLogin()
                if (e.key === 'Enter' && mode === 'register' && confirmPassword) handleRegister()
              }}
              placeholder="输入密码"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                         focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setAuthError('') }}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                placeholder="再次输入密码"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                           focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          )}

          {authError && <p className="text-xs text-red-500">{authError}</p>}

          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={authLoading}
            className="w-full py-2.5 text-sm font-medium text-white bg-[#2563eb] rounded-lg
                       hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {authLoading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>

          <div className="text-center text-xs text-gray-400">
            {mode === 'login' ? (
              <span>
                没有账号？{' '}
                <button onClick={() => switchMode('register')} className="text-blue-600 hover:text-blue-700">
                  注册
                </button>
              </span>
            ) : (
              <span>
                已有账号？{' '}
                <button onClick={() => switchMode('login')} className="text-blue-600 hover:text-blue-700">
                  登录
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
