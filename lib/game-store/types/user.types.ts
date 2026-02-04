import { USER_ROLES } from "../constants/game.constants"

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export interface User {
  id: string
  telegramId: string
  username: string
  firstName: string
  role: UserRole
  balance: number
  bonusBalance: number
  referralCode: string
  isOnline: boolean
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  message: string
  token?: string
  user?: User
  role?: UserRole
  error?: string
}

export interface RegisterPayload {
  telegramId: string
  username: string
  firstName: string
  password: string
  role: UserRole
  referralCode?: string
  email?: string
}