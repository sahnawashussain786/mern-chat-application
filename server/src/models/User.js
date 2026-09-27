import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true, maxlength: 64 },
    avatarUrl: { type: String, default: '' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    clerkId: this.clerkId,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    lastSeenAt: this.lastSeenAt,
  }
}

userSchema.statics.upsertFromClerk = async function upsertFromClerk(clerkUser) {
  const username =
    clerkUser.username ||
    clerkUser.externalAccounts?.[0]?.username ||
    clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
    `user_${clerkUser.id.slice(-8)}`

  const primaryEmail = clerkUser.emailAddresses?.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress

  const filter = { clerkId: clerkUser.id }
  const update = {
    username: username.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24) || 'user',
    displayName:
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      primaryEmail ||
      'New User',
    avatarUrl: clerkUser.imageUrl || '',
  }

  return this.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  })
}

export const User = mongoose.model('User', userSchema)
