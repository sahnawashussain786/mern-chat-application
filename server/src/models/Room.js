import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 32,
      match: /^[a-z0-9-]+$/,
    },
    topic: { type: String, trim: true, maxlength: 80, default: '' },
    isPrivate: { type: Boolean, default: false },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // DM rooms: kind === 'dm', exactly two members, never listed in public room lists
    kind: { type: String, enum: ['channel', 'dm'], default: 'channel' },
    pairKey: { type: String, index: true, select: false },
  },
  { timestamps: true },
)

roomSchema.index({ kind: 1, pairKey: 1 })

roomSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    topic: this.topic,
    isPrivate: this.isPrivate,
    memberCount: this.members?.length ?? 0,
    kind: this.kind,
  }
}

// Static helper: find (or lazily create) the DM room shared by two users.
// Pair key keeps the same room stable regardless of who opens it first.
roomSchema.statics.findOrCreateDM = async function findOrCreateDM(userAId, userBId) {
  const pairKey = [String(userAId), String(userBId)].sort().join(':')

  const existing = await this.findOne({ kind: 'dm', pairKey })
  if (existing) return existing

  const name = `dm-${pairKey.replace(/:/g, '-x-')}`
  const created = await this.create({
    name,
    topic: 'Direct message',
    isPrivate: true,
    kind: 'dm',
    pairKey,
    members: [userAId, userBId],
    createdBy: userAId,
  })
  return created
}

export const Room = mongoose.model('Room', roomSchema)
