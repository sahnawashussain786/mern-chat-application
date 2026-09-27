import { useMemo, useState } from 'react'
import { UserButton } from '@clerk/react'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'

export default function Sidebar({
  rooms,
  activeRoom,
  onJoinRoom,
  onCreateRoom,
  onlineUsers,
  unread,
}) {
  const { logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')

  const filteredRooms = useMemo(
    () => rooms.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase())),
    [rooms, filter],
  )

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const data = await api.createRoom({ name: name.trim(), topic: '', isPrivate })
      onCreateRoom(data.room)
      setName('')
      setIsPrivate(false)
      setCreating(false)
    } catch (err) {
      setError(err.message)
    }  finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/5 bg-slate-900/70 backdrop-blur-xl">
      {/* Brand + connection */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">ChatFlow</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {onlineUsers.length} online
          </p>
        </div>
        <UserButton afterSignOutUrl="/login" />
      </div>

      {/* Room search + new room */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search rooms"
            className="w-full rounded-lg border-0 bg-slate-800/70 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-indigo-500/15 p-1.5 text-indigo-400 ring-1 ring-indigo-400/20 transition hover:bg-indigo-500/25"
          title="New room"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="px-3 pb-2 pt-2">
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
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-indigo-500"
            />
            Private room (invite-only)
          </label>
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </form>
      )}

      {/* Room list */}
      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {filteredRooms.map((room) => {
          const active = activeRoom?.id === room.id
          const count = unread[room.id] ?? 0
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onJoinRoom(room)}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                active
                  ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-400/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className={active ? 'text-indigo-400' : 'text-slate-600'}>#</span>
              <span className="flex-1 truncate font-medium">{room.name}</span>
              {room.isPrivate && (
                <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              )}
              {count > 0 && (
                <span className="min-w-[20px] rounded-full bg-indigo-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          )
        })}
        {filteredRooms.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-500">No rooms found.</p>
        )}
      </nav>

      {/* Online users */}
      <div className="border-t border-white/5 px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Online — {onlineUsers.length}
        </p>
        <ul className="max-h-28 space-y-1.5 overflow-y-auto">
          {onlineUsers.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm text-slate-300">
              <Avatar url={u.avatarUrl} name={u.displayName} size={6} />
              <span className="truncate">{u.displayName}</span>
            </li>
          ))}
          {onlineUsers.length === 0 && (
            <li className="text-xs text-slate-600">Nobody here yet…</li>
          )}
        </ul>
      </div>

      {/* Connection status footer */}
      <div className="flex items-center justify-between border-t border-white/5 px-4 py-2">
        <p className="text-[11px] text-slate-600">MERN · Socket.IO · Clerk</p>
        <button
          type="button"
          onClick={logout}
          className="text-[11px] text-slate-500 transition hover:text-rose-400"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

function Avatar({ url, name, size = 9 }) {
  const s = { 6: 'h-6 w-6', 9: 'h-9 w-9' }[size] ?? 'h-9 w-9'
  if (url) {
    return <img src={url} alt="" className={`${s} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />
  }
  return (
    <div className={`${s} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white`}>
      {name?.charAt(0).toUpperCase() ?? '?'}
    </div>
  )
}

export { Avatar }
