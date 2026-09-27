import { Component } from 'react'

/**
 * Catches render-time errors from ClerkProvider — most commonly
 * "failed_to_load_clerk_js" when the browser cannot reach Clerk's CDN
 * (offline, DNS failure, adblocker/VPN/proxy, or a placeholder key that
 * points at a non-existent domain).
 */
export default class ClerkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const msg = String(error?.message || error || '')
    const isClerkLoad =
      error?.name === 'ClerkRuntimeError' ||
      error?.code === 'failed_to_load_clerk_js' ||
      msg.includes('Failed to load Clerk')

    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30">
            <svg className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white">
            {isClerkLoad ? "Can't reach Clerk" : 'Something went wrong'}
          </h1>

          {isClerkLoad ? (
            <>
              <p className="mt-2 text-sm text-slate-400">
                The browser could not download the Clerk sign-in library. Check these, in order:
              </p>
              <ol className="mt-4 space-y-3 text-sm text-slate-300">
                <Check n="1">
                  Is <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
                  <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">client/.env.local</code> still the{' '}
                  <span className="text-rose-300">placeholder</span>? Paste your real key from dashboard.clerk.com → API Keys, then restart the dev server.
                </Check>
                <Check n="2">
                  Is your internet working? <span className="text-slate-400">This error is a DNS failure — the browser could not resolve Clerk&apos;s domain at all.</span>
                </Check>
                <Check n="3">
                  Disable ad-blockers, VPNs or corporate proxies for{' '}
                  <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">clerk.com</code> and{' '}
                  <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">*.clerk.accounts.dev</code>, then retry.
                </Check>
              </ol>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">An unexpected error stopped the app from rendering.</p>
          )}

          <pre className="mt-4 max-h-24 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-rose-300 ring-1 ring-white/10">
            {msg || String(error)}
          </pre>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
            >
              Retry
            </button>
            <a
              href="https://dashboard.clerk.com/last-active?path=api-keys"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-slate-700"
            >
              Open Clerk Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }
}

function Check({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-bold text-indigo-300">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}
