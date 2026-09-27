import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { resolveUser } from '../auth/clerk.js'
import { Message } from '../models/Message.js'
import { Room } from '../models/Room.js'

export const roomsRouter = Router()

// Attach the resolved local user (or 401) to every rooms route
roomsRouter.use(async (req, res, next) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ message: 'Not authenticated' })
    req.localUser = await resolveUser(userId)
    next()
  } catch (err) {
    next(err)
  }
})

// GET /api/rooms — rooms visible to the current user
roomsRouter.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({
      $or: [{ isPrivate: false }, { members: req.localUser._id }],
    }).sort({ isPrivate: 1, name: 1 })

    res.json({ rooms: rooms.map((r) => r.toSafeJSON()) })
  } catch (err) {
    next(err)
  }
})

// POST /api/rooms — create a room
roomsRouter.post('/', async (req, res, next) => {
  try {
    const rawName = String(req.body?.name ?? '').trim().toLowerCase()
    const topic = String(req.body?.topic ?? '').trim().slice(0, 80)
    const isPrivate = Boolean(req.body?.isPrivate)

    if (!/^[a-z0-9-]{2,32}$/.test(rawName)) {
      return res.status(400).json({
        message: 'Room name must be 2–32 chars: lowercase letters, numbers, hyphens.',
      })
    }

    const existing = await Room.findOne({ name: rawName })
    if (existing) return res.status(409).json({ message: `#${rawName} already exists.` })

    const room = await Room.create({
      name: rawName,
      topic,
      isPrivate,
      members: isPrivate ? [req.localUser._id] : [],
      createdBy: req.localUser._id,
    })
    res.status(201).json({ room: room.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})

// POST /api/rooms/:id/join — join a private room
roomsRouter.post('/:id/join', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Room not found' })

    if (room.isPrivate && !room.members.some((m) => m.equals(req.localUser._id))) {
      room.members.push(req.localUser._id)
      await room.save()
    }
    res.json({ room: room.toSafeJSON() })
  } catch (err) {
    next(err)
  }
})

// GET /api/rooms/:id/messages — paginated history, oldest→newest
roomsRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? '50', 10) || 50, 1), 100)
    const before = req.query.before ? new Date(String(req.query.before)) : null

    const room = await Room.findById(id)
    if (!room) return res.status(404).json({ message: 'Room not found' })

    if (room.isPrivate && !room.members.some((m) => m.equals(req.localUser._id))) {
      return res.status(403).json({ message: 'You are not a member of this room' })
    }

    const query = { room: id }
    if (before && !Number.isNaN(before.getTime())) {
      query.createdAt = { $lt: before }
    }

    const docs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username displayName avatarUrl')
      .populate({ path: 'replyTo', select: 'body sender createdAt', populate: { path: 'sender', select: 'displayName' } })

    res.json({
      messages: docs.reverse().map((m) => m.toSafeJSON()),
      hasMore: docs.length === limit,
    })
  } catch (err) {
    next(err)
  }
})
