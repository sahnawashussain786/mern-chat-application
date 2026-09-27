import mongoose from 'mongoose'

const MAX_LENGTH = 2000

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: MAX_LENGTH },
    type: { type: String, enum: ['text', 'image', 'gif', 'system'], default: 'text' },
    imageUrl: { type: String, default: '' },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

messageSchema.index({ room: 1, createdAt: -1 })

messageSchema.methods.toSafeJSON = function toSafeJSON() {
  const deleted = Boolean(this.deletedAt)
  return {
    id: this._id.toString(),
    roomId: this.room._id ? this.room._id.toString() : this.room.toString(),
    sender: this.sender?._id
      ? {
          id: this.sender._id.toString(),
          username: this.sender.username,
          displayName: this.sender.displayName,
          avatarUrl: this.sender.avatarUrl,
        }
      : { id: String(this.sender), username: 'unknown', displayName: 'Unknown', avatarUrl: '' },
    body: deleted ? '' : this.body,
    type: this.type,
    imageUrl: deleted ? '' : this.imageUrl,
    reactions: this.reactions ?? [],
    replyTo: this.replyTo ?? null,
    editedAt: this.editedAt,
    deleted,
    createdAt: this.createdAt,
  }
}

export { MAX_LENGTH }
export const Message = mongoose.model('Message', messageSchema)
