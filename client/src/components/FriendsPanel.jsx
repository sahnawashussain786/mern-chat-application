import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Avatar } from './Sidebar'

export default function FriendsPanel({ friendsData, onlineUsers, onOpenDM, onChanged }) {
  const [tab, setTab] = useState('friends') // 'friends' | 'add'
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState('')
  const [localError, setLocalError] = useState('')
  const [notice, setNotice] = useState('')
  const debounceRef = useRef(null)
  const searchSeq = useRef(0)

  const friends = friendsData?.friends ?? []
  const incoming = friendsData?.incoming ?? []
  const outgoing = friendsData?.outgoing ?? []

  const onlineIds = new Set(onlineUsers.map((u) => u.id))

  // Debounced user search (fires only for queries ≥ 2 chars)
  useEffect(() => {
    const q = search.trim()
    searchSeq.current += 1
    const seq = searchSeq.current

    if (q.length < 2) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.searchUsers(q)
        if (searchSeq.current === seq) setResults(data.users)
      } catch (err) {
        if (searchSeq.current === seq) {
          setResults([])
          setLocalError(err.message)
        }
      } finally {
        if (searchSeq.current === seq) setSearching(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [search])

  async function run(fn, okMessage) {
    setLocalError('')
    setNotice('')
    try {
      const res = await fn()
      if (okMessage) setNotice(typeof okMessage === 'function' ? okMessage(res) : okMessage)
      onChanged?.()
      return res
    } catch (err) {
      setLocalError(err.message)
      return null
    }
  }

  async function handleAdd(user) {
    setAdding(user.id)
    const res = await run(() => api.sendFriendRequest(user.username))
    setAdding('')
    if (res) setSearch('')
  }

  async function handleAccept(requestId) {
    await run(() => api.acceptFriendRequest(requestId))
  }

  async function handleDecline(requestId) {
    await run(() => api.declineFriendRequest(requestId))
  }

  async function handleRemove(user) {
    await run(() => api.removeFriend(user.id))
  }

  async function handleOpenDM(user) {
    try {
      setLocalError('')
      const data = await api.openDM(user.id)
      onOpenDM?.(data.room)
    } catch (err) {
      setLocalError(err.message)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <button
          type="button"
          onClick={() => setTab('friends')}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            tab === 'friends'
              ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          Friends
          {incoming.length > 0 && (
            <span className="ml-1.5 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {incoming.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('add')}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            tab === 'add'
              ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          Find users
        </button>
      </div>

      {/* Friends tab */}
      {tab === 'friends' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {incoming.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Requests — {incoming.length}
              </p>
              {incoming.map(({ requestId, user }) => (
                <div
                  key={requestId}
                  className="mb-1 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10"
                >
                  <Avatar url={user.avatarUrl} name={user.displayName} size={6} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{user.displayName}</p>
                    <p className="truncate text-[11px] text-slate-500">@{user.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAccept(requestId)}
                    className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-500/25"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(requestId)}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
                  >
                    Decline
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Friends — {friends.length}
          </p>
          {friends.length === 0 ? (
            <p className="px-1 py-2 text-xs leading-relaxed text-slate-500">
              No friends yet. Use <span className="font-semibold text-slate-300">Find users</span> to send
              friend requests — you'll be able to DM each other once connected.
            </p>
          ) : (
            friends.map((user) => (
              <div
                key={user.id}
                className="group mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 transition hover:bg-white/5"
              >
                <div className="relative">
                  <Avatar url={user.avatarUrl} name={user.displayName} size={6} />
                  {onlineIds.has(user.id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">{user.displayName}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {onlineIds.has(user.id) ? 'Online' : 'Offline'}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleOpenDM(user)}
                    className="rounded-lg bg-indigo-500/15 p-1.5 text-indigo-300 ring-1 ring-indigo-400/20 transition hover:bg-indigo-500/25"
                    title={`Message ${user.displayName}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(user)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-rose-400"
                    title={`Remove ${user.displayName}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}

          {outgoing.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Sent — {outgoing.length}
              </p>
              {outgoing.map(({ requestId, user }) => (
                <div key={requestId} className="mb-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
                  <Avatar url={user.avatarUrl} name={user.displayName} size={6} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-400">{user.displayName}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-600">Pending</span>
                  <button
                    type="button"
                    onClick={() => handleDecline(requestId)}
                    className="rounded-lg px-1.5 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-white/10 hover:text-rose-300"
                    title="Cancel request"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/find tab */}
      {tab === 'add' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                // Reset stale results immediately when the query is cleared
                if (e.target.value.trim().length < 2) setResults([])
              }}
              placeholder="Search username or name…"
              className="w-full rounded-lg border-0 bg-slate-800/70 py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {localError && <p className="mt-2 text-xs text-rose-400">{localError}</p>}
          {notice && <p className="mt-2 text-xs text-emerald-400">{notice}</p>}

          {searching && <p className="mt-3 px-1 text-xs text-slate-500">Searching…</p>}

          {!searching && search.trim().length >= 2 && results.length === 0 && (
            <p className="mt-3 px-1 text-xs text-slate-500">No users found.</p>
          )}

          {results.map((user) => (
            <div key={user.id} className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
              <Avatar url={user.avatarUrl} name={user.displayName} size={6} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.displayName}</p>
                <p className="truncate text-[11px] text-slate-500">@{user.username}</p>
              </div>
              {user.friendshipStatus === 'accepted' ? (
                <button
                  type="button"
                  onClick={() => handleOpenDM(user)}
                  className="rounded-lg bg-indigo-500/15 px-2 py-1 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-400/20 transition hover:bg-indigo-500/25"
                >
                  Message
                </button>
              ) : user.friendshipStatus === 'pending' ? (
                <span className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-500">
                  Pending
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAdd(user)}
                  disabled={adding === user.id}
                  className="rounded-lg bg-indigo-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {adding === user.id ? 'Sending…' : 'Add friend'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
