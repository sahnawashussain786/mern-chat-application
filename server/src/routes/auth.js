import { Router } from 'express'
import { COOKIE_NAME, isProd } from '../config.js'
import { getCredentials, hashPassword, signToken, validateRegister, comparePassword } from '../auth.js'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'

export const authRouter = Router()

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const { username, password, displayName } = getCredentials(req.body)
    const errors = validateRegister({ username, password, displayName })

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the highlighted fields.', errors })
    }

    const existing = await User.findOne({ username })
    if (existing) {
      return res.status(409).json({
        message: 'Please fix the highlighted fields.',
        errors: { username: 'That username is taken.' },
      })
    }

    const passwordHash = await hashPassword(password)
    const user = await User.create({ username, displayName, passwordHash })

    const token = signToken(user.toSafeJSON())
    res.cookie(COOKIE_NAME, token, cookieOptions)
    res.status(201).json({ user: user.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = getCredentials(req.body)
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' })
    }

    const user = await User.findOne({ username })
    const ok = user ? await comparePassword(password, user.passwordHash) : false
    if (!ok) {
      return res.status(401).json({ message: 'Invalid username or password.' })
    }

    const token = signToken(user.toSafeJSON())
    res.cookie(COOKIE_NAME, token, cookieOptions)
    res.json({ user: user.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})
