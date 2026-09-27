import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { resolveUser } from '../auth/clerk.js'

export const authRouter = Router()

authRouter.get('/me', async (appReq, res, next) => {
  try {
    const { userId } = getAuth(appReq)
    if (!userId) return res.status(401).json({ message: 'Not authenticated' })

    const user = await resolveUser(userId)
    res.json({ user: user.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})
