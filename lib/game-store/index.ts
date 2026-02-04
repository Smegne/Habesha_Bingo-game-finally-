"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_KEY } from "./constants/api.constants"
import { 
  User, 
  Game, 
  BingoCard,
  GameHistory,
  Deposit,
  Withdrawal,
  Transaction,
  ApprovalLog,
  PaginationInfo,
  UserRole,
  PaymentMethod
} from "./types"
import { AuthService } from "./services/auth.service"
import { GameService } from "./services/game.service"
import { WalletService } from "./services/wallet.service"
import { AdminService } from "./services/admin.service"
import { SocketService } from "./services/socket.service"

// Initialize services
const authService = new AuthService()
const gameService = new GameService()
const walletService = new WalletService()
const adminService = new AdminService()
const socketService = new SocketService()

// Define the interface
export interface GameStoreState {
  // State
  user: User | null;
  isLoggedIn: boolean;
  currentTab: "game" | "scores" | "history" | "wallet" | "profile";
  showRules: boolean;
  selectedCard: BingoCard | null;
  currentGame: Game | null;
  markedNumbers: Set<number>;
  availableCards: BingoCard[];
  gameHistory: GameHistory[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  allUsers: User[];
  approvalLogs: ApprovalLog[];
  completedGames: Game[];
  activePlayers: number;
  gamesPlayed: number;
  dailyWinners: number;
  socket: any | null;
  cardsPagination: PaginationInfo | null;
  
  // Actions
  initializeTelegramAuth: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string; role?: string }>;
  logout: () => void;
  setTab: (tab: "game" | "scores" | "history" | "wallet" | "profile") => void;
  toggleRules: () => void;
  
  // Game Actions
  fetchAvailableCards: (gameId?: string, page?: number, limit?: number) => Promise<void>;
  selectCard: (cardNumber: number, stake: number) => Promise<boolean>;
  startGame: (gameId: string) => Promise<boolean>;
  callNumber: (gameId: string) => Promise<number | null>;
  markNumber: (number: number) => void;
  checkWin: (gameId: string) => Promise<{ win: boolean; pattern?: string }>;
  loadMoreCards: () => Promise<void>;
  
  // Wallet Actions
  fetchWalletData: () => Promise<void>;
  requestDeposit: (amount: number, method: string, screenshot?: File) => Promise<boolean>;
  requestWithdrawal: (amount: number, method: string, accountNumber: string) => Promise<boolean>;
  convertBonus: () => Promise<boolean>;
  
  // Profile Actions
  fetchProfileData: () => Promise<void>;
  getReferralLink: () => string;
  
  // Admin Actions
  fetchAdminData: () => Promise<void>;
  approveDeposit: (depositId: string, notes?: string) => Promise<boolean>;
  rejectDeposit: (depositId: string, notes?: string) => Promise<boolean>;
  approveWithdrawal: (withdrawalId: string, notes?: string) => Promise<boolean>;
  rejectWithdrawal: (withdrawalId: string, notes?: string) => Promise<boolean>;
  
  // Socket Connection
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
  
  // Registration
  register: (
    telegramId: string, 
    username: string, 
    firstName: string, 
    password: string, 
    role: UserRole, 
    referralCode?: string,
    email?: string
  ) => Promise<{ success: boolean; message: string }>;
}

