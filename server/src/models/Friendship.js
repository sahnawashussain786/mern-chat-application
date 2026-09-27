import mongoose from 'mongoose'

// A friendship between two users.
// status: 'pending'  → requester sent a request, addressee hasn't answered
// status: 'accepted' → they are friends
// A declined request is simply deleted, so it can be sent again later.
const friendshipSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    addressee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
)

// One relationship per pair, in either direction
friendshipSchema.index({ requester: 1, addressee: 1 }, { unique: true })

friendshipSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    requester: this.requester?._id
      ? this.requester._id.toString()
      : this.requester?.toString(),
    addressee: this.addressee?._id
      ? this.addressee._id.toString()
      : this.addressee?.toString(),
    status: this.status,
    createdAt: this.createdAt,
  }
}

export const Friendship = mongoose.model('Friendship', friendshipSchema)
