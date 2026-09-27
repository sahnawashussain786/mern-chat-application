import 'dotenv/config'

function intEnv(name, fallback) {
  const raw = process.env[name]
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const PORT = intEnv('PORT', 5000)
export const MONGODB_URI = process.env.MONGODB_URI || ''
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Clerk
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || ''
export const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || ''
export const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || ''

export const isProd = process.env.NODE_ENV === 'production'
