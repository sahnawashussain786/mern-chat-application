import { verifyToken } from '@clerk/backend'
import { Message } from '../models/Message.js'
import { Room } from '../models/Room.js'
import { User } from '../models/User.js'
import { resolveUser } from '../auth/clerk.js'

// clerkId → Set of socket ids
const online = new Map()

let ioRef = null

// Emit an event to every socket of a user (by clerkId), e.g. friend notifications
export function emitToClerk(clerkId, event, payload) {
  const sockets = online.get(clerkId)
  if (!ioRef || !sockets) return
  for (const socketId of sockets) {
    ioRef.to(socketId).emit(event, payload)
  }
}

function broadcastPresence(io) {
  const ids = [...online.keys()]
  User.find({ clerkId: { $in: ids } })
    .select('username displayName avatarUrl clerkId')
    .then((users) => {
      io.emit('presence:state', {
        online: users.map((u) => ({
          id: u._id.toString(),
          clerkId: u.clerkId,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        })),
      })
    })
    .catch(() => {})
}

function canAccess(room, userDoc) {
  return !room.isPrivate || room.members.some((m) => m.equals(userDoc._id))
}

function roomKey(roomId) {
  return `room:${roomId}`
}

async function loadMessageForViewer(messageId, userDoc) {
  const msg = await Message.findById(messageId).populate('room')
  if (!msg) return { error: 'Message not found' }
  if (!canAccess(msg.room, userDoc)) return { error: 'Not allowed' }
  return { msg }
}

async function emitUpdatedMessage(io, msg) {
  await msg.populate([
    { path: 'sender', select: 'username displayName avatarUrl' },
    {
      path: 'replyTo',
      select: 'body sender createdAt',
      populate: { path: 'sender', select: 'displayName' },
    },
  ])
  io.to(roomKey(msg.room._id.toString())).emit('message:updated', {
    message: msg.toSafeJSON(),
  })
}

