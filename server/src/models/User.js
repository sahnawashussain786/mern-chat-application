import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9_]+$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
)

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    username: this.username,
    displayName: this.displayName,
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
