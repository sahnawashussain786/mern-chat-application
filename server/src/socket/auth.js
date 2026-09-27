import { COOKIE_NAME } from '../config.js'
import { verifyToken } from '../auth.js'
import { User } from '../models/User.js'

function parseCookieHeader(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export async function socketAuth(socket, next) {
  try {
    const header = socket.handshake.headers.cookie ?? ''
    const token = parseCookieHeader(header)[COOKIE_NAME]
    if (!token) return next(new Error('Unauthorized'))

    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)
    if (!user) return next(new Error('Unauthorized'))

    socket.data.user = user.toSafeJSON()
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
}
