import { COOKIE_NAME } from '../config.js'
import { verifyToken } from '../auth.js'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      return res.status(401).json({ message: 'Session expired — sign in again' })
    }

    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' })
    }

    req.user = user.toSafeJSON()
    next()
  } catch (err) {
    next(err)
  }
}
