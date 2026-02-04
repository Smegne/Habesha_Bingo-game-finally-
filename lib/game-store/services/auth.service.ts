"use client"

import { AuthApiService } from "../api/auth.api"
import { GameApiService } from "../api/game.api"
import { WalletApiService } from "../api/wallet.api"
import { AdminApiService } from "../api/admin.api"
import { ProfileApiService } from "../api/profile.api"
import { setAuthToken, clearAuthToken } from "../utils/api.utils"
import { extractTelegramData } from "../utils/auth.utils"
import { BOT_USERNAME } from "../constants/api.constants"
import { 
  User, 
  AuthResponse, 
  RegisterPayload,
  UserRole,
  BingoCard,
  Game,
  GameHistory,
  Deposit,
  Withdrawal,
  Transaction,
  ApprovalLog,
  PaginationInfo
} from "../types"

export class AuthService {
  private currentUser: User | null = null
  private isAuthenticated = false

  async initializeTelegramAuth(): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false

      const telegramData = extractTelegramData()
      const hasTelegramData = telegramData.tgWebAppData || telegramData.initData

      if (hasTelegramData) {
        const response = await AuthApiService.loginWithTelegram({
          ...telegramData,
          source: "telegram"
        })

        if (response.success && response.token && response.user) {
          this.handleSuccessfulAuth(response)
          return true
        }
      }

      return false
    } catch (error) {
      console.error("Telegram auth error:", error)
      return false
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await AuthApiService.loginWithCredentials(username, password)
    
    if (response.success && response.token && response.user) {
      this.handleSuccessfulAuth(response)
    }
    
    return response
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await AuthApiService.register(payload)
    
    if (response.success) {
      // Auto-login after successful registration
      const loginResponse = await this.login(payload.username, payload.password)
      return {
        success: loginResponse.success,
        message: response.message,
        role: loginResponse.role
      }
    }
    
    return response
  }

  logout(): void {
    clearAuthToken()
    AuthApiService.clearAuthCookie()
    this.currentUser = null
    this.isAuthenticated = false
  }

  private handleSuccessfulAuth(response: AuthResponse): void {
    if (response.token && response.user) {
      setAuthToken(response.token)
      this.currentUser = response.user
      this.isAuthenticated = true
      
      AuthApiService.setAuthCookie(response.token)
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated
  }

  getReferralLink(): string {
    if (!this.currentUser) return ""
    return `https://t.me/${BOT_USERNAME}?start=${this.currentUser.referralCode}`
  }

  setUser(user: User | null): void {
    this.currentUser = user
    this.isAuthenticated = !!user
  }
}