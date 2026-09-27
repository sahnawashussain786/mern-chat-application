# ChatFlow — Real-time MERN Chat App with Clerk Auth

A polished real-time chat application: **MongoDB · Express · React · Node** with **Socket.IO**,
**Tailwind CSS v4**, and **Clerk** authentication.

![stack](https://img.shields.io/badge/stack-MERN-8b5cf6) ![auth](https://img.shields.io/badge/auth-Clerk-6c47ff) ![ui](https://img.shields.io/badge/ui-Tailwind%20v4-38bdf8)

## ✨ Features

**Real-time**
- Instant messaging via Socket.IO with auto-reconnect
- Live presence (online users, multi-tab aware)
- Typing indicators with animated dots
- Unread message badges per room

**Messaging**
- Emoji reactions (hover a message → pick an emoji)
- Reply threading with quoted context
- Edit & delete your own messages (soft delete)
- Image sharing via URL (gif/png/jpg/webp)
- Message history with cursor pagination
- Day separators + sender grouping

**Rooms**
- Public + private (invite-only) rooms
- Room search/filter
- Create rooms inline

**Auth (Clerk)**
- Prebuilt Sign-in / Sign-up components
- Session tokens verified on the API and on the Socket.IO handshake
- Users auto-synced to MongoDB (profile, avatar)
- Optional webhook for user created/updated/deleted events

**UI**
- Tailwind v4 dark theme with gradient accents
- Animated auth landing page
- Emoji picker in the composer
- Glow effects, custom scrollbar, micro-animations everywhere

## 🏗 Structure

```
├── client/                     # React 19 + Vite + Tailwind v4 + Clerk
│   └── src/
│       ├── components/         # Sidebar, ChatWindow, MessageItem, MessageInput, EmojiPicker
│       ├── context/            # AuthContext (Clerk ↔ Mongo sync)
│       ├── lib/                # api client, socket singleton, clerk token bridge
│       └── pages/              # AuthLayout, ChatPage
└── server/                     # Express 5 + Socket.IO + Mongoose + @clerk/express
    └── src/
        ├── auth/               # Clerk user resolution
        ├── models/             # User (Clerk-synced), Room, Message
        ├── routes/             # /api/auth, /api/rooms, /api/webhooks/clerk
        └── socket/             # Clerk-authenticated socket handlers
```

## 🚀 Getting Started

### Prerequisites
- Node 18+
- MongoDB local **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A [Clerk](https://clerk.com) account (free tier is fine)

### 1. Clerk keys
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → **API Keys**
2. Copy the **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`)

### 2. Server

```bash
cd server
cp .env.example .env      # fill in your Clerk keys + MONGODB_URI
npm install
npm run dev               # http://localhost:5000
```

`server/.env`:
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/chatapp
CLIENT_ORIGIN=http://localhost:5173
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# optional but recommended:
CLERK_WEBHOOK_SECRET=whsec_...
```

> Without `CLERK_WEBHOOK_SECRET` the app still works — users are created
> on first API call (lazy sync). The webhook keeps profiles fresher.

### 3. Client

```bash
cd client
cp .env.example .env.local    # paste your publishable key
npm install
npm run dev                   # http://localhost:5173
```

`client/.env.local`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Chat!

Open **http://localhost:5173** → sign up via Clerk → pick a room →
open a second browser profile to see live sync, presence, typing, and reactions.

### 5. (Optional) Webhook for live profile sync
1. Clerk Dashboard → **Webhooks** → Add endpoint
2. URL: `https://<your-ngrok-or-domain>/api/webhooks/clerk`
3. Subscribe to `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret into `CLERK_WEBHOOK_SECRET`

## 🔐 How auth works

```
Browser ──SignIn/SingUp (Clerk)──▶ Clerk
   │
   │  getToken() → short-lived session JWT
   ▼
fetch /api/* with Authorization: Bearer <jwt> ──▶ @clerk/express clerkMiddleware() verifies
   │
   └ socket.io handshake auth:{ token } ──▶ verifyToken() from @clerk/backend verifies
```

Every REST call and every socket handshake carries a Clerk session JWT that the
server verifies against Clerk's JWKS — no passwords or sessions live in your DB.

## 📜 Scripts

### From the project root (recommended)

Run once first — installs the root `concurrently` dependency:

```bash
npm install
```

| Script               | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start **server + client together** (one window, prefixed `[server]` / `[client]` logs) |
| `npm run server`     | Start only the API server                      |
| `npm run client`     | Start only the Vite client                     |
| `npm run install:all`| Install root + server + client dependencies    |
| `npm run build`      | Production build of the client                 |
| `start.bat`          | Windows: checks env/Mongo/deps, launches everything, health-checks the API |
| `start.bat check`    | Windows: verify setup only, start nothing      |

### From inside `server/` or `client/`

| Location | Script         | Purpose                  |
| -------- | -------------- | ------------------------ |
| `server` | `npm run dev`  | Server with auto-reload  |
| `server` | `npm start`    | Production server        |
| `client` | `npm run dev`  | Vite dev server          |
| `client` | `npm run build`| Production bundle        |
| `client` | `npm run lint` | OxLint                   |
