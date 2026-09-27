import mongoose from 'mongoose'

const MAX_LENGTH = 1000

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_LENGTH,
    },
  },
  { timestamps: true },
)

messageSchema.index({ room: 1, createdAt: -1 })

messageSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    roomId: this.room.toString(),
    sender: {
      id: this.sender._id.toString(),
      username: this.sender.username,
      displayName: this.sender.displayName,
    },
    body: this.body,
    createdAt: this.createdAt,
  }
}

export { MAX_LENGTH }
export const Message = mongoose.model('Message', messageSchema)
