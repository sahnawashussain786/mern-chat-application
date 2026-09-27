import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import ClerkErrorBoundary from './components/ClerkErrorBoundary.jsx'
import MissingKeyScreen from './components/MissingKeyScreen.jsx'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const KEY_IS_PLACEHOLDER =
  !PUBLISHABLE_KEY ||
  PUBLISHABLE_KEY.includes('xxxx') ||
  !/^pk_(test|live)_\w+$/.test(PUBLISHABLE_KEY)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {KEY_IS_PLACEHOLDER ? (
      <MissingKeyScreen hasPlaceholderKey={Boolean(PUBLISHABLE_KEY)} />
    ) : (
      <ClerkErrorBoundary>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
          <App />
        </ClerkProvider>
      </ClerkErrorBoundary>
    )}
  </StrictMode>,
)
