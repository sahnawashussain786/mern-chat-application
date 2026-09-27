import { useEffect, useState } from 'react'

/**
 * Shows a sticky banner when the backend API or the socket is unreachable,
 * with a self-recovery message once the connection is restored.
 */
export default function ConnectionBanner({ connected }) {
  const [pulse, setPulse] = useState(0)

  // Gentle re-check heartbeat while offline (server comebacks flip us back automatically)
  useEffect(() => {
    if (connected) return
    const t = setInterval(() => setPulse((p) => p + 1), 2000)
    return () => clearInterval(t)
  }, [connected])

  if (connected) return null

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500/15 px-4 py-2 text-center text-xs font-medium text-amber-200 ring-1 ring-inset ring-amber-400/20">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
      Server unreachable — check that the ChatFlow Server window is running. Retrying automatically…
      <span className="hidden sm:inline text-amber-300/60">{pulse % 2 === 0 ? '•' : '·'}</span>
    </div>
  )
}
