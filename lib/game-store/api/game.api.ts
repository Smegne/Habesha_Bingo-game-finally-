import { API_URL, DEFAULT_LIMIT } from "../constants/api.constants" // Changed to DEFAULT_LIMIT
import { getAuthHeaders, handleApiError, parseCardNumbers } from "../utils/api.utils"
import { CardsResponse, BingoCard, CardFetchOptions } from "../types/card.types"
import { WinCheckResponse, CardSelectionPayload } from "../types/game.types"

export class GameApiService {
  static async fetchCards(options: CardFetchOptions = {}): Promise<CardsResponse | null> {
    try {
      const { gameId, page = 1, limit = DEFAULT_CARD_LIMIT } = options
      
      // Get authentication token
      const token = localStorage.getItem("token")
      
      if (!token) {
        console.warn("⚠️ No authentication token found in localStorage")
        return null
      }
      
      // Construct URL
      const baseUrl = API_URL
      let url = `${baseUrl}/games/cards?page=${page}&limit=${limit}`
      
      if (gameId) {
        url += `&gameId=${gameId}`
      }
      
      console.log(`🔄 Fetching cards from: ${url}`)
      console.log(`📝 Using token: ${token.substring(0, 20)}...`)
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        credentials: 'include', // Include cookies if needed
      })
      
      clearTimeout(timeoutId)
      
      console.log(`📊 API Response Status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} - ${response.statusText}`)
        
        // Handle specific status codes
        if (response.status === 401) {
          console.error("🔒 Unauthorized - Token might be invalid or expired")
          localStorage.removeItem("token")
        } else if (response.status === 404) {
          console.error("🔍 Endpoint not found - Check API URL")
        } else if (response.status >= 500) {
          console.error("💥 Server error - Backend might be down")
        }
        
        // Try to get error details
        try {
          const errorText = await response.text()
          console.error(`📄 Error response body:`, errorText)
        } catch (e) {
          console.error("Could not read error response")
        }
        
