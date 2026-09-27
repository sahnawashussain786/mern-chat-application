import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  document.getElementById('root').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#e2e8f0;font-family:system-ui;padding:24px">
      <div style="max-width:440px;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:32px">
        <h1 style="margin:0 0 8px;font-size:20px">🔑 Clerk key missing</h1>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
          Create <code style="background:#1e293b;padding:2px 6px;border-radius:4px">client/.env.local</code> with:
        </p>
        <pre style="background:#1e293b;padding:12px;border-radius:8px;font-size:12px;overflow:auto">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</pre>
        <p style="margin:16px 0 0;color:#64748b;font-size:12px">Get your keys at dashboard.clerk.com → API Keys</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:12px">Add CLERK_SECRET_KEY to server/.env too, then restart both.</p>
      </div>
    </div>
  `
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
        <App />
      </ClerkProvider>
    </StrictMode>,
  )
}
