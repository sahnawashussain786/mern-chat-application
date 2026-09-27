import { getToken } from './clerk'

const API_URL = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const token = await getToken()

  const res = await fetch(`/api${path}`, {
    credentials: 'include',
  headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}

export const api = {
  me: () => request('/auth/me'),
  rooms: () => request('/rooms'),
  createRoom: (body) => request('/rooms', { method: 'POST', body }),
  joinRoom: (id) => request(`/rooms/${id}/join`, { method: 'POST' }),
  messages: (roomId, before) =>
    request(`/rooms/${roomId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`),
}

export { API_URL }
