// Bridge so non-component modules (api, socket) can obtain Clerk session tokens.
// The ClerkProvider tree registers the actual token getter at runtime.

let tokenGetter = null

export function registerTokenGetter(fn) {
  tokenGetter = fn
}

export async function getToken() {
  if (!tokenGetter) return null
  try {
    return await tokenGetter()
  } catch {
    return null
  }
}
