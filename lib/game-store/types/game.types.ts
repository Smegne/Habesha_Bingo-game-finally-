import { GAME_STATUS } from "../constants/game.constants"

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]
export type GameResult = "win" | "loss"

export interface Game {
  id: string
  stake: number
  status: GameStatus
  called_numbers?: number[]
  current_number?: number
  players: string[]
  winner_id?: string
  win_pattern?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface GameHistory {
  id: string
  odoo: string
  odooName: string
  cardId: number
  stake: number
  result: GameResult
  amount: number
  date: string
  winPattern?: string
}

export interface WinCheckResponse {
  win: boolean
  pattern?: string
}

export interface CardSelectionPayload {
  cardNumber: number
  stake: number
  userId: string
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCards: number
  hasMore: boolean
  isLoading?: boolean
}