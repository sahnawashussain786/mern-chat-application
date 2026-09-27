import { useEffect, useRef, useState } from 'react'

const TYPING_DEBOUNCE_MS = 2000

export default function MessageInput({ onSend, disabled, onTyping }) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const typingRef = useRef(false)
  const timeoutRef = useRef(null)

  // Notify parent we stopped typing on unmount / room switch
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        onTyping(false)
        typingRef.current = false
      }
      clearTimeout(timeoutRef.current)
    }
  }, [onTyping])

  function handleChange(e) {
    setValue(e.target.value)

    if (!typingRef.current) {
      typingRef.current = true
      onTyping(true)
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      typingRef.current = false
      onTyping(false)
    }, TYPING_DEBOUNCE_MS)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const text = value.trim()
    if (!text || sending || disabled) return

    setSending(true)
    try {
      await onSend(text)
      setValue('')
      // reset typing state
      if (typingRef.current) {
        typingRef.current = false
        onTyping(false)
      }
      clearTimeout(timeoutRef.current)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/5 bg-slate-900/40 px-4 py-3 sm:px-6">
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder={disabled ? 'Join a room to chat' : `Message…`}
          disabled={disabled}
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border-0 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          title="Send"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-slate-600">
        <kbd className="rounded bg-slate-800 px-1">Enter</kbd> to send · <kbd className="rounded bg-slate-800 px-1">Shift+Enter</kbd> for a new line
      </p>
    </form>
  )
}
