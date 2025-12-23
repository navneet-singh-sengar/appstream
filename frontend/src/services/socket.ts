import { io, Socket } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:5001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function joinBuild(buildId: string): void {
  const s = getSocket()
  if (s.connected) {
    s.emit('join_build', { build_id: buildId })
  }
}

