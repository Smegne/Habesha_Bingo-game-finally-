import { GameApiService } from "../api/game.api"
import { ProfileApiService } from "../api/profile.api"
import { INITIAL_CARD_LIMIT, LOAD_MORE_LIMIT } from "../constants/api.constants"
import { 
  BingoCard, 
  Game, 
  GameHistory, 
  PaginationInfo,
  CardFetchOptions,
  WinCheckResponse
} from "../types"

export class GameService {
  private selectedCard: BingoCard | null = null
  private currentGame: Game | null = null
  private markedNumbers: Set<number> = new Set([0])
  private availableCards: BingoCard[] = []
  private gameHistory: GameHistory[] = []
  private completedGames: Game[] = []
  private cardsPagination: PaginationInfo | null = null
  private stats = {
    activePlayers: 0,
    gamesPlayed: 0,
    dailyWinners: 0,
  }

  // Cards management
  async fetchAvailableCards(options: CardFetchOptions = {}): Promise<void> {
    const { gameId, page = 1 } = options
    const limit = page === 1 ? INITIAL_CARD_LIMIT : LOAD_MORE_LIMIT

    const response = await GameApiService.fetchCards({ gameId, page, limit })
    
    if (response) {
      const limitedCards = response.cards.slice(0, 50) // Temporary limit for performance
      
      this.cardsPagination = {
        currentPage: page,
        totalPages: response.totalPages,
        totalCards: response.totalCount,
        hasMore: response.hasMore,
      }
      
      if (page === 1) {
        this.availableCards = limitedCards
      } else {
        this.availableCards = [...this.availableCards, ...limitedCards]
      }
    }
  }

  async loadMoreCards(): Promise<void> {
    if (!this.cardsPagination?.hasMore) return

    const nextPage = this.cardsPagination.currentPage + 1
    
    this.setPaginationLoading(true)
    
    await this.fetchAvailableCards({ page: nextPage, limit: LOAD_MORE_LIMIT })
    
    this.setPaginationLoading(false)
  }

  async selectCard(cardNumber: number, stake: number, userId: string): Promise<boolean> {
    const response = await GameApiService.selectCard({ cardNumber, stake, userId })
    
    if (response.success && response.data) {
      // Fetch the selected card details
      const cardsResponse = await GameApiService.fetchCards({ 
        gameId: response.data.gameId 
      })
      
      if (cardsResponse) {
        const selectedCard = cardsResponse.cards.find(
          c => c.card_number === cardNumber || c.id === cardNumber
        )
        
        if (selectedCard) {
          this.selectedCard = selectedCard
          this.currentGame = {
            id: response.data.gameId,
            stake,
            status: "waiting",
            players: [userId],
            created_at: new Date().toISOString(),
          }
          return true
        }
      }
    }
    
    return false
  }

  async startGame(gameId: string): Promise<boolean> {
    const success = await GameApiService.startGame(gameId)
    
    if (success && this.currentGame) {
      this.currentGame.status = "in_progress"
      this.currentGame.started_at = new Date().toISOString()
    }
    
    return success
  }

  async callNumber(gameId: string): Promise<number | null> {
    const number = await GameApiService.callNumber(gameId)
    
    if (number && this.currentGame) {
      // Add to called numbers
      const calledNumbers = this.currentGame.called_numbers || []
      this.currentGame.called_numbers = [...calledNumbers, number]
      this.currentGame.current_number = number
      
      // Check if this number is on our card
      if (this.selectedCard && this.selectedCard.numbers.flat().includes(number)) {
        this.markNumber(number)
      }
    }
    
    return number
  }

  markNumber(number: number): void {
    if (this.currentGame?.status !== "in_progress") return
    
    this.markedNumbers.add(number)
  }

  async checkWin(gameId: string, userId: string): Promise<WinCheckResponse> {
    if (!this.selectedCard) return { win: false }

    const response = await GameApiService.checkWin(gameId, {
      userId,
      markedNumbers: Array.from(this.markedNumbers),
      cardNumbers: this.selectedCard.numbers,
    })

    if (response?.win) {
      this.completeGame(userId, response.pattern)
    }

    return response || { win: false }
  }

  private completeGame(winnerId: string, winPattern?: string): void {
    if (!this.currentGame || !this.selectedCard) return

    this.currentGame.status = "completed"
    this.currentGame.winner_id = winnerId
    this.currentGame.win_pattern = winPattern
    this.currentGame.completed_at = new Date().toISOString()

    // Add to completed games
    this.completedGames.push({ ...this.currentGame })

    // Reset for next game
    this.selectedCard = null
    this.currentGame = null
    this.markedNumbers.clear()
    this.markedNumbers.add(0) // Free space
  }

  async fetchStats(): Promise<void> {
    const stats = await ProfileApiService.fetchStats()
    this.stats = stats
  }

  async fetchGameHistory(userId: string): Promise<void> {
    const history = await GameApiService.fetchGameHistory(userId)
    this.gameHistory = history
  }

  // Getters
  getSelectedCard(): BingoCard | null {
    return this.selectedCard
  }

  getCurrentGame(): Game | null {
    return this.currentGame
  }

  getMarkedNumbers(): Set<number> {
    return this.markedNumbers
  }

  getAvailableCards(): BingoCard[] {
    return this.availableCards
  }

  getGameHistory(): GameHistory[] {
    return this.gameHistory
  }

  getCompletedGames(): Game[] {
    return this.completedGames
  }

  getCardsPagination(): PaginationInfo | null {
    return this.cardsPagination
  }

  getStats() {
    return this.stats
  }

  // Setters
  setSelectedCard(card: BingoCard | null): void {
    this.selectedCard = card
  }

  setCurrentGame(game: Game | null): void {
    this.currentGame = game
  }

  setMarkedNumbers(numbers: Set<number>): void {
    this.markedNumbers = numbers
  }

  private setPaginationLoading(isLoading: boolean): void {
    if (this.cardsPagination) {
      this.cardsPagination.isLoading = isLoading
    }
  }

  resetGame(): void {
    this.selectedCard = null
    this.currentGame = null
    this.markedNumbers.clear()
    this.markedNumbers.add(0)
  }
}