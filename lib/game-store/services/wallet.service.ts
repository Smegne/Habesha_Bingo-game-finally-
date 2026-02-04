import { WalletApiService } from "../api/wallet.api"
import { AdminApiService } from "../api/admin.api"
import { User, Deposit, Withdrawal, Transaction, DepositRequest, WithdrawalRequest } from "../types"

export class WalletService {
  private deposits: Deposit[] = []
  private withdrawals: Withdrawal[] = []
  private transactions: Transaction[] = []
  private approvalLogs: any[] = []

  async fetchUserWalletData(userId: string): Promise<void> {
    const [deposits, withdrawals, transactions] = await Promise.all([
      WalletApiService.fetchDeposits(userId),
      WalletApiService.fetchWithdrawals(userId),
      WalletApiService.fetchTransactions(userId),
    ])

    this.deposits = deposits
    this.withdrawals = withdrawals
    this.transactions = transactions
  }

  async fetchAdminWalletData(): Promise<void> {
    const [deposits, withdrawals, logs] = await Promise.all([
      AdminApiService.fetchAllDeposits(),
      AdminApiService.fetchAllWithdrawals(),
      AdminApiService.fetchApprovalLogs(),
    ])

    this.deposits = deposits
    this.withdrawals = withdrawals
    this.approvalLogs = logs
  }

  async requestDeposit(userId: string, request: DepositRequest): Promise<boolean> {
    const success = await WalletApiService.requestDeposit(userId, request)
    
    if (success) {
      // Refresh data after a short delay
      setTimeout(() => this.fetchUserWalletData(userId), 1000)
    }
    
    return success
  }

  async requestWithdrawal(userId: string, request: WithdrawalRequest): Promise<boolean> {
    const success = await WalletApiService.requestWithdrawal(userId, request)
    
    if (success) {
      setTimeout(() => this.fetchUserWalletData(userId), 1000)
    }
    
    return success
  }

  async convertBonus(userId: string): Promise<boolean> {
    const result = await WalletApiService.convertBonus(userId)
    
    if (result) {
      setTimeout(() => this.fetchUserWalletData(userId), 1000)
      return true
    }
    
    return false
  }

  async approveDeposit(depositId: string, notes: string = ""): Promise<boolean> {
    const success = await AdminApiService.approveDeposit(depositId, notes)
    
    if (success) {
      setTimeout(() => this.fetchAdminWalletData(), 500)
    }
    
    return success
  }

  async rejectDeposit(depositId: string, notes: string = ""): Promise<boolean> {
    const success = await AdminApiService.rejectDeposit(depositId, notes)
    
    if (success) {
      this.fetchAdminWalletData()
    }
    
    return success
  }

  async approveWithdrawal(withdrawalId: string, notes: string = ""): Promise<boolean> {
    const success = await AdminApiService.approveWithdrawal(withdrawalId, notes)
    
    if (success) {
      this.fetchAdminWalletData()
    }
    
    return success
  }

  async rejectWithdrawal(withdrawalId: string, notes: string = ""): Promise<boolean> {
    const success = await AdminApiService.rejectWithdrawal(withdrawalId, notes)
    
    if (success) {
      this.fetchAdminWalletData()
    }
    
    return success
  }

  // Getters
  getDeposits(): Deposit[] {
    return this.deposits
  }

  getWithdrawals(): Withdrawal[] {
    return this.withdrawals
  }

  getTransactions(): Transaction[] {
    return this.transactions
  }

  getApprovalLogs(): any[] {
    return this.approvalLogs
  }
}