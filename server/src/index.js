import { clerkMiddleware } from '@clerk/express'
import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

import { CLERK_PUBLISHABLE_KEY, CLIENT_ORIGIN, PORT, isProd } from './config.js'
import { connectDB, disconnectDB } from './db.js'
import { authRouter } from './routes/auth.js'
import { roomsRouter } from './routes/rooms.js'
import { webhookRouter, expressRawBody } from './routes/webhook.js'
import { registerChatNamespace } from './socket/index.js'
import { seedDefaultRooms } from './seed.js'

const app = express()

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
)

// Svix needs the raw body for signature verification — mount before json parser
app.use('/api/webhooks/clerk', expressRawBody, webhookRouter)

app.use(express.json({ limit: '16kb' }))
app.use(clerkMiddleware())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

app.use('/api/auth', authRouter)
app.use('/api/rooms', roomsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' })
})

app.use((err, req, res, next) => {
  console.error('✗', err.message)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST'],
  },
})

registerChatNamespace(io)

async function start() {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('✗ CLERK_SECRET_KEY is not set — add it to server/.env')
    process.exit(1)
  }
  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    console.error('✗ CLERK_PUBLISHABLE_KEY is not set — add it to server/.env')
    process.exit(1)
  }

  await connectDB()
  await seedDefaultRooms()

  httpServer.listen(PORT, () => {
    console.log(`✓ API + Socket.IO listening on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`)
  })
}

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n${signal} received — shutting down…`)
  try {
    await new Promise((resolve) => httpServer.close(resolve))
    await disconnectDB()
    console.log('✓ Clean shutdown complete')
    process.exit(0)
  } catch (err) {
    console.error('✗ Error during shutdown:', err.message)
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

void CLERK_PUBLISHABLE_KEY
start().catch((err) => {
  console.error('✗ Failed to start server:', err.message)
  process.exit(1)
})
