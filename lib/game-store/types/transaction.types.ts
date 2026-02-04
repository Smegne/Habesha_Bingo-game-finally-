import { 
  TRANSACTION_STATUS, 
  TRANSACTION_TYPES,
  TRANSACTION_METHODS 
} from "../constants/game.constants"

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS]
export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]
export type PaymentMethod = typeof TRANSACTION_METHODS[number]

export interface Deposit {
  id: string
  odoo: string
  amount: number
  method: PaymentMethod
  status: TransactionStatus
  screenshot_url?: string
  createdAt: string
}

export interface Withdrawal {
  id: string
  odoo: string
  amount: number
  method: PaymentMethod
  accountNumber: string
  status: TransactionStatus
  createdAt: string
}

export interface Transaction {
  id: string
  odoo: string
  amount: number
  type: TransactionType
  description: string
  createdAt: string
}

export interface ApprovalLog {
  id: string
  adminId: string
  action: "approve_deposit" | "reject_deposit" | "approve_withdrawal" | "reject_withdrawal"
  targetId: string
  notes?: string
  createdAt: string
}

export interface DepositRequest {
  amount: number
  method: PaymentMethod
  screenshot?: File
}

export interface WithdrawalRequest {
  amount: number
  method: PaymentMethod
  accountNumber: string
}