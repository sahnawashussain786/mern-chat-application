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
    topic: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

roomSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    topic: this.topic,
  }
}

export const Room = mongoose.model('Room', roomSchema)
