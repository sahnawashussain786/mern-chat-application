import { Webhook } from 'svix'
import { Router } from 'express'
import express from 'express'
import { CLERK_WEBHOOK_SECRET } from '../config.js'
import { User } from '../models/User.js'

export const webhookRouter = Router()

webhookRouter.post('/clerk', expressRawBody, async (req, res) => {
  if (!CLERK_WEBHOOK_SECRET) {
    return res.status(500).json({ message: 'CLERK_WEBHOOK_SECRET is not configured' })
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET)
  let event

  try {
    event = wh.verify(req.rawBody.toString('utf8'), {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    })
  } catch {
    return res.status(400).json({ message: 'Invalid webhook signature' })
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await User.upsertFromClerk(event.data)
        break
      case 'user.deleted':
        await User.deleteOne({ clerkId: event.data.id })
        break
      default:
        break
    }
    res.json({ received: true })
  } catch (err) {
    console.error('✗ webhook handler error:', err.message)
    res.status(500).json({ message: 'Webhook handler failed' })
  }
})

// Svix requires the raw body for signature verification
export function expressRawBody(req, res, next) {
  express.json({
    verify: (req2, _res, buf) => {
      req2.rawBody = buf
    },
  })(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Invalid JSON body' })
    next()
  })
}
