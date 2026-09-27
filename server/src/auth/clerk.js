import { clerkClient } from '@clerk/express'
import { User } from '../models/User.js'

export async function resolveUser(clerkUserId) {
  if (!clerkUserId) return null

  let local = await User.findOne({ clerkId: clerkUserId })
  if (local) return local

  const clerkUser = await clerkClient.users.getUser(clerkUserId)
  local = await User.upsertFromClerk(clerkUser)
  return local
}

export function toSafeUser(doc) {
  return doc.toSafeJSON()
}
