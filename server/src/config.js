import 'dotenv/config'

function intEnv(name, fallback) {
  const raw = process.env[name]
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const PORT = intEnv('PORT', 5000)
export const MONGODB_URI = process.env.MONGODB_URI || ''
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
export const JWT_EXPIRES_IN_DAYS = intEnv('JWT_EXPIRES_IN_DAYS', 7)
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

export const COOKIE_NAME = 'chat_token'
export const isProd = process.env.NODE_ENV === 'production'
