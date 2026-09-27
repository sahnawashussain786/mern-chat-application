function Logo() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  )
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
}

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 lg:flex">
        <div className="glow-blob absolute -top-24 -left-24 h-96 w-96 bg-white/10" />
        <div className="glow-blob absolute bottom-0 right-0 h-80 w-80 bg-fuchsia-300/20" />

        <div className="relative z-10 flex items-center gap-3">
          <Logo />
          <span className="text-lg font-bold text-white">ChatFlow</span>
        </div>

        <div className="relative z-10 animate-[fadeUp_.7s_ease-out_both]">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Conversations that
            <br />
            feel alive.
          </h1>
          <p className="mt-4 max-w-md text-indigo-100">
            Real-time rooms, presence, typing indicators, reactions and more — wrapped in an
            interface you'll love.
          </p>
          <div className="mt-8 flex items-center gap-6 text-sm text-indigo-100">
            <span className="flex items-center gap-2"><Dot /> Live sync</span>
            <span className="flex items-center gap-2"><Dot /> Secure auth</span>
            <span className="flex items-center gap-2"><Dot /> Beautiful UI</span>
          </div>
        </div>

        <p className="relative z-10 text-xs text-indigo-200/70">Built with MERN + Socket.IO + Clerk</p>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-[fadeUp_.7s_ease-out_both]">
          {children}
        </div>
      </div>
    </div>
  )
}
