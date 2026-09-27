import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

import { CLIENT_ORIGIN, PORT, isProd } from './config.js'
import { connectDB, disconnectDB } from './db.js'
import { seedDefaultRooms } from './seed.js'
import { authRouter } from './routes/auth.js'
import { roomsRouter } from './routes/rooms.js'
import { registerChatNamespace } from './socket/index.js'

const app = express()

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

app.use('/api/auth', authRouter)
app.use('/api/rooms', roomsRouter)

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// Central error handler
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
  },
})

registerChatNamespace(io)

async function start() {
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

start().catch((err) => {
  console.error('✗ Failed to start server:', err.message)
  process.exit(1)
})
