import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import MessageInput from '../components/MessageInput'
import ConnectionBanner from '../components/ConnectionBanner'
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
  const [typing, setTyping] = useState([])
  const [unread, setUnread] = useState({}) // roomId → count
  const [replyTo, setReplyTo] = useState(null)
  const [connected, setConnected] = useState(false)
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [] })
  const activeRoomRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  const bumpUnread = useCallback((roomId) => {
    if (roomId === activeRoomRef.current?.id) return
    setUnread((prev) => ({ ...prev, [roomId]: (prev[roomId] ?? 0) + 1 }))
  }, [])

  const clearUnread = useCallback((roomId) => {
    setUnread((prev) => {
      if (!prev[roomId]) return prev
      const next = { ...prev }
      delete next[roomId]
      return next
    })
  }, [])

  // Load rooms + existing DM conversations
  useEffect(() => {
    api
      .rooms()
      .then((data) => {
        setRooms([...(data.dmRooms ?? []), ...data.rooms])
        if (data.rooms.length > 0) setActiveRoom((cur) => cur ?? data.rooms[0])
      })
      .catch(() => {})
  }, [])

  // Load friends + requests
  const refreshFriends = useCallback(() => {
    api
      .friends()
      .then(setFriends)
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshFriends()
  }, [refreshFriends])

  // Socket lifecycle
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    socketRef.current = socket

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    const onPresence = ({ online }) => setOnlineUsers(online)

    const onMessageNew = ({ message, dmMembers }) => {
      // A DM arriving in a room we haven't opened yet — surface it in the sidebar
      if (dmMembers) {
        const friend = dmMembers.find((m) => m.id !== user.id)
        if (friend) {
          setRooms((prev) => {
            if (prev.some((r) => r.id === message.roomId)) return prev
            return [{ id: message.roomId, kind: 'dm', name: 'dm', isPrivate: true, dmUser: friend }, ...prev]
          })
        }
      }

      if (message.roomId === activeRoomRef.current?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev
          return [...prev, message]
        })
      } else {
        bumpUnread(message.roomId)
      }
    }

    const onFriendsUpdate = (payload) => {
      setFriends({
        friends: payload.friends ?? [],
        incoming: payload.incoming ?? [],
        outgoing: payload.outgoing ?? [],
      })
    }

    const onMessageUpdated = ({ message }) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)))
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
    socket.on('presence:state', onPresence)
    socket.on('message:new', onMessageNew)
    socket.on('message:updated', onMessageUpdated)
    socket.on('typing', onTyping)
    socket.on('friends:update', onFriendsUpdate)

    socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('presence:state', onPresence)
      socket.off('message:new', onMessageNew)
      socket.off('message:updated', onMessageUpdated)
      socket.off('typing', onTyping)
      socket.off('friends:update', onFriendsUpdate)
      socket.disconnect()
    }
  }, [user, bumpUnread, clearUnread])

  // Expire typing indicators
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

  const handleSend = useCallback(async (payload) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      const room = activeRoomRef.current
      if (!socket?.connected || !room) return reject(new Error('Not connected'))
      socket.emit('message:send', { roomId: room.id, ...payload }, (res) => {
        if (res?.error) return reject(new Error(res.error))
        resolve(res.message)
      })
    })
  }, [])

  const joinRoom = useCallback(
    (room) => {
      setActiveRoom(room)
      setMessages([])
      setTyping([])
      setReplyTo(null)
      clearUnread(room.id)
    },
    [clearUnread],
  )

  // Open (or focus) a 1:1 DM with a friend
  const openDM = useCallback(
    (room) => {
      setRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [room, ...prev]))
      joinRoom(room)
    },
    [joinRoom],
  )

  const handleReact = useCallback((m, emoji) => {
    socketRef.current?.emit('message:react', { messageId: m.id, emoji })
  }, [])

  const handleEdit = useCallback((m, body) => {
    socketRef.current?.emit('message:edit', { messageId: m.id, body })
  }, [])

  const handleDelete = useCallback((m) => {
    socketRef.current?.emit('message:delete', { messageId: m.id })
  }, [])

  // Join the active room whenever it or the connection changes
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
          setRooms((prev) =>
            [...prev, room].sort((a, b) => Number(b.isPrivate) - Number(a.isPrivate) || a.name.localeCompare(b.name)),
          )
          joinRoom(room)
        }}
        onlineUsers={onlineUsers}
        unread={unread}
        friendsData={friends}
        onOpenDM={openDM}
        onFriendsChanged={refreshFriends}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {!connected && <ConnectionBanner connected={connected} />}
        <ChatWindow
          room={activeRoom}
          user={user}
          messages={messages}
          setMessages={setMessages}
          typingUsers={typing}
          onReply={setReplyTo}
          onReact={handleReact}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={!activeRoom}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </main>
    </div>
  )
}
