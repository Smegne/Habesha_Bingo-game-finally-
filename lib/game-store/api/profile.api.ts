import { API_URL } from "../constants/api.constants"
import { getAuthHeaders } from "../utils/api.utils"

export class ProfileApiService {
  static async fetchStats(): Promise<{
    activePlayers: number
    gamesPlayed: number
    dailyWinners: number
  }> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/stats/general`, { headers })

      if (response.ok) {
        const data = await response.json()
        return {
          activePlayers: data.activePlayers || 0,
          gamesPlayed: data.gamesPlayed || 0,
          dailyWinners: data.dailyWinners || 0,
        }
      }
      return { activePlayers: 0, gamesPlayed: 0, dailyWinners: 0 }
    } catch (error) {
      console.error("Fetch stats error:", error)
      return { activePlayers: 0, gamesPlayed: 0, dailyWinners: 0 }
    }
  }
}