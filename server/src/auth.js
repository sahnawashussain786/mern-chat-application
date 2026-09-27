import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_EXPIRES_IN_DAYS, JWT_SECRET } from './config.js'

const SALT_ROUNDS = 10

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: `${JWT_EXPIRES_IN_DAYS}d`,
  })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function getCredentials(body) {
  const username = String(body?.username ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  const displayName = String(body?.displayName ?? '').trim()
  return { username, password, displayName }
}

export function validateRegister({ username, password, displayName }) {
  const errors = {}
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    errors.username = '3–24 chars, lowercase letters, numbers and underscores only.'
  }
  if (password.length < 6 || password.length > 100) {
    errors.password = 'Password must be 6–100 characters.'
  }
  if (!displayName || displayName.length > 40) {
    errors.displayName = 'Display name is required (max 40 chars).'
  }
  return errors
}
