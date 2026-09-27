import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Message } from '../models/Message.js'
import { Room } from '../models/Room.js'

export const roomsRouter = Router()

roomsRouter.use(requireAuth)

// GET /api/rooms — all rooms
roomsRouter.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ name: 1 })
    res.json({ rooms: rooms.map((room) => room.toSafeJSON()) })
  } catch (err) {
    next(err)
  }
})

// POST /api/rooms — create a room
roomsRouter.post('/', async (req, res, next) => {
  try {
    const rawName = String(req.body?.name ?? '').trim().toLowerCase()
    const topic = String(req.body?.topic ?? '').trim().slice(0, 80)

    if (!/^[a-z0-9-]{2,32}$/.test(rawName)) {
      return res.status(400).json({
        message: 'Room name must be 2–32 chars: lowercase letters, numbers, hyphens.',
      })
    }

    const existing = await Room.findOne({ name: rawName })
    if (existing) {
      return res.status(409).json({ message: `#${rawName} already exists.` })
    }

    const room = await Room.create({ name: rawName, topic, createdBy: req.user.id })
    res.status(201).json({ room: room.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})

// GET /api/rooms/:roomId/messages — paginated history, newest last
roomsRouter.get('/:roomId/messages', async (req, res, next) => {
  try {
    const { roomId } = req.params
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? '50', 10) || 50, 1), 100)
    const before = req.query.before ? new Date(String(req.query.before)) : null

    const query = { room: roomId }
    if (before && !Number.isNaN(before.getTime())) {
      query.createdAt = { $lt: before }
    }

    const docs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username displayName')

    res.json({
      messages: docs.reverse().map((m) => m.toSafeJSON()),
      hasMore: docs.length === limit,
    })
  } catch (err) {
    next(err)
  }
})
