import { useEffect, useRef, useState } from 'react'
import EmojiPicker from './EmojiPicker'

const TYPING_DEBOUNCE_MS = 2000

const IMAGE_URL_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i

export default function MessageInput({ onSend, onTyping, disabled, replyTo, onCancelReply }) {
  const [value, setValue] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImageField, setShowImageField] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const taRef = useRef(null)
  const typingRef = useRef(false)
  const timeoutRef = useRef(null)

  // Auto-grow the textarea
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [value])

  // Reset when switching rooms / reply targets
  useEffect(() => {
    setValue('')
    setImageUrl('')
    setShowImageField(false)
    setError('')
    stopTyping()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTo?.id ?? null])

  function stopTyping() {
    if (typingRef.current) {
      typingRef.current = false
      onTyping?.(false)
    }
    clearTimeout(timeoutRef.current)
  }

  function handleChange(e) {
    setValue(e.target.value)

    if (!typingRef.current) {
      typingRef.current = true
      onTyping?.(true)
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS)
  }

  function insertEmoji(emoji) {
    const ta = taRef.current
    if (!ta) return setValue((v) => v + emoji)
    const start = ta.selectionStart ?? value.length
    const end = ta.selectionEnd ?? value.length
    setValue(value.slice(0, start) + emoji + value.slice(end))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    const text = value.trim()
    const isImage = Boolean(imageUrl.trim())
    if ((!text && !isImage) || sending || disabled) return

    setSending(true)
    setError('')
    try {
      await onSend({
        body: text,
        imageUrl: isImage ? imageUrl.trim() : '',
        type: isImage ? 'image' : 'text',
        replyTo: replyTo?.id ?? null,
      })
      setValue('')
      setImageUrl('')
      setShowImageField(false)
      stopTyping()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-white/5 bg-slate-900/50 px-4 py-3 sm:px-6 backdrop-blur">
      {/* Reply banner */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300 ring-1 ring-indigo-400/20">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12H3m0 0l3-3m-3 3l3 3m9-9h4a2 2 0 012 2v8a2 2 0 01-2 2h-4m-4-5a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          Replying to <span className="font-semibold">{replyTo.sender.displayName}</span>
          <span className="max-w-[200px] truncate text-indigo-400/70">{replyTo.body || 'image'}</span>
          <button type="button" onClick={onCancelReply} className="ml-auto rounded p-0.5 hover:bg-white/10">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Image URL field */}
      {showImageField && (
        <div className="mb-2 flex gap-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste an image URL (https://…png, jpg, gif)"
            className="flex-1 rounded-lg border-0 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {IMAGE_URL_RE.test(imageUrl) && (
            <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10" />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setShowImageField((v) => !v)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition ${
            showImageField
              ? 'bg-indigo-500/20 text-indigo-300 ring-indigo-400/30'
              : 'bg-slate-800 text-slate-400 ring-white/5 hover:text-slate-200'
          }`}
          title="Attach image URL"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />
          </svg>
        </button>

        <div className="flex flex-1 items-end gap-1 rounded-2xl bg-slate-800 px-3 py-1.5 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-indigo-500">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={disabled ? 'Join a room to chat' : 'Type a message…'}
            disabled={disabled}
            className="max-h-40 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <EmojiPicker onPick={insertEmoji} align="right" />
        </div>

        <button
          type="submit"
          disabled={disabled || sending || (!value.trim() && !imageUrl.trim())}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          title="Send"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>

      {error && <p className="mt-1.5 px-1 text-xs text-rose-400">{error}</p>}
    </div>
  )
}
