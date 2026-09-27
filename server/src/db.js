import mongoose from 'mongoose'
import { MONGODB_URI } from './config.js'

mongoose.set('strictQuery', true)

const MAX_ATTEMPTS = 6
const RETRY_DELAY_MS = 3000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — add it to server/.env')
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI)
      console.log(`✓ MongoDB connected → ${mongoose.connection.name}`)
      return
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Could not reach MongoDB after ${MAX_ATTEMPTS} attempts (${err.message}). ` +
            `Is it running? Local: start mongod, or set MONGODB_URI to an Atlas URI in server/.env`,
        )
      }
      console.warn(
        `… MongoDB not ready (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message} — retrying in ${RETRY_DELAY_MS / 1000}s`,
      )
      await sleep(RETRY_DELAY_MS)
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
