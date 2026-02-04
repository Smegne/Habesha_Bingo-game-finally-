import { API_URL } from "../constants/api.constants"
import { getAuthHeaders, handleApiError } from "../utils/api.utils"
import { Deposit, Withdrawal, Transaction, DepositRequest, WithdrawalRequest } from "../types/transaction.types"

export class WalletApiService {
  static async fetchDeposits(userId: string): Promise<Deposit[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/deposits?userId=${userId}`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.deposits || []
      }
      return []
    } catch (error) {
      console.error("Fetch deposits error:", error)
      return []
    }
  }

  static async fetchWithdrawals(userId: string): Promise<Withdrawal[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/withdrawals?userId=${userId}`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.withdrawals || []
      }
      return []
    } catch (error) {
      console.error("Fetch withdrawals error:", error)
      return []
    }
  }

  static async fetchTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/transactions?userId=${userId}&limit=${limit}`, {
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        return data.transactions || []
      }
      return []
    } catch (error) {
      console.error("Fetch transactions error:", error)
      return []
    }
  }

  static async requestDeposit(userId: string, request: DepositRequest): Promise<boolean> {
    try {
      const token = getAuthToken()
      if (!token) return false

      const formData = new FormData()
      formData.append("userId", userId)
      formData.append("amount", request.amount.toString())
      formData.append("method", request.method)
      if (request.screenshot) {
        formData.append("screenshot", request.screenshot)
      }

      const response = await fetch(`${API_URL}/deposits`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      })

      return response.ok
    } catch (error) {
      console.error("Deposit request error:", error)
      return false
    }
  }

  static async requestWithdrawal(userId: string, request: WithdrawalRequest): Promise<boolean> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/withdrawals`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId, ...request }),
      })

      return response.ok
    } catch (error) {
      console.error("Withdrawal request error:", error)
      return false
    }
  }

  static async convertBonus(userId: string): Promise<{ balance: number } | null> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/wallet/convert-bonus`, {
        method: "POST",
        headers,
      })

      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error("Convert bonus error:", error)
      return null
    }
  }
}