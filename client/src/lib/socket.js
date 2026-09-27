import { io } from 'socket.io-client'
import { getToken } from './clerk'

const API_URL = import.meta.env.VITE_API_URL || ''

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(API_URL || '/', {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: async (cb) => {
        const token = await getToken()
        cb({ token })
      },
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
