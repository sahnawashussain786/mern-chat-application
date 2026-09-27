import { Room } from './models/Room.js'

const DEFAULT_ROOMS = [
  { name: 'general', topic: 'Say hello 👋' },
  { name: 'random', topic: 'Anything goes' },
  { name: 'tech-talk', topic: 'Code, tools & gadgets' },
]

export async function seedDefaultRooms() {
  const count = await Room.countDocuments()
  if (count > 0) return
  await Room.insertMany(DEFAULT_ROOMS)
  console.log(`✓ Seeded ${DEFAULT_ROOMS.length} default rooms`)
}
