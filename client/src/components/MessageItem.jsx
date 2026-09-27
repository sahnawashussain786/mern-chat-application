import { useState } from 'react'
import { Avatar } from './Sidebar'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉']

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageItem({ m, mine, isGroupFirst, user, onReply, onReact, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.body)

  function saveEdit() {
    const text = draft.trim()
    if (text && text !== m.body) onEdit(m, text)
    setEditing(false)
  }

  return (
    <div className={`group relative flex gap-3 ${mine ? 'flex-row-reverse' : ''} ${isGroupFirst ? 'mt-3' : 'mt-0.5'}`}>
      <div className="w-9 shrink-0">
        {isGroupFirst && <Avatar url={m.sender.avatarUrl} name={m.sender.displayName} />}
      </div>

      <div className={`flex max-w-[75%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {isGroupFirst && (
          <div className={`mb-1 flex items-baseline gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm font-semibold text-slate-200">
              {mine ? 'You' : m.sender.displayName}
            </span>
            <span className="text-[11px] text-slate-500">{formatTime(m.createdAt)}</span>
            {m.editedAt && <span className="text-[10px] text-slate-600">(edited)</span>}
          </div>
        )}

        {/* Reply context */}
        {m.replyTo?.sender && (
          <div className={`mb-1 max-w-full rounded-lg bg-white/5 px-2 py-1 text-[11px] text-slate-400 ${mine ? 'text-right' : ''}`}>
            <span className="font-semibold text-indigo-300">{m.replyTo.sender.displayName}</span>
            <span className="mx-1">·</span>
            <span className="italic">{m.replyTo.body?.slice(0, 60) || 'image'}</span>
          </div>
        )}

        {/* Bubble */}
        {m.deleted ? (
          <div className="rounded-2xl bg-slate-800/50 px-3.5 py-2 text-sm italic text-slate-500">
            Message deleted
          </div>
        ) : editing ? (
          <div className="flex w-full items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-indigo-500 focus:outline-none"
            />
            <button type="button" onClick={saveEdit} className="text-xs font-medium text-indigo-400">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500">Cancel</button>
          </div>
        ) : m.type === 'image' && m.imageUrl ? (
          <a href={m.imageUrl} target="_blank" rel="noreferrer">
            <img
              src={m.imageUrl}
              alt="shared"
              className="max-h-72 rounded-2xl object-cover ring-1 ring-white/10 transition hover:ring-indigo-400/40"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </a>
        ) : (
          <div
            className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              mine ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm'
            }`}
          >
            {m.body}
          </div>
        )}

        {/* Reactions */}
        {!m.deleted && m.reactions?.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`}>
            {m.reactions.map((r) => {
              const mineReaction = r.users?.some((u) => String(u) === user.id)
              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact(m, r.emoji)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                    mineReaction
                      ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40'
                      : 'bg-slate-800 text-slate-300 ring-1 ring-white/10 hover:bg-slate-700'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.users.length}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Hover actions */}
        {!m.deleted && !editing && (
          <div
            className={`absolute z-10 hidden group-hover:flex items-center gap-0.5 rounded-xl border border-white/10 bg-slate-800/95 px-1 py-0.5 shadow-xl backdrop-blur ${
              mine ? 'left-0 -translate-x-full mr-2' : 'right-0 translate-x-full ml-2'
            } top-0`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(m, emoji)}
                className="rounded-lg px-1.5 py-1 text-sm transition hover:scale-125"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            <button
              type="button"
              onClick={() => onReply(m)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-indigo-300"
              title="Reply"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12H3m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
            {mine && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(m.body)
                    setEditing(true)
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-amber-300"
                  title="Edit"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(m)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-rose-400"
                  title="Delete"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
