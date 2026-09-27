import mongoose from 'mongoose'
import { MONGODB_URI } from './config.js'

mongoose.set('strictQuery', true)

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — add it to server/.env')
  }
  await mongoose.connect(MONGODB_URI)
  console.log(`✓ MongoDB connected → ${mongoose.connection.name}`)
}

export async function disconnectDB() {
  await mongoose.disconnect()
}

