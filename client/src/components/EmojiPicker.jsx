import { useEffect, useRef, useState } from 'react'

const QUICK = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '😢', '🙏', '👀', '✅', '💯', '🚀']

export default function EmojiPicker({ onPick, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-amber-400"
        title="Emoji"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
        </svg>
      </button>

      {open && (
        <div
          className={`animate-pop absolute bottom-full z-20 mb-2 w-64 rounded-2xl border border-white/10 bg-slate-800/95 p-3 shadow-2xl backdrop-blur-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Quick emoji
          </p>
          <div className="grid grid-cols-6 gap-1">
            {QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onPick(emoji)
                  setOpen(false)
                }}
                className="rounded-lg p-1.5 text-xl transition hover:scale-125 hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
