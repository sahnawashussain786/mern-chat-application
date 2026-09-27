const API_URL = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`)
    error.status = res.status
    error.errors = data.errors
    throw error
  }
  return data
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  rooms: () => request('/rooms'),
  createRoom: (body) => request('/rooms', { method: 'POST', body }),
  messages: (roomId, before) =>
    request(`/rooms/${roomId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`),
}

export { API_URL }
