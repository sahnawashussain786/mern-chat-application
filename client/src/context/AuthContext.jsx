import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth as useClerkAuth } from '@clerk/react'
import { api } from '../lib/api'
import { disconnectSocket } from '../lib/socket'
import { registerTokenGetter } from '../lib/clerk'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { getToken, isLoaded, isSignedIn, userId } = useClerkAuth()
  const [user, setUser] = useState(null)
  const [syncing, setSyncing] = useState(true)

  // Register the Clerk token getter for api + socket modules
  useEffect(() => {
    registerTokenGetter(getToken)
  }, [getToken])

  // Sync the Clerk user into our Mongo user record
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setUser(null)
      setSyncing(false)
      return
    }

    let cancelled = false
    setSyncing(true)
    api
      .me()
      .then((data) => {
        if (!cancelled) setUser(data.user)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId])

  const logout = useCallback(async () => {
    disconnectSocket()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading: !isLoaded || syncing,
      isSignedIn,
      clerkUserId: userId,
      logout,
    }),
    [user, isLoaded, syncing, isSignedIn, userId, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
