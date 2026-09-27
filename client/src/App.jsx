import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-400">Loading…</span>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <AuthPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
