import { useState } from 'react'
import { useAuth } from '../context/useAuth'

const DEMO_USERS = [
  { username: 'alice', displayName: 'Alice', password: 'password123' },
  { username: 'bob', displayName: 'Bob', password: 'password123' },
]

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', displayName: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    setErrors({})
    try {
      if (mode === 'login') {
        await login({ username: form.username, password: form.password })
      } else {
        await register({
          username: form.username,
          password: form.password,
          displayName: form.displayName || form.username,
        })
      }
    } catch (err) {
      setErrors(err.errors ?? {})
      setMessage(err.errors ? '' : err.message)
    } finally {
      setBusy(false)
    }
  }

  async function quickLogin(user) {
    setBusy(true)
    setMessage('')
    try {
      await login(user)
    } catch {
      // auto-provision demo user on first click
      try {
        await register(user)
      } catch (err) {
        setMessage(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/30 mb-4">
            <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ChatFlow</h1>
          <p className="mt-2 text-sm text-slate-400">Real-time rooms, presence and typing indicators.</p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 shadow-xl ring-1 ring-white/10 backdrop-blur p-6 sm:p-8">
          <div className="flex rounded-lg bg-slate-800/70 p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setErrors({})
                  setMessage('')
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  mode === m ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Username"
              value={form.username}
              onChange={(v) => update('username', v)}
              error={errors.username}
              placeholder="e.g. alice"
              autoComplete="username"
            />
            {mode === 'register' && (
              <Field
                label="Display name"
                value={form.displayName}
                onChange={(v) => update('displayName', v)}
                error={errors.displayName}
                placeholder="How others see you"
              />
            )}
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => update('password', v)}
              error={errors.password}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {message && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20">{message}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="mb-3 text-center text-xs uppercase tracking-wide text-slate-500">Or try a demo account</p>
            <div className="flex gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  disabled={busy}
                  onClick={() => quickLogin(u)}
                  className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Continue as {u.displayName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, error, type = 'text', placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-lg border-0 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 ring-1 transition focus:outline-none focus:ring-2 ${
          error ? 'ring-rose-500/60 focus:ring-rose-500' : 'ring-white/10 focus:ring-indigo-500'
        }`}
      />
      {error && <span className="mt-1.5 block text-xs text-rose-400">{error}</span>}
    </label>
  )
}
