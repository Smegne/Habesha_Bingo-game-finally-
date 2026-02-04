export interface BingoCard {
  id: number
  card_number: number
  numbers: number[][]
  is_used: boolean
  selected_by?: string
}

export interface CardsResponse {
  cards: BingoCard[]
  totalPages: number
  totalCount: number
  hasMore: boolean
}

export interface CardFetchOptions {
  gameId?: string
  page?: number
  limit?: number
}