        return null
      }
      
      // Parse response
      let data
      try {
        const responseText = await response.text()
        console.log(`📄 Raw response:`, responseText.substring(0, 200) + '...')
        
        if (!responseText.trim()) {
          console.warn("⚠️ Empty response from server")
          return null
        }
        
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Failed to parse JSON response:", parseError)
        return null
      }
      
      console.log(`✅ Successfully fetched ${data.cards?.length || 0} cards`)
      
      // Process cards
      const processedCards = (data.cards || []).map((card: any, index: number) => {
        try {
          return {
            ...card,
            id: card.id || card.card_number || index + 1,
            card_number: card.card_number || card.id || index + 1,
            numbers: parseCardNumbers(card.numbers),
            is_used: Boolean(card.is_used || card.isSelected || false),
            isSelected: Boolean(card.isSelected || card.is_used || false),
            selected_by: card.selected_by || null,
          }
        } catch (cardError) {
          console.error(`❌ Error processing card ${index}:`, cardError)
          // Return a fallback card
          return {
            id: index + 1,
            card_number: index + 1,
            numbers: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
            is_used: false,
            isSelected: false,
          }
        }
      })
      
      return {
        cards: processedCards,
        totalPages: data.totalPages || 1,
        totalCount: data.totalCount || processedCards.length,
        hasMore: data.hasMore || false,
        currentPage: data.currentPage || page,
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error("⏰ Request timeout - Server is not responding")
      } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.error("🌐 Network error - Check if backend server is running")
        console.error("💡 Make sure your API server is running at:", API_URL)
      } else {
        console.error("❌ Fetch cards error:", error)
      }
      
      // Return mock data for development if API is down
      if (process.env.NODE_ENV === 'development') {
        console.log("🛠️ Returning mock cards for development")
        return this.generateMockCards(page, limit)
      }
      
      return null
    }
  }

  // Generate mock cards for development/testing
  private static generateMockCards(page: number = 1, limit: number = 100): CardsResponse {
    console.log(`🛠️ Generating ${limit} mock cards for page ${page}`)
    
    const cards: BingoCard[] = []
    const totalCount = 400 // Simulate 400 total cards
    const startIndex = (page - 1) * limit
    
    for (let i = 1; i <= limit; i++) {
      const cardId = startIndex + i
      if (cardId > totalCount) break
      
      const cardNumbers = this.generateMockBingoNumbers()
      
      cards.push({
        id: cardId,
        card_number: cardId,
        numbers: cardNumbers,
        is_used: Math.random() > 0.7, // 30% chance of being used
        isSelected: false,
      })
    }
    
    return {
      cards,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasMore: page * limit < totalCount,
      currentPage: page,
    }
  }

  // Generate mock bingo card numbers
  private static generateMockBingoNumbers(): number[][] {
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I
      [31, 45],  // N
      [46, 60],  // G
      [61, 75],  // O
    ]
    
    const card: number[][] = Array(5).fill(null).map(() => Array(5).fill(0))
    
    for (let col = 0; col < 5; col++) {
      const [min, max] = ranges[col]
      const columnNumbers = new Set<number>()
      
      while (columnNumbers.size < 5) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min
        columnNumbers.add(num)
      }
      
      const numbers = Array.from(columnNumbers)
      
      for (let row = 0; row < 5; row++) {
        card[row][col] = numbers[row]
      }
    }
    
    // Free space in center (N column, middle row)
    card[2][2] = 0
    
    return card
  }

  static async selectCard(payload: CardSelectionPayload): Promise<{ success: boolean; data?: { gameId: string } }> {
    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        console.error("❌ No authentication token for selectCard")
        return { success: false }
      }
      
      console.log(`🔄 Selecting card ${payload.cardNumber} with stake ${payload.stake}`)
      
      const response = await fetch(`${API_URL}/games/cards`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      
      console.log(`📊 Select card response: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Card selected successfully, gameId: ${data.data?.gameId}`)
        return { success: true, data: data.data }
      } else {
        console.error(`❌ Select card failed: ${response.status}`)
        return { success: false }
      }
    } catch (error) {
      console.error("❌ Select card error:", error)
      return { success: false }
    }
  }

  static async startGame(gameId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem("token")
      if (!token) return false
      
      console.log(`🔄 Starting game: ${gameId}`)
      
      const response = await fetch(`${API_URL}/games/${gameId}/start`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      })
      
      console.log(`📊 Start game response: ${response.status}`)
      return response.ok
    } catch (error) {
      console.error("❌ Start game error:", error)
      return false
    }
  }

  static async callNumber(gameId: string): Promise<number | null> {
    try {
      const token = localStorage.getItem("token")
      if (!token) return null
      
      console.log(`🔄 Calling number for game: ${gameId}`)
      
      const response = await fetch(`${API_URL}/games/${gameId}/call-number`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Number called: ${data.number}`)
        return data.number
      }
      
      console.error(`❌ Call number failed: ${response.status}`)
      return null
    } catch (error) {
      console.error("❌ Call number error:", error)
      return null
    }
  }

  static async checkWin(gameId: string, payload: {
    userId: string
    markedNumbers: number[]
    cardNumbers: number[][]
  }): Promise<WinCheckResponse | null> {
    try {
      const token = localStorage.getItem("token")
      if (!token) return null
      
      console.log(`🔄 Checking win for game: ${gameId}`)
      
      const response = await fetch(`${API_URL}/games/${gameId}/check-win`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Win check result: ${data.win ? 'WIN!' : 'No win'}`)
        return data
      }
      
      console.error(`❌ Check win failed: ${response.status}`)
      return null
    } catch (error) {
      console.error("❌ Check win error:", error)
      return null
    }
  }

  static async fetchGameHistory(userId: string): Promise<any[]> {
    try {
      const token = localStorage.getItem("token")
      if (!token) return []
      
      console.log(`🔄 Fetching game history for user: ${userId}`)
      
      const response = await fetch(`${API_URL}/games/history?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Fetched ${data.history?.length || 0} history records`)
        return data.history || []
      }
      
      console.error(`❌ Fetch history failed: ${response.status}`)
      return []
    } catch (error) {
      console.error("❌ Fetch game history error:", error)
      return []
    }
  }
}