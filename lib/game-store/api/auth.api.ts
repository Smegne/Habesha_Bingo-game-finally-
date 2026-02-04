import { API_URL } from "../constants/api.constants"
import { getAuthHeaders, handleApiError } from "../utils/api.utils"
import { AuthResponse, RegisterPayload, User } from "../types/user.types"

export class AuthApiService {
  static async loginWithTelegram(data: {
    tgWebAppData?: string
    initData?: string
    source: string
    platform?: string
    version?: string
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        return await response.json()
      }
      return await handleApiError(response)
    } catch (error) {
      console.error("Telegram login error:", error)
      return { success: false, message: "Network error" }
    }
  }

  static async loginWithCredentials(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ username, password, source: "web" }),
      })

      if (response.ok) {
        return await response.json()
      }
      return await handleApiError(response)
    } catch (error) {
      console.error("Credentials login error:", error)
      return { success: false, message: "Network error" }
    }
  }

  static async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          email: payload.email || `${payload.username}@example.com`,
        }),
      })

      const responseText = await response.text()
      try {
        const data = JSON.parse(responseText)
        return data
      } catch {
        return { success: false, message: "Invalid server response" }
      }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, message: "Network error" }
    }
  }

  static async setAuthCookie(token: string): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/set-cookie`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      })
    } catch (error) {
      console.warn("Failed to set secure cookie:", error)
    }
  }

  static async clearAuthCookie(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/set-cookie`, { method: "DELETE" })
    } catch (error) {
      console.warn("Failed to clear cookie:", error)
    }
  }
}