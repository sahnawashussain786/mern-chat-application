import { io } from 'socket.io-client'

// Singleton socket — browser can't expose VITE_API_URL at import time reliably
// so we rely on the Vite proxy in dev; in prod, set VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || ''

// Simple pub/sub so components can react to socket lifecycle changes
const listeners = new Set()
export function onSocketChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

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
    })
  }
  listeners.forEach((fn) => fn(socket))
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
