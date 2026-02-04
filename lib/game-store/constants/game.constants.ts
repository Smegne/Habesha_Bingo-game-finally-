export const GAME_STAKES = [10, 20] as const
export type GameStake = typeof GAME_STAKES[number]

export const TRANSACTION_METHODS = ["telebirr", "cbe"] as const
export type TransactionMethod = typeof TRANSACTION_METHODS[number]

export const GAME_STATUS = {
  WAITING: "waiting",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export const TRANSACTION_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  GAME_WIN: "game_win",
  GAME_LOSS: "game_loss",
  BONUS: "bonus",
} as const

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
} as const