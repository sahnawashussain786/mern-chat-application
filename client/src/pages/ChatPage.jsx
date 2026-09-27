import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import MessageInput from '../components/MessageInput'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'

const TYPING_TTL_MS = 4000

export default function ChatPage() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typing, setTyping] = useState([]) // [{ id, displayName, at }]
  const [connected, setConnected] = useState(false)
  const activeRoomRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  // Load rooms once
  useEffect(() => {
    api
      .rooms()
      .then((data) => {
        setRooms(data.rooms)
        if (data.rooms.length > 0) setActiveRoom((cur) => cur ?? data.rooms[0])
      })
      .catch(() => {})
  }, [])

  // Socket lifecycle: connect after auth
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    socketRef.current = socket

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onConnectError = (err) => {
      console.warn('socket error:', err.message)
      setConnected(false)
    }

    const onPresence = ({ online }) => setOnlineUsers(online)

    const onMessageNew = ({ message }) => {
      if (message.roomId === activeRoomRef.current?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev
          return [...prev, message]
        })
      }
    }

    const onTyping = ({ user: typingUser, isTyping }) => {
      if (!activeRoomRef.current) return
      if (typingUser.id === user.id) return
      setTyping((prev) => {
        const rest = prev.filter((t) => t.id !== typingUser.id)
        return isTyping ? [...rest, { ...typingUser, at: Date.now() }] : rest
      })
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('presence:state', onPresence)
    socket.on('message:new', onMessageNew)
    socket.on('typing', onTyping)

    socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('presence:state', onPresence)
      socket.off('message:new', onMessageNew)
      socket.off('typing', onTyping)
      socket.disconnect()
    }
  }, [user])

  // Expire stale typing indicators
  useEffect(() => {
    if (typing.length === 0) return
    const timer = setInterval(() => {
      setTyping((prev) => prev.filter((t) => Date.now() - t.at < TYPING_TTL_MS))
    }, 1000)
    return () => clearInterval(timer)
  }, [typing.length])

  const handleTyping = useCallback((isTyping) => {
    const socket = socketRef.current
    const room = activeRoomRef.current
    if (socket?.connected && room) {
      socket.emit('typing', { roomId: room.id, isTyping })
    }
  }, [])

  const handleSend = useCallback(async (text) => {
    const socket = socketRef.current
    const room = activeRoomRef.current
    if (!socket?.connected || !room) throw new Error('Not connected')
    socket.emit('message:send', { roomId: room.id, body: text }, (res) => {
      if (res?.error) throw new Error(res.error)
    })
  }, [])

  const joinRoom = useCallback((room) => {
    setActiveRoom(room)
    setMessages([])
    setTyping([])
  }, [])

  // Join the active room on the socket whenever it or connection state changes
  useEffect(() => {
    const socket = socketRef.current
    if (socket?.connected && activeRoom) {
      socket.emit('room:join', { roomId: activeRoom.id }, (res) => {
        if (res?.error) console.warn('join failed:', res.error)
      })
    }
  }, [activeRoom, connected])

  return (
    <div className="flex h-full">
      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onJoinRoom={joinRoom}
        onCreateRoom={(room) => {
          setRooms((prev) => [...prev, room].sort((a, b) => a.name.localeCompare(b.name)))
          joinRoom(room)
        }}
        onlineUsers={onlineUsers}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <ChatWindow
          room={activeRoom}
          user={user}
          messages={messages}
          setMessages={setMessages}
          typingUsers={typing}
        />
        <MessageInput onSend={handleSend} onTyping={handleTyping} disabled={!activeRoom} />
      </main>
    </div>
  )
}
