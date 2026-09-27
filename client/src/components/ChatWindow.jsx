import { useEffect, useRef, useState } from 'react'
import MessageItem from './MessageItem'
import { Avatar } from './Sidebar'
import { api } from '../lib/api'

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

export default function ChatWindow({
  room,
  user,
  messages,
  setMessages,
  typingUsers,
  onReply,
  onReact,
  onEdit,
  onDelete,
}) {
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const bottomRef = useRef(null)
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null

  // Scroll when the latest message changes; prepends don't move the viewport
  useEffect(() => {
    if (lastMsgId) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastMsgId])

  // Jump instantly on room switch
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [room?.id])

  // Load history on room change
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
        if (!cancelled) setMessages([])
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
      // keep list
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

  const isDM = room.kind === 'dm'
  const dmUser = room.dmUser ?? null

  // Group consecutive messages by sender within the same day
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
      {/* Room / DM header */}
      <header className="flex items-center gap-3 border-b border-white/5 bg-slate-900/40 px-6 py-3.5 backdrop-blur">
        {isDM ? (
          <Avatar url={dmUser?.avatarUrl} name={dmUser?.displayName} />
        ) : (
          <span className="text-xl font-bold text-indigo-400">#</span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            {isDM ? dmUser?.displayName ?? 'Direct message' : room.name}
          </h2>
          {isDM ? (
            <p className="truncate text-xs text-slate-500">@{dmUser?.username}</p>
          ) : (
            room.topic && <p className="truncate text-xs text-slate-500">{room.topic}</p>
          )}
        </div>
        {!isDM && room.isPrivate && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 ring-1 ring-amber-400/20">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Private
          </span>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
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
            <p className="animate-float text-5xl">{isDM ? '💬' : '👋'}</p>
            <p className="mt-3 text-sm text-slate-400">
              {isDM ? (
                <>
                  This is your DM with{' '}
                  <span className="font-semibold text-slate-200">{dmUser?.displayName}</span>
                </>
              ) : (
                <>
                  This is the start of <span className="font-semibold text-slate-200">#{room.name}</span>
                </>
              )}
            </p>
            <p className="text-xs text-slate-600">Send a message to get things going.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.ts + group.senderId}>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                {dayLabel(group.ts)}
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            {group.items.map((m, idx) => (
              <MessageItem
                key={m.id}
                m={m}
                user={user}
                mine={m.sender.id === user.id}
                isGroupFirst={idx === 0}
                onReply={onReply}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <div className="h-6 px-6">
        {typingUsers.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="flex gap-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
              <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
            </span>
            {typingUsers.length === 1
              ? `${typingUsers[0].displayName} is typing`
              : `${typingUsers.map((u) => u.displayName).join(', ')} are typing`}
          </p>
        )}
      </div>
    </div>
  )
}
