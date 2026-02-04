import { io, Socket } from "socket.io-client"
import { WS_URL } from "../constants/api.constants"
import { getAuthToken } from "../utils/api.utils"
import { SocketEventMap, SocketAuth } from "../types/socket.types"
import { Game, User } from "../types"

export class SocketService {
  private socket: Socket | null = null

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(WS_URL, {
      auth: { token } as SocketAuth,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  on<K extends keyof SocketEventMap>(event: K, handler: SocketEventMap[K]): void {
    if (this.socket) {
      this.socket.on(event as string, handler as any)
    }
  }

  off<K extends keyof SocketEventMap>(event: K, handler?: SocketEventMap[K]): void {
    if (this.socket) {
      this.socket.off(event as string, handler as any)
    }
  }

  // Event handlers setup
  setupEventHandlers(callbacks: {
    onConnect: () => void
    onConnectError: (error: any) => void
    onDisconnect: (reason: string) => void
    onGameState: (data: { game: Game; markedNumbers?: number[] }) => void
    onNumberCalled: (data: { number: number }) => void
    onWinner: (data: { winnerId: string; winnerName: string; winAmount: number }) => void
    onGameStarted: (data: { startedAt: string }) => void
    onPlayerJoined: (data: { userId: string }) => void
  }): void {
    if (!this.socket) return

    this.socket.on("connect", callbacks.onConnect)
    this.socket.on("connect_error", callbacks.onConnectError)
    this.socket.on("disconnect", callbacks.onDisconnect)
    this.socket.on("game-state", callbacks.onGameState)
    this.socket.on("number-called", callbacks.onNumberCalled)
    this.socket.on("winner", callbacks.onWinner)
    this.socket.on("game-started", callbacks.onGameStarted)
    this.socket.on("player-joined", callbacks.onPlayerJoined)
  }
}