export function registerChatNamespace(io) {
  ioRef = io

  // Handshake authentication via Clerk session token
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        parseBearer(socket.handshake.headers.authorization) ||
        cookieToken(socket.handshake.headers.cookie)

      if (!token) return next(new Error('Unauthorized'))

      const claims = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      })

      socket.data.clerkId = claims.sub
      next()
    } catch (err) {
      console.warn('socket auth failed:', err.message)
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const clerkId = socket.data.clerkId
    let userDoc = null

    resolveUser(clerkId)
      .then((doc) => {
        userDoc = doc
        if (!online.has(clerkId)) online.set(clerkId, new Set())
        online.get(clerkId).add(socket.id)
        broadcastPresence(io)
      })
      .catch((err) => {
        console.warn('socket user resolve failed:', err.message)
        socket.disconnect(true)
      })

    const requireUser = (callback) => {
      if (typeof callback !== 'function') return false
      if (!userDoc) {
        callback({ error: 'Still loading — try again' })
        return false
      }
      return true
    }

    socket.on('room:join', async ({ roomId } = {}, callback) => {
      try {
        if (!requireUser(callback)) return
        const room = await Room.findById(roomId)
        if (!room) return callback({ error: 'Room not found' })
        if (!canAccess(room, userDoc)) return callback({ error: 'Not a member of this room' })

        for (const r of socket.rooms) {
          if (r !== socket.id && r.startsWith('room:')) socket.leave(r)
        }
        socket.join(roomKey(roomId))
        callback({ ok: true })
      } catch (err) {
        callback({ error: err.message })
      }
    })

    socket.on('message:send', async ({ roomId, body, imageUrl, type, replyTo } = {}, callback) => {
      try {
        if (!requireUser(callback)) return

        const text = String(body ?? '').trim().slice(0, 2000)
        const isImage = type === 'image' && typeof imageUrl === 'string' && imageUrl.startsWith('http')
        if (!text && !isImage) return callback({ error: 'Message cannot be empty' })

        const room = await Room.findById(roomId)
        if (!room) return callback({ error: 'Room not found' })
        if (!canAccess(room, userDoc)) return callback({ error: 'Not a member of this room' })
        if (!socket.rooms.has(roomKey(roomId))) return callback({ error: 'Join the room first' })

        let replyToId = null
        if (replyTo) {
          const target = await Message.findById(replyTo)
          if (target && String(target.room) === String(roomId)) replyToId = target._id
        }

        const doc = await Message.create({
          room: roomId,
          sender: userDoc._id,
          body: isImage ? '' : text,
          type: isImage ? 'image' : 'text',
          imageUrl: isImage ? imageUrl.slice(0, 500) : '',
          replyTo: replyToId,
        })

        await doc.populate([
          { path: 'sender', select: 'username displayName avatarUrl' },
          {
            path: 'replyTo',
            select: 'body sender createdAt',
            populate: { path: 'sender', select: 'displayName' },
          },
        ])

        const payload = { message: doc.toSafeJSON() }

        // DM rooms carry their participants so each client can identify the friend
        if (room.kind === 'dm') {
          await room.populate('members', 'username displayName avatarUrl')
          payload.dmMembers = room.members.map((u) => ({
            id: u._id.toString(),
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
          }))
        }

        io.to(roomKey(roomId)).emit('message:new', payload)
        callback({ ok: true, message: doc.toSafeJSON() })
      } catch (err) {
        callback({ error: err.message ?? 'Failed to send message' })
      }
    })

    socket.on('message:react', async ({ messageId, emoji } = {}, callback) => {
      try {
        if (!requireUser(callback)) return
        const { msg, error } = await loadMessageForViewer(messageId, userDoc)
        if (error) return callback({ error })

        const emojiKey = String(emoji ?? '').slice(0, 8)
        if (!emojiKey) return callback({ error: 'Emoji required' })

        const existing = msg.reactions.find((r) => r.emoji === emojiKey)
        if (existing) {
          if (existing.users.some((u) => u.equals(userDoc._id))) {
            existing.users = existing.users.filter((u) => !u.equals(userDoc._id))
          } else {
            existing.users.push(userDoc._id)
          }
        } else {
          msg.reactions.push({ emoji: emojiKey, users: [userDoc._id] })
        }

        msg.reactions = msg.reactions.filter((r) => r.users.length > 0)
        await msg.save()
        await emitUpdatedMessage(io, msg)
        callback({ ok: true })
      } catch (err) {
        callback({ error: err.message })
      }
    })

    socket.on('message:edit', async ({ messageId, body } = {}, callback) => {
      try {
        if (!requireUser(callback)) return
        const msg = await Message.findOne({ _id: messageId, sender: userDoc._id })
        if (!msg) return callback({ error: 'Message not found or not yours' })

        const text = String(body ?? '').trim().slice(0, 2000)
        if (!text) return callback({ error: 'Message cannot be empty' })

        msg.body = text
        msg.editedAt = new Date()
        await msg.save()
        await emitUpdatedMessage(io, msg)
        callback({ ok: true })
      } catch (err) {
        callback({ error: err.message })
      }
    })

    socket.on('message:delete', async ({ messageId } = {}, callback) => {
      try {
        if (!requireUser(callback)) return
        const msg = await Message.findOne({ _id: messageId, sender: userDoc._id })
        if (!msg) return callback({ error: 'Message not found or not yours' })

        msg.deletedAt = new Date()
        msg.body = ''
        msg.imageUrl = ''
        msg.reactions = []
        await msg.save()
        await emitUpdatedMessage(io, msg)
        callback({ ok: true })
      } catch (err) {
        callback({ error: err.message })
      }
    })

    socket.on('typing', ({ roomId, isTyping } = {}) => {
      if (!roomId || !userDoc) return
      socket.to(roomKey(roomId)).emit('typing', {
        roomId,
        user: {
          id: userDoc._id.toString(),
          username: userDoc.username,
          displayName: userDoc.displayName,
          avatarUrl: userDoc.avatarUrl,
        },
        isTyping: Boolean(isTyping),
      })
    })

    socket.on('disconnect', () => {
      const sockets = online.get(clerkId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) online.delete(clerkId)
      }
      if (userDoc) {
        userDoc.lastSeenAt = new Date()
        userDoc.save().catch(() => {})
      }
      broadcastPresence(io)
    })
  })
}

function parseBearer(header) {
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

function cookieToken(cookieHeader) {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key === '__session') return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return null
}
