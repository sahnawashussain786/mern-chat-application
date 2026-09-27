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
  // Friends & DMs
  friends: () => request('/friends'),
  searchUsers: (q) => request(`/friends/search?q=${encodeURIComponent(q)}`),
  sendFriendRequest: (username) => request('/friends/requests', { method: 'POST', body: { username } }),
  acceptFriendRequest: (requestId) => request(`/friends/requests/${requestId}/accept`, { method: 'POST' }),
  declineFriendRequest: (requestId) => request(`/friends/requests/${requestId}`, { method: 'DELETE' }),
  removeFriend: (userId) => request(`/friends/${userId}`, { method: 'DELETE' }),
  openDM: (userId) => request(`/friends/${userId}/dm`),
}

export { API_URL }
