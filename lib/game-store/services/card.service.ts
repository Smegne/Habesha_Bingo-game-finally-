import { BOT_USERNAME } from "../constants/api.constants"

export class CardService {
  private availableCards: any[] = []
  private cardsPagination: {
    currentPage: number
    totalPages: number
    totalCards: number
    hasMore: boolean
    isLoading?: boolean
  } | null = null

  // Fetch available cards from API
  async fetchAvailableCards(
    token: string,
    gameId?: string,
    page: number = 1,
    limit: number = 100
  ): Promise<{ 
    cards: any[], 
    pagination: typeof this.cardsPagination 
  }> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
      const url = gameId 
        ? `${API_URL}/games/cards?gameId=${gameId}&page=${page}&limit=${limit}`
        : `${API_URL}/games/cards?page=${page}&limit=${limit}`
      
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (!data.cards || data.cards.length === 0) {
          this.availableCards = []
          this.cardsPagination = null
          return { cards: [], pagination: null }
        }
        
        // Parse numbers properly
        const parsedCards = data.cards.map((card: any) => ({
          ...card,
          numbers: typeof card.numbers === 'string' ? JSON.parse(card.numbers || '[]') : card.numbers,
          card_number: card.card_number || card.id,
          is_used: Boolean(card.is_used),
          isSelected: Boolean(card.is_used),
        }))
        
        this.cardsPagination = {
          currentPage: data.currentPage || page,
          totalPages: data.totalPages || Math.ceil((data.totalCount || parsedCards.length) / limit),
          totalCards: data.totalCount || parsedCards.length,
          hasMore: data.hasMore || false
        }
        
        if (page === 1) {
          this.availableCards = parsedCards
        } else {
          this.availableCards = [...this.availableCards, ...parsedCards]
        }
        
        return { 
          cards: this.availableCards, 
          pagination: this.cardsPagination 
        }
      }
      
      return { cards: [], pagination: null }
    } catch (error) {
      console.error('Fetch cards error:', error)
      return { cards: [], pagination: null }
    }
  }

  // Load more cards
  async loadMoreCards(
    token: string
  ): Promise<{ 
    cards: any[], 
    pagination: typeof this.cardsPagination 
  }> {
    if (!this.cardsPagination?.hasMore) {
      return { cards: this.availableCards, pagination: this.cardsPagination }
    }
    
    const nextPage = this.cardsPagination.currentPage + 1
    
    // Set loading state
    if (this.cardsPagination) {
      this.cardsPagination.isLoading = true
    }
    
    const result = await this.fetchAvailableCards(token, undefined, nextPage, 100)
    
    // Clear loading state
    if (this.cardsPagination) {
      this.cardsPagination.isLoading = false
    }
    
    return result
  }

  // Select a bingo card
  async selectCard(
    token: string,
    cardNumber: number,
    stake: number,
    userId: string
  ): Promise<{ success: boolean; gameId?: string }> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
      const response = await fetch(`${API_URL}/games/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardNumber,
          stake,
          userId,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        return { success: true, gameId: data.data?.gameId }
      }
      
      return { success: false }
    } catch (error) {
      console.error('Select card error:', error)
      return { success: false }
    }
  }

  // Get card by ID or card number
  getCard(cardNumber: number): any | undefined {
    return this.availableCards.find(
      card => card.card_number === cardNumber || card.id === cardNumber
    )
  }

  // Get selected card
  getSelectedCard(): any | null {
    return this.availableCards.find(card => card.isSelected) || null
  }

  // Mark card as selected
  markCardAsSelected(cardNumber: number): void {
    this.availableCards = this.availableCards.map(card => ({
      ...card,
      isSelected: card.card_number === cardNumber || card.id === cardNumber
    }))
  }

  // Reset all cards
  resetCards(): void {
    this.availableCards = this.availableCards.map(card => ({
      ...card,
      isSelected: false
    }))
  }

  // Generate mock cards for testing (if API is not available)
  generateMockCards(count: number = 50): any[] {
    const cards = []
    const ranges = [
      [1, 15],
      [16, 30],
      [31, 45],
      [46, 60],
      [61, 75],
    ]
    
    for (let i = 1; i <= count; i++) {
      const cardNumbers: number[][] = []
      
      for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col]
        const columnNumbers = new Set<number>()
        
        while (columnNumbers.size < 5) {
          const num = Math.floor(Math.random() * (max - min + 1)) + min
          columnNumbers.add(num)
        }
        
        const numbers = Array.from(columnNumbers)
        
        if (col === 0) {
          cardNumbers[0] = [numbers[0], 0, numbers[1], numbers[2], numbers[3]]
        } else if (col === 4) {
          cardNumbers[4] = [numbers[0], numbers[1], numbers[2], numbers[3], 0]
        } else {
          for (let row = 0; row < 5; row++) {
            if (!cardNumbers[row]) cardNumbers[row] = []
            cardNumbers[row][col] = numbers[row]
          }
        }
      }
      
      cards.push({
        id: i,
        card_number: i,
        numbers: cardNumbers,
        is_used: Math.random() > 0.7, // 30% chance of being used
        isSelected: false,
      })
    }
    
    this.availableCards = cards
    this.cardsPagination = {
      currentPage: 1,
      totalPages: 1,
      totalCards: count,
      hasMore: false,
    }
    
    return cards
  }

  // Getters
  getAvailableCards(): any[] {
    return this.availableCards
  }

  getCardsPagination(): typeof this.cardsPagination {
    return this.cardsPagination
  }
}