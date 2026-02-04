import { API_URL } from "../constants/api.constants"
import { getAuthHeaders } from "../utils/api.utils"
import { User, Deposit, Withdrawal, Transaction, ApprovalLog } from "../types"

export class AdminApiService {
  static async fetchUsers(): Promise<User[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/users`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.users || []
      }
      return []
    } catch (error) {
      console.error("Fetch users error:", error)
      return []
    }
  }

  static async fetchAllDeposits(): Promise<Deposit[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/deposits`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.deposits || []
      }
      return []
    } catch (error) {
      console.error("Fetch all deposits error:", error)
      return []
    }
  }

  static async fetchAllWithdrawals(): Promise<Withdrawal[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/withdrawals`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.withdrawals || []
      }
      return []
    } catch (error) {
      console.error("Fetch all withdrawals error:", error)
      return []
    }
  }

  static async fetchApprovalLogs(): Promise<ApprovalLog[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/approval-logs`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.logs || []
      }
      return []
    } catch (error) {
      console.error("Fetch approval logs error:", error)
      return []
    }
  }

  static async fetchCompletedGames(): Promise<any[]> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/games/completed`, { headers })

      if (response.ok) {
        const data = await response.json()
        return data.games || []
      }
      return []
    } catch (error) {
      console.error("Fetch completed games error:", error)
      return []
    }
  }

  static async approveDeposit(depositId: string, notes: string = ""): Promise<boolean> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/deposits/${depositId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ notes }),
      })

      return response.ok
    } catch (error) {
      console.error("Approve deposit error:", error)
      return false
    }
  }

  static async rejectDeposit(depositId: string, notes: string = ""): Promise<boolean> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/deposits/${depositId}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ notes }),
      })

      return response.ok
    } catch (error) {
      console.error("Reject deposit error:", error)
      return false
    }
  }

  static async approveWithdrawal(withdrawalId: string, notes: string = ""): Promise<boolean> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ notes }),
      })

      return response.ok
    } catch (error) {
      console.error("Approve withdrawal error:", error)
      return false
    }
  }

  static async rejectWithdrawal(withdrawalId: string, notes: string = ""): Promise<boolean> {
    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${API_URL}/admin/withdrawals/${withdrawalId}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ notes }),
      })

      return response.ok
    } catch (error) {
      console.error("Reject withdrawal error:", error)
      return false
    }
  }
}