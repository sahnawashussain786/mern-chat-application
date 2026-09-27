export default function MissingKeyScreen({ hasPlaceholderKey }) {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-400/30">
          <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Clerk key needed</h1>
        <p className="mt-2 text-sm text-slate-400">
          {hasPlaceholderKey
            ? 'The key in client/.env.local is still the placeholder from the template.'
            : 'No publishable key was found.'}{' '}
          Without a real key, Clerk cannot load its sign-in components.
        </p>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-300">
          <li className="flex gap-2.5">
            <span className="font-bold text-indigo-400">1.</span>
            <span>
              Go to{' '}
              <a
                className="text-indigo-400 underline"
                href="https://dashboard.clerk.com/last-active?path=api-keys"
                target="_blank"
                rel="noreferrer"
              >
                dashboard.clerk.com → API Keys
              </a>{' '}
              and copy the <b>Publishable key</b> (starts with{' '}
              <code className="rounded bg-slate-800 px-1 text-xs">pk_test_</code>).
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-indigo-400">2.</span>
            <span>
              Paste it into{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">client/.env.local</code> as{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">
                VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
              </code>
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-indigo-400">3.</span>
            <span>
              Also put your <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">sk_test_...</code> secret into{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">server/.env</code> as{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-indigo-300">CLERK_SECRET_KEY</code>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-indigo-400">4.</span>
            <span>Stop the Vite dev server (Ctrl+C) and start it again — env changes need a restart.</span>
          </li>
        </ol>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
        >
          I added the key — reload
        </button>
      </div>
    </div>
  )
}
