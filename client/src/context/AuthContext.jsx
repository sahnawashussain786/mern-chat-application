import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth as useClerkAuth } from '@clerk/react'
import { api } from '../lib/api'
import { disconnectSocket } from '../lib/socket'
import { registerTokenGetter } from '../lib/clerk'

const AuthContext = createContext(null)

// user states: undefined = syncing, null = signed out, object = loaded
export function AuthProvider({ children }) {
  const { getToken, isLoaded, isSignedIn, userId } = useClerkAuth()
  const [clerkUser, setClerkUser] = useState(undefined)

  // Register the Clerk token getter for api + socket modules
  useEffect(() => {
    registerTokenGetter(getToken)
  }, [getToken])

  // Sync the Clerk user into our Mongo user record
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return

    let cancelled = false
    api
      .me()
      .then((data) => {
        if (!cancelled) setClerkUser(data.user)
      })
      .catch(() => {
        if (!cancelled) setClerkUser(null)
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId])

  const logout = useCallback(() => {
    disconnectSocket()
  }, [])

  const value = useMemo(
    () => ({
      user: isSignedIn ? (clerkUser ?? null) : null,
      loading: !isLoaded || (Boolean(isSignedIn) && clerkUser === undefined),
      isSignedIn: Boolean(isSignedIn),
      clerkUserId: userId,
      logout,
    }),
    [clerkUser, isLoaded, isSignedIn, userId, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
