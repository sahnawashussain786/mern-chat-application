import { Message } from '../models/Message.js'
import { Room } from '../models/Room.js'
import { socketAuth } from './auth.js'

// userId → Set of socket ids
const online = new Map()

function broadcastPresence(io) {
  const payload = [...online.keys()]
  io.emit('presence:state', { online: payload })
}

export function registerChatNamespace(io) {
  io.use(socketAuth)

  io.on('connection', (socket) => {
    const user = socket.data.user
    const userId = user.id

    // Track presence per user (multi-tab: one user, many sockets)
    if (!online.has(userId)) online.set(userId, new Set())
    online.get(userId).add(socket.id)
    broadcastPresence(io)
    console.log(`→ ${user.username} connected (${socket.id})`)

    socket.on('room:join', async ({ roomId } = {}, callback) => {
      try {
        if (typeof callback !== 'function') return
        const room = await Room.findById(roomId)
        if (!room) return callback({ error: 'Room not found' })

        // Leave previously joined chat rooms (single-room focus)
        for (const r of socket.rooms) {
          if (r !== socket.id && r.startsWith('room:')) socket.leave(r)
        }

        const joinedRoom = `room:${roomId}`
        socket.join(joinedRoom)
        socket.to(joinedRoom).emit('user:joined', {
          user,
          at: new Date().toISOString(),
        })

        callback({ ok: true })
      } catch (err) {
        callback({ error: err.message ?? 'Failed to join room' })
      }
    })

    socket.on('message:send', async ({ roomId, body } = {}, callback) => {
      try {
        if (typeof callback !== 'function') return

        const text = String(body ?? '').trim().slice(0, 1000)
        if (!text) return callback({ error: 'Message cannot be empty' })
        if (!socket.rooms.has(`room:${roomId}`)) {
          return callback({ error: 'Join the room before sending' })
        }

        const room = await Room.findById(roomId)
        if (!room) return callback({ error: 'Room not found' })

        const doc = await Message.create({
          room: roomId,
          sender: user.id,
          body: text,
        })
        const populated = await doc.populate('sender', 'username displayName')
        const message = populated.toSafeJSON()

        io.to(`room:${roomId}`).emit('message:new', { message })
        callback({ ok: true, message })
      } catch (err) {
        callback({ error: err.message ?? 'Failed to send message' })
      }
    })

    socket.on('typing', ({ roomId, isTyping } = {}) => {
      if (!roomId) return
      socket.to(`room:${roomId}`).emit('typing', {
        roomId,
        user: { id: user.id, username: user.username, displayName: user.displayName },
        isTyping: Boolean(isTyping),
      })
    })

    socket.on('disconnect', () => {
      const sockets = online.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) online.delete(userId)
      }
      broadcastPresence(io)
      console.log(`← ${user.username} disconnected (${socket.id})`)
    })
  })
}
