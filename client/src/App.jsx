import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import AuthLayout from './pages/AuthLayout.jsx'
import ChatPage from './pages/ChatPage'

function Loader() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="loader-orb" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  )
}

function Protected({ children }) {
  const { isSignedIn, loading } = useAuth()
  if (loading) return <Loader />
  return isSignedIn ? children : <Navigate to="/login" replace />
}

function PublicOnly({ children }) {
  const { isSignedIn, loading } = useAuth()
  if (loading) return <Loader />
  return isSignedIn ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><AuthLayout><SignIn routing="virtual" /></AuthLayout></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><AuthLayout><SignUp routing="virtual" /></AuthLayout></PublicOnly>} />
          <Route path="/" element={<Protected><ChatPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