// Create and export the store
export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: authService.getCurrentUser(),
      isLoggedIn: authService.isLoggedIn(),
      selectedCard: gameService.getSelectedCard(),
      currentGame: gameService.getCurrentGame(),
      markedNumbers: gameService.getMarkedNumbers(),
      availableCards: gameService.getAvailableCards(),
      gameHistory: gameService.getGameHistory(),
      completedGames: gameService.getCompletedGames(),
      cardsPagination: gameService.getCardsPagination(),
      deposits: walletService.getDeposits(),
      withdrawals: walletService.getWithdrawals(),
      transactions: walletService.getTransactions(),
      allUsers: adminService.getAllUsers(),
      approvalLogs: walletService.getApprovalLogs(),
      activePlayers: gameService.getStats().activePlayers,
      gamesPlayed: gameService.getStats().gamesPlayed,
      dailyWinners: gameService.getStats().dailyWinners,
      currentTab: "game",
      showRules: false,
      socket: null,

      // Auth actions
      initializeTelegramAuth: async () => {
        const success = await authService.initializeTelegramAuth()
        if (success) {
          const user = authService.getCurrentUser()
          if (user) {
            set({ user, isLoggedIn: true })
            
            // Initialize other services
            await get().fetchAvailableCards()
            await get().fetchWalletData()
            await get().fetchProfileData()
            
            if (user.role === "admin") {
              await get().fetchAdminData()
            }
            
            await get().connectSocket()
          }
        }
        return success
      },

      login: async (username, password) => {
        const response = await authService.login(username, password)
        
        if (response.success) {
          const user = authService.getCurrentUser()
          set({ user, isLoggedIn: true })
          
          await get().fetchAvailableCards()
          await get().fetchWalletData()
          await get().fetchProfileData()
          
          if (user?.role === "admin") {
            await get().fetchAdminData()
          }
          
          await get().connectSocket()
        }
        
        return response
      },

      logout: () => {
        authService.logout()
        gameService.resetGame()
        get().disconnectSocket()
        
        set({
          user: null,
          isLoggedIn: false,
          selectedCard: null,
          currentGame: null,
          markedNumbers: new Set([0]),
          availableCards: [],
          gameHistory: [],
          deposits: [],
          withdrawals: [],
          transactions: [],
          cardsPagination: null,
        })
      },

      setTab: (tab) => set({ currentTab: tab }),

      toggleRules: () => set((state) => ({ showRules: !state.showRules })),

      register: async (telegramId, username, firstName, password, role, referralCode, email) => {
        return await authService.register({
          telegramId,
          username,
          firstName,
          password,
          role,
          referralCode,
          email,
        })
      },

      getReferralLink: () => authService.getReferralLink(),

      // Game actions - UPDATED with token handling
      fetchAvailableCards: async (gameId?: string, page: number = 1, limit: number = 100) => {
        try {
          const token = localStorage.getItem("token")
          if (!token) {
            console.log('No token found, skipping fetchAvailableCards')
            return
          }
          
          // Fetch cards through service
          await gameService.fetchAvailableCards(token, { gameId, page, limit })
          
          set({
            availableCards: gameService.getAvailableCards(),
            cardsPagination: gameService.getCardsPagination(),
          })
        } catch (error) {
          console.error('Fetch cards error:', error)
        }
      },

      loadMoreCards: async () => {
        try {
          const token = localStorage.getItem("token")
          if (!token) {
            console.log('No token found, skipping loadMoreCards')
            return
          }
          
          const { cardsPagination } = get()
          if (!cardsPagination?.hasMore) {
            console.log('No more cards to load')
            return
          }
          
          // Set loading state
          set((state) => ({
            cardsPagination: state.cardsPagination ? {
              ...state.cardsPagination,
              isLoading: true
            } : null
          }))
          
          // Load more cards through service
          await gameService.loadMoreCards(token)
          
          set({
            availableCards: gameService.getAvailableCards(),
            cardsPagination: gameService.getCardsPagination(),
          })
        } catch (error) {
          console.error('Load more cards error:', error)
          set((state) => ({
            cardsPagination: state.cardsPagination ? {
              ...state.cardsPagination,
              isLoading: false
            } : null
          }))
        }
      },

      selectCard: async (cardNumber, stake) => {
        try {
          const token = localStorage.getItem("token")
          const user = get().user
          
          if (!token || !user) {
            console.error('No token or user when selecting card')
            return false
          }
          
          if (user.balance < stake) {
            console.error('Insufficient balance')
            return false
          }
          
          const success = await gameService.selectCard(token, cardNumber, stake, user.id)
          if (success) {
            set({
              selectedCard: gameService.getSelectedCard(),
              currentGame: gameService.getCurrentGame(),
              user: user ? { ...user, balance: user.balance - stake } : null,
            })
            console.log('Card selected successfully:', cardNumber)
            return true
          }
        } catch (error) {
          console.error('Select card error:', error)
        }
        return false
      },

      startGame: async (gameId) => {
        const success = await gameService.startGame(gameId)
        if (success) {
          set({ currentGame: gameService.getCurrentGame() })
          console.log('Game started:', gameId)
        }
        return success
      },

      callNumber: async (gameId) => {
        const number = await gameService.callNumber(gameId)
        if (number !== null) {
          const { selectedCard, markedNumbers } = get()
          if (selectedCard && selectedCard.numbers.flat().includes(number)) {
            const newMarked = new Set(markedNumbers)
            newMarked.add(number)
            set({ markedNumbers: newMarked })
          }
          
          set({
            currentGame: gameService.getCurrentGame(),
            activePlayers: gameService.getStats().activePlayers,
          })
          console.log('Number called:', number)
        }
        return number
      },

      markNumber: (number) => {
        gameService.markNumber(number)
        set({ markedNumbers: gameService.getMarkedNumbers() })
        console.log('Number marked:', number)
      },

      checkWin: async (gameId) => {
        try {
          const user = get().user
          if (!user) return { win: false }

          const result = await gameService.checkWin(gameId, user.id)
          
          if (result.win) {
            const winAmount = (get().currentGame?.stake || 10) * 5
            set({
              user: user ? { ...user, balance: user.balance + winAmount } : null,
              currentGame: gameService.getCurrentGame(),
              selectedCard: gameService.getSelectedCard(),
              markedNumbers: gameService.getMarkedNumbers(),
              gameHistory: gameService.getGameHistory(),
              completedGames: gameService.getCompletedGames(),
              dailyWinners: gameService.getStats().dailyWinners,
              gamesPlayed: gameService.getStats().gamesPlayed,
            })
            console.log('BINGO! Win detected:', result.pattern)
          }
          
          return result
        } catch (error) {
          console.error('Check win error:', error)
          return { win: false }
        }
      },

      // Wallet actions
      fetchWalletData: async () => {
        try {
          const token = localStorage.getItem("token")
          const user = get().user
          
          if (!token || !user) {
            console.log('No token or user, skipping fetchWalletData')
            return
          }
          
          await walletService.fetchUserWalletData(user.id)
          set({
            deposits: walletService.getDeposits(),
            withdrawals: walletService.getWithdrawals(),
            transactions: walletService.getTransactions(),
          })
        } catch (error) {
          console.error('Fetch wallet error:', error)
        }
      },

      requestDeposit: async (amount, method, screenshot) => {
        try {
          const token = localStorage.getItem("token")
          const user = get().user
          
          if (!token || !user) {
            console.error('No token or user for deposit request')
            return false
          }
          
          const success = await walletService.requestDeposit(user.id, {
            amount,
            method: method as PaymentMethod,
            screenshot,
          })
          
          if (success) {
            console.log('Deposit request submitted:', amount, method)
            setTimeout(() => get().fetchWalletData(), 1000)
            return true
          }
        } catch (error) {
          console.error('Deposit request error:', error)
        }
        return false
      },

      requestWithdrawal: async (amount, method, accountNumber) => {
        try {
          const token = localStorage.getItem("token")
          const user = get().user
          
          if (!token || !user) {
            console.error('No token or user for withdrawal request')
            return false
          }
          
          if (user.balance < amount) {
            console.error('Insufficient balance for withdrawal')
            return false
          }
          
          const success = await walletService.requestWithdrawal(user.id, {
            amount,
            method: method as PaymentMethod,
            accountNumber,
          })
          
          if (success) {
            console.log('Withdrawal request submitted:', amount, method)
            set({
              user: user ? { ...user, balance: user.balance - amount } : null,
            })
            setTimeout(() => get().fetchWalletData(), 1000)
            return true
          }
        } catch (error) {
          console.error('Withdrawal request error:', error)
        }
        return false
      },

      convertBonus: async () => {
        try {
          const token = localStorage.getItem("token")
          const user = get().user
          
          if (!token || !user) return false
          
          const success = await walletService.convertBonus(user.id)
          if (success) {
            set({
              user: user ? { ...user, bonusBalance: 0 } : null,
            })
            console.log('Bonus converted to main balance')
            get().fetchWalletData()
            return true
          }
        } catch (error) {
          console.error('Convert bonus error:', error)
        }
        return false
      },

      // Profile actions
      fetchProfileData: async () => {
        try {
          const token = localStorage.getItem("token")
          const user = get().user
          
          if (!token || !user) {
            console.log('No token or user, skipping fetchProfileData')
            return
          }
          
          await Promise.all([
            gameService.fetchGameHistory(user.id),
            gameService.fetchStats(),
          ])
          
          set({
            gameHistory: gameService.getGameHistory(),
            activePlayers: gameService.getStats().activePlayers,
            gamesPlayed: gameService.getStats().gamesPlayed,
            dailyWinners: gameService.getStats().dailyWinners,
          })
        } catch (error) {
          console.error('Fetch profile error:', error)
        }
      },

      // Admin actions
      fetchAdminData: async () => {
        try {
          const token = localStorage.getItem("token")
          if (!token) {
            console.log('No token, skipping fetchAdminData')
            return
          }
          
          await Promise.all([
            adminService.fetchAdminData(),
            walletService.fetchAdminWalletData(),
          ])
          
          set({
            allUsers: adminService.getAllUsers(),
            completedGames: adminService.getCompletedGames(),
            deposits: walletService.getDeposits(),
            withdrawals: walletService.getWithdrawals(),
            approvalLogs: walletService.getApprovalLogs(),
          })
        } catch (error) {
          console.error('Fetch admin data error:', error)
        }
      },

      approveDeposit: async (depositId, notes = '') => {
        try {
          const token = localStorage.getItem("token")
          if (!token) return false
          
          const success = await walletService.approveDeposit(depositId, notes)
          if (success) {
            console.log('Deposit approved:', depositId)
            setTimeout(() => get().fetchAdminData(), 500)
            return true
          }
        } catch (error) {
          console.error('Approve deposit error:', error)
        }
        return false
      },

      rejectDeposit: async (depositId, notes = '') => {
        try {
          const token = localStorage.getItem("token")
          if (!token) return false
          
          const success = await walletService.rejectDeposit(depositId, notes)
          if (success) {
            console.log('Deposit rejected:', depositId)
            get().fetchAdminData()
            return true
          }
        } catch (error) {
          console.error('Reject deposit error:', error)
        }
        return false
      },

      approveWithdrawal: async (withdrawalId, notes = '') => {
        try {
          const token = localStorage.getItem("token")
          if (!token) return false
          
          const success = await walletService.approveWithdrawal(withdrawalId, notes)
          if (success) {
            console.log('Withdrawal approved:', withdrawalId)
            get().fetchAdminData()
            return true
          }
        } catch (error) {
          console.error('Approve withdrawal error:', error)
        }
        return false
      },

      rejectWithdrawal: async (withdrawalId, notes = '') => {
        try {
          const token = localStorage.getItem("token")
          if (!token) return false
          
          const success = await walletService.rejectWithdrawal(withdrawalId, notes)
          if (success) {
            console.log('Withdrawal rejected:', withdrawalId)
            get().fetchAdminData()
            return true
          }
        } catch (error) {
          console.error('Reject withdrawal error:', error)
        }
        return false
      },

      // Socket actions
      connectSocket: async () => {
        try {
          const token = localStorage.getItem("token")
          if (!token) {
            console.log('No token, skipping socket connection')
            return
          }
          
          if (get().socket) {
            console.log('Socket already connected')
            return
          }
          
          const socket = socketService.connect(token)
          
          socketService.setupEventHandlers({
            onConnect: () => console.log("Socket connected successfully"),
            onConnectError: (error) => console.error("Socket connection error:", error),
            onDisconnect: (reason) => {
              console.log("Socket disconnected:", reason)
              if (reason === "io server disconnect") {
                socket.connect()
              }
            },
            onGameState: (data) => {
              set({
                currentGame: data.game,
                markedNumbers: new Set(data.markedNumbers || [0]),
              })
            },
            onNumberCalled: (data) => {
              const { currentGame, selectedCard, markedNumbers } = get()
              
              if (currentGame && selectedCard) {
                const cardNumbers = selectedCard.numbers.flat()
                if (cardNumbers.includes(data.number)) {
                  const newMarked = new Set(markedNumbers)
                  newMarked.add(data.number)
                  set({ markedNumbers: newMarked })
                }
                
                set({
                  currentGame: {
                    ...currentGame,
                    called_numbers: [...(currentGame.called_numbers || []), data.number],
                    current_number: data.number,
                  },
                })
              }
            },
            onWinner: (data) => {
              console.log('Winner announcement:', data.winnerName)
              
              const user = get().user
              if (user && data.winnerId === user.id) {
                set({
                  user: { ...user, balance: user.balance + data.winAmount },
                })
              }
              
              set({
                currentGame: null,
                selectedCard: null,
                markedNumbers: new Set([0]),
              })
            },
            onGameStarted: (data) => {
              console.log('Game started via socket')
              set((state) => ({
                currentGame: state.currentGame 
                  ? { 
                      ...state.currentGame, 
                      status: "in_progress", 
                      started_at: data.startedAt 
                    }
                  : null,
              }))
            },
            onPlayerJoined: (data) => {
              console.log('Player joined:', data.userId)
              set((state) => ({
                currentGame: state.currentGame 
                  ? { 
                      ...state.currentGame, 
                      players: [...state.currentGame.players, data.userId] 
                    }
                  : null,
              }))
            },
          })

          set({ socket })
          
        } catch (error) {
          console.error('Socket connection error:', error)
        }
      },

      disconnectSocket: () => {
        const { socket } = get()
        if (socket) {
          console.log('Disconnecting socket')
          socketService.disconnect()
          set({ socket: null })
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        currentTab: state.currentTab,
      }),
    }
  )
)

// Export types for convenience
export type { 
  User, 
  BingoCard, 
  Game, 
  GameHistory, 
  Deposit, 
  Withdrawal, 
  Transaction, 
  ApprovalLog 
}