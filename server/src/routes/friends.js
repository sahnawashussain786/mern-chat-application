import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { resolveUser } from '../auth/clerk.js'
import { Friendship } from '../models/Friendship.js'
import { Room } from '../models/Room.js'
import { User } from '../models/User.js'
import { emitToClerk } from '../socket/index.js'

export const friendsRouter = Router()

// Attach the resolved local user (or 401) to every friends route
friendsRouter.use(async (req, res, next) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ message: 'Not authenticated' })
    req.localUser = await resolveUser(userId)
    next()
  } catch (err) {
    next(err)
  }
})

function publicUser(u) {
  return {
    id: u._id.toString(),
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  }
}

// Push a fresh friends snapshot to a user (by clerkId) over socket
async function pushFriendsSnapshot(clerkId) {
  try {
    const user = await User.findOne({ clerkId }).select('_id')
    if (!user) return
    emitToClerk(clerkId, 'friends:update', await buildFriendsPayload(user._id))
  } catch {
    // best-effort
  }
}

async function buildFriendsPayload(me) {
  const links = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: me }, { addressee: me }],
  }).populate('requester addressee', 'username displayName avatarUrl')

  const incoming = await Friendship.find({ addressee: me, status: 'pending' }).populate(
    'requester',
    'username displayName avatarUrl',
  )

  const outgoing = await Friendship.find({ requester: me, status: 'pending' }).populate(
    'addressee',
    'username displayName avatarUrl',
  )

  return {
    friends: links.map((f) => publicUser(f.requester._id.equals(me) ? f.addressee : f.requester)),
    incoming: incoming.map((f) => ({
      requestId: f._id.toString(),
      user: publicUser(f.requester),
    })),
    outgoing: outgoing.map((f) => ({
      requestId: f._id.toString(),
      user: publicUser(f.addressee),
    })),
  }
}

// GET /api/friends — friends + incoming/outgoing requests
friendsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await buildFriendsPayload(req.localUser._id))
  } catch (err) {
    next(err)
  }
})

// GET /api/friends/search?q= — find users by username/display name
friendsRouter.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) return res.json({ users: [] })

    const me = req.localUser._id

    const relationships = await Friendship.find({
      $or: [{ requester: me }, { addressee: me }],
    }).select('requester addressee status')

    const related = new Map()
    for (const rel of relationships) {
      const otherId = rel.requester.equals(me) ? rel.addressee : rel.requester
      related.set(otherId.toString(), rel.status)
    }

    const users = await User.find({
      _id: { $ne: me },
      $or: [
        { username: new RegExp(`^${escapeRegex(q)}`, 'i') },
        { displayName: new RegExp(escapeRegex(q), 'i') },
      ],
    })
      .select('username displayName avatarUrl')
      .limit(20)

    res.json({
      users: users.map((u) => ({
        ...publicUser(u),
        friendshipStatus: related.get(u._id.toString()) ?? 'none',
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/friends/requests — send a friend request by username
friendsRouter.post('/requests', async (req, res, next) => {
  try {
    const username = String(req.body?.username ?? '').trim().toLowerCase()
    if (!username) return res.status(400).json({ message: 'Username is required' })

    const target = await User.findOne({ username })
    if (!target) return res.status(404).json({ message: 'No user found with that username' })

    const me = req.localUser._id
    if (target._id.equals(me)) {
      return res.status(400).json({ message: 'You cannot befriend yourself' })
    }

    const existing = await Friendship.findOne({
      $or: [
        { requester: me, addressee: target._id },
        { requester: target._id, addressee: me },
      ],
    })

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ message: 'You are already friends' })
      }
      // They already sent me a request → accept it immediately
      if (existing.requester.equals(target._id)) {
        existing.status = 'accepted'
        await existing.save()
        pushFriendsSnapshot(req.localUser.clerkId)
        pushFriendsSnapshot(target.clerkId)
        return res.json({ message: 'Friends now!', status: 'accepted' })
      }
      return res.status(409).json({ message: 'Request already sent' })
    }

    const link = await Friendship.create({ requester: me, addressee: target._id })
    pushFriendsSnapshot(target.clerkId) // notify addressee in real time
    res.status(201).json({ message: 'Request sent', status: 'pending', requestId: link._id.toString() })
  } catch (err) {
    next(err)
  }
})

// POST /api/friends/requests/:id/accept
friendsRouter.post('/requests/:id/accept', async (req, res, next) => {
  try {
    const link = await Friendship.findOne({ _id: req.params.id, addressee: req.localUser._id })
    if (!link) return res.status(404).json({ message: 'Request not found' })
    if (link.status === 'accepted') return res.json({ message: 'Already friends' })

    link.status = 'accepted'
    await link.save()

    // Tell both sides in real time
    const requesterDoc = await User.findById(link.requester).select('clerkId')
    pushFriendsSnapshot(req.localUser.clerkId)
    if (requesterDoc) pushFriendsSnapshot(requesterDoc.clerkId)

    res.json({ message: 'Friend added' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/friends/requests/:id — decline incoming or cancel outgoing
friendsRouter.delete('/requests/:id', async (req, res, next) => {
  try {
    const link = await Friendship.findOne({
      _id: req.params.id,
      $or: [{ addressee: req.localUser._id }, { requester: req.localUser._id }],
    })
    if (!link) return res.status(404).json({ message: 'Request not found' })

    const otherId = link.requester.equals(req.localUser._id) ? link.addressee : link.requester
    await link.deleteOne()

    const otherDoc = await User.findById(otherId).select('clerkId')
    if (otherDoc) pushFriendsSnapshot(otherDoc.clerkId)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/friends/:userId — remove an existing friendship
friendsRouter.delete('/:userId', async (req, res, next) => {
  try {
    const result = await Friendship.deleteOne({
      status: 'accepted',
      $or: [
        { requester: req.localUser._id, addressee: req.params.userId },
        { requester: req.params.userId, addressee: req.localUser._id },
      ],
    })
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Not friends' })

    const otherDoc = await User.findById(req.params.userId).select('clerkId')
    if (otherDoc) pushFriendsSnapshot(otherDoc.clerkId)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// GET /api/friends/:userId/dm — open (or create) a DM room with a friend
friendsRouter.get('/:userId/dm', async (req, res, next) => {
  try {
    const otherId = req.params.userId
    const me = req.localUser._id

    const friendship = await Friendship.findOne({
      status: 'accepted',
      $or: [
        { requester: me, addressee: otherId },
        { requester: otherId, addressee: me },
      ],
    })
    if (!friendship) return res.status(403).json({ message: 'You can only DM friends' })

    const other = await User.findById(otherId).select('username displayName avatarUrl')
    if (!other) return res.status(404).json({ message: 'User not found' })

    const room = await Room.findOrCreateDM(me, otherId)

    res.json({
      room: {
        ...room.toSafeJSON(),
        dmUser: publicUser(other),
        pairKey: `dm:${otherId}`,
      },
    })
  } catch (err) {
    next(err)
  }
})

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
