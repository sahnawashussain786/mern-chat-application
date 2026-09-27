import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(ts) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function ChatWindow({ room, user, messages, setMessages, typingUsers }) {
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const bottomRef = useRef(null)
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  // Scroll to bottom when the latest message changes (new message or room switch).
  // Prepending older messages leaves lastMsgId unchanged, so position is preserved.
  useEffect(() => {
    if (lastMsgId) scrollToBottom('smooth')
  }, [lastMsgId, scrollToBottom])

  // Load history when a room is selected
  useEffect(() => {
    if (!room) return
    let cancelled = false
    api
      .messages(room.id)
      .then((data) => {
        if (cancelled) return
        setMessages(data.messages)
        setHasMore(data.hasMore)
      })
      .catch(() => {
        if (cancelled) return
        setMessages([])
        setHasMore(false)
      })
    return () => {
      cancelled = true
    }
  }, [room, setMessages])

  async function loadOlder() {
    if (!room || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = messages[0]
      const data = await api.messages(room.id, oldest.createdAt)
      setHasMore(data.hasMore)
      setMessages((prev) => [...data.messages, ...prev])
    } catch {
      // keep current list
    } finally {
      setLoadingMore(false)
    }
  }

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800/60 ring-1 ring-white/10">
          <svg className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Welcome to ChatFlow</h2>
          <p className="mt-1 text-sm text-slate-500">Pick a room on the left, or create a new one.</p>
        </div>
      </div>
    )
  }

  // Group consecutive messages by sender + day
  const groups = []
  for (const m of messages) {
    const last = groups[groups.length - 1]
    const sameDay = last && new Date(last.ts).toDateString() === new Date(m.createdAt).toDateString()
    if (!last || !sameDay || last.senderId !== m.sender.id) {
      groups.push({ ts: m.createdAt, senderId: m.sender.id, items: [m] })
    } else {
      last.items.push(m)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Room header */}
      <header className="flex items-center gap-3 border-b border-white/5 bg-slate-900/40 px-6 py-3.5 backdrop-blur">
        <span className="text-xl font-semibold text-slate-500">#</span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">{room.name}</h2>
          {room.topic && <p className="truncate text-xs text-slate-500">{room.topic}</p>}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {hasMore && (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-slate-700 disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-4xl">👋</p>
            <p className="mt-3 text-sm text-slate-400">
              This is the start of <span className="font-semibold text-slate-200">#{room.name}</span>
            </p>
            <p className="text-xs text-slate-600">Send a message to get things going.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.ts + group.senderId}>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">{dayLabel(group.ts)}</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            {group.items.map((m, idx) => {
              const mine = m.sender.id === user.id
              const first = idx === 0
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''} ${first ? 'mt-3' : 'mt-0.5'}`}>
                  <div className="w-9 shrink-0">
                    {first && (
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                          mine ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'
                        }`}
                      >
                        {m.sender.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={`max-w-[75%] ${mine ? 'items-end text-right' : ''}`}>
                    {first && (
                      <div className={`mb-1 flex items-baseline gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-semibold text-slate-200">
                          {mine ? 'You' : m.sender.displayName}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatTime(m.createdAt)}</span>
                      </div>
                    )}
                    <div
                      className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        mine
                          ? 'bg-indigo-500 text-white rounded-br-sm'
                          : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <div className="h-6 px-6">
        {typingUsers.length > 0 && (
          <p className="text-xs text-slate-500">
            {typingUsers.length === 1
              ? `${typingUsers[0].displayName} is typing`
              : `${typingUsers.map((u) => u.displayName).join(', ')} are typing`}
            <span className="animate-pulse">…</span>
          </p>
        )}
      </div>
    </div>
  )
}
