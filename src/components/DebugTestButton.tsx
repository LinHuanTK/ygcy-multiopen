import { useState } from 'react'

/**
 * Debug component: hardcodes a call to create_environment via tauriInvoke
 * and logs every step to console for diagnosing the "dialog closes, no env appears" bug.
 */
export default function DebugTestButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const runTest = async () => {
    setLoading(true)
    setResult('Starting...')
    console.log('===== DEBUG: create_environment test start =====')

    try {
      // Step 1: Dynamically import invoke
      console.log('[DEBUG] Step 1: importing @tauri-apps/api/core...')
      let invoke: any
      try {
        const mod = await import('@tauri-apps/api/core')
        invoke = mod.invoke
        console.log('[DEBUG] import succeeded, invoke type:', typeof invoke)
      } catch (importErr) {
        const msg = `FAILED to import @tauri-apps/api/core: ${importErr}`
        console.error('[DEBUG]', msg)
        setResult(msg)
        setLoading(false)
        return
      }

      // Step 2: Build hardcoded environment payload (matching Rust BrowserEnv struct)
      const hardcodedEnv = {
        name: 'DEBUG-TEST-ENV',
        platform: 'bilibili',
        account: '13800138000',
        password: 'test123456',
        browser: 'Chrome 126',
        proxy_id: '',
        proxy: '无',
        exit_ip: '',
        country: '中国',
        extensions: '0',
        status: 'stopped',
        created_at: '',
        updated_at: '',
      }
      console.log('[DEBUG] Step 2: environment payload:', JSON.stringify(hardcodedEnv, null, 2))

      // Step 3: Call tauriInvoke
      console.log('[DEBUG] Step 3: calling invoke("create_environment", { env: ... })...')
      let response: any
      try {
        response = await invoke('create_environment', { env: hardcodedEnv })
        console.log('[DEBUG] invoke succeeded, response:', JSON.stringify(response, null, 2))
      } catch (invokeErr: any) {
        const msg = `FAILED: invoke("create_environment") threw: ${invokeErr}`
        console.error('[DEBUG]', msg)
        if (invokeErr && typeof invokeErr === 'object') {
          console.error('[DEBUG] error keys:', Object.keys(invokeErr))
          console.error('[DEBUG] error stringify:', JSON.stringify(invokeErr, Object.getOwnPropertyNames(invokeErr)))
        }
        setResult(msg)
        setLoading(false)
        return
      }

      // Step 4: Call list_environments to verify
      console.log('[DEBUG] Step 4: calling invoke("list_environments") to verify...')
      let envs: any[]
      try {
        envs = await invoke('list_environments')
        console.log('[DEBUG] list_environments returned', envs.length, 'environments')
        console.log('[DEBUG] environments list:', JSON.stringify(envs, null, 2))
      } catch (listErr) {
        const msg = `FAILED: list_environments threw: ${listErr}`
        console.error('[DEBUG]', msg)
        setResult(msg)
        setLoading(false)
        return
      }

      setResult(`SUCCESS! Created environment. Total environments: ${envs.length}`)
      console.log('===== DEBUG: create_environment test SUCCESS =====')
    } catch (outerErr) {
      const msg = `UNEXPECTED ERROR: ${outerErr}`
      console.error('[DEBUG]', msg)
      setResult(msg)
    }

    setLoading(false)
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 600,
          color: loading ? '#999' : '#fff',
          backgroundColor: loading ? '#ccc' : '#dc2626',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Testing...' : 'DEBUG TEST'}
      </button>
      {result && (
        <span style={{
          fontSize: '11px',
          color: result.startsWith('SUCCESS') ? '#16a34a' : '#dc2626',
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {result}
        </span>
      )}
    </div>
  )
}
