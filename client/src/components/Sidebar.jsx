import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'

export default function Sidebar({ rooms, activeRoom, onJoinRoom, onCreateRoom, onlineUsers }) {
  const { user, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const data = await api.createRoom({ name: name.trim(), topic: '' })
      onCreateRoom(data.room)
      setName('')
      setCreating(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/5 bg-slate-900/60 backdrop-blur">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-400/30">
          <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">ChatFlow</p>
          <p className="text-xs text-slate-500">{onlineUsers.length} online</p>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rooms</span>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
          title="New room"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="px-3 pb-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="room-name"
            className="w-full rounded-lg border-0 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="mt-1 px-1 text-xs text-rose-400">{error}</p>}
        </form>
      )}

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {rooms.map((room) => {
          const active = activeRoom?.id === room.id
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onJoinRoom(room)}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                active ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className="text-slate-500">#</span>
              <span className="truncate font-medium">{room.name}</span>
            </button>
          )
        })}
        {rooms.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">No rooms yet.</p>}
      </nav>

      {/* Online users */}
      <div className="border-t border-white/5 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Online — {onlineUsers.length}
        </p>
        <ul className="space-y-1.5 max-h-32 overflow-y-auto">
          {onlineUsers.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="truncate">{u.displayName}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Current user */}
      <div className="flex items-center gap-3 border-t border-white/5 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
          {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.displayName}</p>
          <p className="truncate text-xs text-slate-500">@{user?.username}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-rose-400"
          title="Sign out"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
