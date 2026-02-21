import { create } from "zustand";
import { persist } from "zustand/middleware";

// Change this line:


// To this:
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return "https://habeshabingo.devvoltz.com/api";
  }
  
  // Check if we're in Telegram WebApp or regular web
  const isTelegram = window.Telegram?.WebApp || 
                     window.location.search.includes('tgWebApp') ||
                     window.location.hash.includes('tgWebApp');
  
  // Use current origin for Telegram, localhost for dev
  return isTelegram 
    ? `${window.location.origin}/api`
    : "https://habeshabingo.devvoltz.com/api";
};

const API_URL = getApiUrl();

interface ApiStore {
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
  cardsPagination: {
    currentPage: number;
    totalPages: number;
    totalCards: number;
    hasMore: boolean;
  } | null;
  
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
    role: "user" | "admin", 
    referralCode?: string,
    email?: string
  ) => Promise<{ success: boolean; message: string }>;
}
// In game-store.ts, add this function:
refreshCardStatus: async (cardId: number) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const response = await fetch(`${API_URL}/games/cards/${cardId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Update the specific card in availableCards
      set((state) => ({
        availableCards: state.availableCards.map(card => 
          card.id === cardId || card.card_number === cardId
            ? { ...card, ...data.card, is_used: Boolean(data.card.is_used) }
            : card
        ),
      }));
    }
  } catch (error) {
    console.error('Refresh card status error:', error);
  }
}

interface User {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  role: "user" | "admin";
  balance: number;
  bonusBalance: number;
  referralCode: string;
  isOnline: boolean;
  createdAt: string;
}

interface BingoCard {
  id: number;
  card_number: number;
  numbers: number[][];
  is_used: boolean;
  selected_by?: string;
}

interface Game {
  id: string;
  stake: number;
  status: "waiting" | "in_progress" | "completed";
  called_numbers?: number[];
  current_number?: number;
  players: string[];
  winner_id?: string;
  win_pattern?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface GameHistory {
  id: string;
  odoo: string;
  odooName: string;
  cardId: number;
  stake: number;
  result: "win" | "loss";
  amount: number;
  date: string;
  winPattern?: string;
}

interface Deposit {
  id: string;
  odoo: string;
  amount: number;
  method: string;
  status: "pending" | "approved" | "rejected";
  screenshot_url?: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  odoo: string;
  amount: number;
  method: string;
  accountNumber: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Transaction {
  id: string;
  odoo: string;
  amount: number;
  type: "deposit" | "withdrawal" | "game_win" | "game_loss" | "bonus";
  description: string;
  createdAt: string;
}

interface ApprovalLog {
  id: string;
  adminId: string;
  action: "approve_deposit" | "reject_deposit" | "approve_withdrawal" | "reject_withdrawal";
  targetId: string;
  notes?: string;
  createdAt: string;
}

export const useGameStore = create<ApiStore>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isLoggedIn: false,
      currentTab: "game",
      showRules: false,
      selectedCard: null,
      currentGame: null,
      markedNumbers: new Set([0]), // Free space
      availableCards: [],
      gameHistory: [],
      deposits: [],
      withdrawals: [],
      transactions: [],
      allUsers: [],
      approvalLogs: [],
      completedGames: [],
      activePlayers: 0,
      gamesPlayed: 0,
      dailyWinners: 0,
      socket: null,
      cardsPagination: null,
      
      // Telegram Mini App Authentication
      initializeTelegramAuth: async () => {
        try {
          if (typeof window === 'undefined') {
            return false;
          }
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const tgWebAppDataFromHash = hashParams.get('tgWebAppData');
          
          const urlParams = new URLSearchParams(window.location.search);
          const tgWebAppDataFromUrl = urlParams.get('tgWebAppData');
          
          const tgWebAppData = tgWebAppDataFromHash || tgWebAppDataFromUrl;
          
          if (tgWebAppData) {
            const apiUrl = `${window.location.origin}/api/auth/telegram`;
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json',
              },
              body: JSON.stringify({ 
                tgWebAppData,
                source: 'telegram'
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.success) {
                localStorage.setItem('token', data.token);
                
                set({ 
                  user: data.user, 
                  isLoggedIn: true,
                  markedNumbers: new Set([0])
                });
                
                get().fetchAvailableCards();
                get().fetchWalletData();
                get().fetchProfileData();
                
                if (data.user?.role === 'admin') {
                  get().fetchAdminData();
                }
                
                get().connectSocket();
                
                return true;
              }
            }
          }
          
          if ((window as any).Telegram?.WebApp) {
            const tg = (window as any).Telegram.WebApp;
            
            if (tg.initData) {
              const apiUrl = `${window.location.origin}/api/auth/telegram`;
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({ 
                  initData: tg.initData,
                  source: 'telegram',
                  platform: tg.platform,
                  version: tg.version,
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  localStorage.setItem('token', data.token);
                  set({ 
                    user: data.user, 
                    isLoggedIn: true,
                    markedNumbers: new Set([0])
                  });
                  
                  get().fetchAvailableCards();
                  get().fetchWalletData();
                  get().fetchProfileData();
                  
                  if (data.user.role === 'admin') {
                    get().fetchAdminData();
                  }
                  
                  get().connectSocket();
                  
                  return true;
                }
              }
            }
          }
          
          return false;
        } catch (error) {
          console.error('Telegram auth error:', error);
          return false;
        }
      },
      
      // Regular login
      login: async (username, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/telegram`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ 
              username, 
              password,
              source: 'web' 
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
              localStorage.setItem('token', data.token);
              
              try {
                await fetch(`${API_URL}/auth/set-cookie`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.token}` 
                  },
                });
              } catch (cookieError) {
                console.warn('Failed to set secure cookie:', cookieError);
              }
              
              set({ 
                user: data.user, 
                isLoggedIn: true,
                markedNumbers: new Set([0])
              });
              
              get().fetchAvailableCards();
              get().fetchWalletData();
              get().fetchProfileData();
              
              if (data.user.role === 'admin') {
                get().fetchAdminData();
              }
              
              get().connectSocket();
              
              return { 
                success: true, 
                message: 'Login successful!',
                role: data.user.role
              };
            } else {
              return { 
                success: false, 
                message: data.error || 'Login failed' 
              };
            }
          } else {
            const errorData = await response.json();
            return { 
              success: false, 
              message: errorData.error || 'Login failed' 
            };
          }
        } catch (error) {
          console.error('Login error:', error);
          return { 
            success: false, 
            message: 'Network error. Please check your connection.' 
          };
        }
      },
      
      // Logout
      logout: () => {
        localStorage.removeItem('token');
        
        fetch(`${API_URL}/auth/set-cookie`, {
          method: 'DELETE',
        }).catch(err => console.warn('Failed to clear cookie:', err));
        
        get().disconnectSocket();
        
        set({
          user: null,
          isLoggedIn: false,
          currentGame: null,
          selectedCard: null,
          markedNumbers: new Set(),
          availableCards: [],
          gameHistory: [],
          deposits: [],
          withdrawals: [],
          transactions: [],
          cardsPagination: null,
        });
        
        console.log('User logged out');
      },
      
      setTab: (tab) => set({ currentTab: tab }),
      
      toggleRules: () => set((state) => ({ showRules: !state.showRules })),
      
      // Registration
      register: async (
        telegramId, 
        username, 
        firstName, 
        password, 
        role, 
        referralCode,
        email
      ) => {
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              telegramId,
              username,
              firstName,
              password,
              role,
              referralCode: referralCode || '',
              email: email || `${username}@example.com`,
            }),
          });

          const responseText = await response.text();
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse registration response:', parseError);
            return { 
              success: false, 
              message: 'Invalid server response' 
            };
          }
          
          if (response.ok && data.success) {
            const loginResult = await get().login(username, password);
            
            if (loginResult.success) {
              return { 
                success: true, 
                message: data.message || 'Registration successful! Welcome to Habesha Bingo!' 
              };
            } else {
              return { 
                success: false, 
                message: 'Registration successful but automatic login failed. Please login manually.' 
              };
            }
          } else {
            return { 
              success: false, 
              message: data.error || 'Registration failed. Please try again.' 
            };
          }
        } catch (error) {
          console.error('Registration error:', error);
          return { 
            success: false, 
            message: 'Network error. Please check your connection and try again.' 
          };
        }
      },
      
      // Fetch available bingo cards - FIXED VERSION
      fetchAvailableCards: async (gameId?: string, page?: number, limit?: number) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.log('No token found, skipping fetchAvailableCards');
            return;
          }
          
          // Use default values
          const pageNum = page || 1;
          const limitNum = limit || 100; // Default to 100 cards per page
          
          const url = gameId 
            ? `${API_URL}/games/cards?gameId=${gameId}&page=${pageNum}&limit=${limitNum}`
            : `${API_URL}/games/cards?page=${pageNum}&limit=${limitNum}`;
          
          console.log(`Fetching cards: page=${pageNum}, limit=${limitNum}`);
          
          const response = await fetch(url, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Fetched ${data.cards?.length || 0} cards for page ${pageNum}`);
            
            if (!data.cards || data.cards.length === 0) {
              console.log('No cards available');
              set({ 
                availableCards: [],
                cardsPagination: null
              });
              return;
            }
            
            // Parse numbers properly
            const parsedCards = data.cards.map((card: any) => ({
              ...card,
              numbers: typeof card.numbers === 'string' ? JSON.parse(card.numbers || '[]') : card.numbers,
              card_number: card.card_number || card.id,
              is_used: Boolean(card.is_used),
              isSelected: Boolean(card.is_used),
            }));
            
            const paginationInfo = {
              currentPage: data.currentPage || pageNum,
              totalPages: data.totalPages || Math.ceil((data.totalCount || parsedCards.length) / limitNum),
              totalCards: data.totalCount || parsedCards.length,
              hasMore: data.hasMore || false
            };
            
            set({ 
              availableCards: parsedCards, // NO 50-CARD LIMIT
              cardsPagination: paginationInfo
            });
            
            console.log(`Loaded ${parsedCards.length} cards for page ${pageNum}`);
          } else if (response.status === 401) {
            get().logout();
          } else {
            console.error('Failed to fetch cards:', response.status);
          }
        } catch (error) {
          console.error('Fetch cards error:', error);
        }
      },
      
      // Load more cards - FIXED VERSION
      loadMoreCards: async () => {
        try {
          const { cardsPagination, availableCards } = get();
          if (!cardsPagination?.hasMore) {
            console.log('No more cards to load');
            return;
          }
          
          const nextPage = cardsPagination.currentPage + 1;
          const token = localStorage.getItem('token');
          
          console.log(`Loading more cards, page ${nextPage}`);
          
          // Show loading state
          set((state) => ({
            cardsPagination: state.cardsPagination ? {
              ...state.cardsPagination,
              isLoading: true
            } : null
          }));
          
          const url = `${API_URL}/games/cards?page=${nextPage}&limit=100`;
          
          const response = await fetch(url, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.cards && data.cards.length > 0) {
              const parsedCards = data.cards.map((card: any) => ({
                ...card,
                numbers: typeof card.numbers === 'string' ? JSON.parse(card.numbers || '[]') : card.numbers,
                card_number: card.card_number || card.id,
                is_used: Boolean(card.is_used),
                isSelected: Boolean(card.is_used),
              }));
              
              // Combine with existing cards
              const combinedCards = [...availableCards, ...parsedCards];
              
              const paginationInfo = {
                currentPage: nextPage,
                totalPages: data.totalPages || cardsPagination.totalPages,
                totalCards: data.totalCount || cardsPagination.totalCards,
                hasMore: data.hasMore || (nextPage * 100 < (data.totalCount || 0)),
                isLoading: false
              };
              
              set({ 
                availableCards: combinedCards,
                cardsPagination: paginationInfo
              });
              
              console.log(`Loaded ${parsedCards.length} more cards. Total: ${combinedCards.length}`);
            } else {
              console.log('No more cards available');
              set((state) => ({
                cardsPagination: state.cardsPagination ? {
                  ...state.cardsPagination,
                  hasMore: false,
                  isLoading: false
                } : null
              }));
            }
          }
        } catch (error) {
          console.error('Load more cards error:', error);
          set((state) => ({
            cardsPagination: state.cardsPagination ? {
              ...state.cardsPagination,
              isLoading: false
            } : null
          }));
        }
      },
      
      // Select a bingo card
      selectCard: async (cardNumber: number, stake: number) => {
        try {
          const token = localStorage.getItem('token');
          const user = get().user;
          
          if (!token || !user) {
            console.error('No token or user when selecting card');
            return false;
          }
          
          if (user.balance < stake) {
            console.error('Insufficient balance');
            return false;
          }
          
          const response = await fetch(`${API_URL}/games/cards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              cardNumber,
              stake,
              userId: user.id,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            
            const cardResponse = await fetch(
              `${API_URL}/games/cards?gameId=${data.data.gameId}`,
              { 
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Cache-Control': 'no-cache'
                } 
              }
            );
            
            if (cardResponse.ok) {
              const cardData = await cardResponse.json();
              const selectedCard = cardData.cards.find(
                (c: any) => c.card_number === cardNumber || c.id === cardNumber
              );
              
              if (selectedCard) {
                set({
                  selectedCard: {
                    id: selectedCard.id,
                    card_number: selectedCard.card_number || selectedCard.id,
                    numbers: typeof selectedCard.numbers === 'string' 
                      ? JSON.parse(selectedCard.numbers || '[]') 
                      : selectedCard.numbers,
                    is_used: Boolean(selectedCard.is_used),
                    selected_by: selectedCard.selected_by,
                  },
                  currentGame: {
                    id: data.data.gameId,
                    stake,
                    status: 'waiting',
                    players: [user.id],
                    created_at: new Date().toISOString(),
                  },
                });
                
                set((state) => ({
                  user: state.user 
                    ? { 
                        ...state.user, 
                        balance: state.user.balance - stake 
                      }
                    : null,
                }));
                
                console.log('Card selected successfully:', cardNumber);
                return true;
              }
            }
          } else if (response.status === 401) {
            get().logout();
          } else {
            const errorData = await response.json();
            console.error('Select card failed:', errorData);
          }
        } catch (error) {
          console.error('Select card error:', error);
        }
        return false;
      },
      
      // Start game
      startGame: async (gameId: string) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return false;
          
          const response = await fetch(`${API_URL}/games/${gameId}/start`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (response.ok) {
            set((state) => ({
              currentGame: state.currentGame 
                ? { 
                    ...state.currentGame, 
                    status: 'in_progress', 
                    started_at: new Date().toISOString() 
                  }
                : null,
            }));
            console.log('Game started:', gameId);
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Start game error:', error);
        }
        return false;
      },
      
      // Call next number (admin only)
      callNumber: async (gameId: string) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return null;
          
          const response = await fetch(`${API_URL}/games/${gameId}/call-number`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            
            const { selectedCard, markedNumbers } = get();
            if (selectedCard && selectedCard.numbers.flat().includes(data.number)) {
              const newMarked = new Set(markedNumbers);
              newMarked.add(data.number);
              set({ markedNumbers: newMarked });
            }
            
            set((state) => ({
              currentGame: state.currentGame 
                ? {
                    ...state.currentGame,
                    called_numbers: [
                      ...(state.currentGame.called_numbers || []), 
                      data.number
                    ],
                    current_number: data.number,
                  }
                : null,
            }));
            
            console.log('Number called:', data.number);
            return data.number;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Call number error:', error);
        }
        return null;
      },
      
      markNumber: (number: number) => {
        const { currentGame, markedNumbers } = get();
        if (currentGame?.status !== 'in_progress') return;
        
        const newMarked = new Set(markedNumbers);
        newMarked.add(number);
        set({ markedNumbers: newMarked });
        console.log('Number marked:', number);
      },
      
      checkWin: async (gameId: string) => {
        try {
          const token = localStorage.getItem('token');
          const { markedNumbers, selectedCard, user } = get();
          
          if (!token || !selectedCard || !user) {
            console.error('Missing token, card, or user for checkWin');
            return { win: false };
          }
          
          const response = await fetch(`${API_URL}/games/${gameId}/check-win`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: user.id,
              markedNumbers: Array.from(markedNumbers),
              cardNumbers: selectedCard.numbers,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.win) {
              console.log('BINGO! Win detected:', data.pattern);
              
              const winAmount = (get().currentGame?.stake || 10) * 5;
              set((state) => ({
                user: state.user 
                  ? { 
                      ...state.user, 
                      balance: state.user.balance + winAmount 
                    }
                  : null,
                currentGame: state.currentGame 
                  ? { 
                      ...state.currentGame, 
                      status: 'completed',
                      winner_id: user.id,
                      win_pattern: data.pattern,
                      completed_at: new Date().toISOString()
                    }
                  : null,
              }));
            }
            return { win: data.win, pattern: data.pattern };
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Check win error:', error);
        }
        return { win: false };
      },
      
      // Wallet Actions
      fetchWalletData: async () => {
        try {
          const token = localStorage.getItem('token');
          const user = get().user;
          
          if (!token || !user) {
            console.log('No token or user, skipping fetchWalletData');
            return;
          }
          
          const depositsRes = await fetch(
            `${API_URL}/deposits?userId=${user.id}`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              } 
            }
          );
          
          const withdrawalsRes = await fetch(
            `${API_URL}/withdrawals?userId=${user.id}`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              } 
            }
          );
          
          const transactionsRes = await fetch(
            `${API_URL}/transactions?userId=${user.id}&limit=50`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              } 
            }
          );
          
          if (depositsRes.ok) {
            const depositsData = await depositsRes.json();
            set({ deposits: depositsData.deposits });
          } else if (depositsRes.status === 401) {
            get().logout();
          }
          
          if (withdrawalsRes.ok) {
            const withdrawalsData = await withdrawalsRes.json();
            set({ withdrawals: withdrawalsData.withdrawals });
          } else if (withdrawalsRes.status === 401) {
            get().logout();
          }
          
          if (transactionsRes.ok) {
            const transactionsData = await transactionsRes.json();
            set({ transactions: transactionsData.transactions });
          } else if (transactionsRes.status === 401) {
            get().logout();
          }
          
        } catch (error) {
          console.error('Fetch wallet error:', error);
        }
      },
      
      requestDeposit: async (amount, method, screenshot) => {
        try {
          const token = localStorage.getItem('token');
          const user = get().user;
          
          if (!token || !user) {
            console.error('No token or user for deposit request');
            return false;
          }
          
          const formData = new FormData();
          formData.append('userId', user.id);
          formData.append('amount', amount.toString());
          formData.append('method', method);
          if (screenshot) {
            formData.append('screenshot', screenshot);
          }
          
          const response = await fetch(`${API_URL}/deposits`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });
          
          if (response.ok) {
            console.log('Deposit request submitted:', amount, method);
            setTimeout(() => get().fetchWalletData(), 1000);
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Deposit request error:', error);
        }
        return false;
      },
      
      requestWithdrawal: async (amount, method, accountNumber) => {
        try {
          const token = localStorage.getItem('token');
          const user = get().user;
          
          if (!token || !user) {
            console.error('No token or user for withdrawal request');
            return false;
          }
          
          if (user.balance < amount) {
            console.error('Insufficient balance for withdrawal');
            return false;
          }
          
          const response = await fetch(`${API_URL}/withdrawals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: user.id,
              amount,
              method,
              accountNumber,
            }),
          });
          
          if (response.ok) {
            console.log('Withdrawal request submitted:', amount, method);
            set((state) => ({
              user: state.user 
                ? { 
                    ...state.user, 
                    balance: state.user.balance - amount 
                  }
                : null,
            }));
            setTimeout(() => get().fetchWalletData(), 1000);
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Withdrawal request error:', error);
        }
        return false;
      },
      
      convertBonus: async () => {
        try {
          const token = localStorage.getItem('token');
          const user = get().user;
          
          if (!token || !user) return false;
          
          const response = await fetch(`${API_URL}/wallet/convert-bonus`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            
            set((state) => ({
              user: state.user 
                ? { 
                    ...state.user, 
                    balance: data.balance, 
                    bonusBalance: 0 
                  }
                : null,
            }));
            
            console.log('Bonus converted to main balance');
            get().fetchWalletData();
            
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Convert bonus error:', error);
        }
        return false;
      },
      
      // Profile Actions
      fetchProfileData: async () => {
        try {
          const token = localStorage.getItem('token');
          const user = get().user;
          
          if (!token || !user) {
            console.log('No token or user, skipping fetchProfileData');
            return;
          }
          
          const historyRes = await fetch(
            `${API_URL}/games/history?userId=${user.id}`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              } 
            }
          );
          
          const statsRes = await fetch(
            `${API_URL}/stats/general`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              } 
            }
          );
          
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            set({ gameHistory: historyData.history });
          } else if (historyRes.status === 401) {
            get().logout();
          }
          
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            set({
              activePlayers: statsData.activePlayers || 0,
              gamesPlayed: statsData.gamesPlayed || 0,
              dailyWinners: statsData.dailyWinners || 0,
            });
          } else if (statsRes.status === 401) {
            get().logout();
          }
          
        } catch (error) {
          console.error('Fetch profile error:', error);
        }
      },
      
      getReferralLink: () => {
        const user = get().user;
        if (!user) return '';
        const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'HabeshaBingoBot';
        return `https://t.me/${botUsername}?start=${user.referralCode}`;
      },
      
      // Admin Actions
      fetchAdminData: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.log('No token, skipping fetchAdminData');
            return;
          }
          
          const usersRes = await fetch(`${API_URL}/admin/users`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          const depositsRes = await fetch(`${API_URL}/admin/deposits`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          const withdrawalsRes = await fetch(`${API_URL}/admin/withdrawals`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          const logsRes = await fetch(`${API_URL}/admin/approval-logs`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          const gamesRes = await fetch(`${API_URL}/admin/games/completed`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            set({ allUsers: usersData.users });
          } else if (usersRes.status === 401) {
            get().logout();
          }
          
          if (depositsRes.ok) {
            const depositsData = await depositsRes.json();
            set({ deposits: depositsData.deposits });
          } else if (depositsRes.status === 401) {
            get().logout();
          }
          
          if (withdrawalsRes.ok) {
            const withdrawalsData = await withdrawalsRes.json();
            set({ withdrawals: withdrawalsData.withdrawals });
          } else if (withdrawalsRes.status === 401) {
            get().logout();
          }
          
          if (logsRes.ok) {
            const logsData = await logsRes.json();
            set({ approvalLogs: logsData.logs });
          } else if (logsRes.status === 401) {
            get().logout();
          }
          
          if (gamesRes.ok) {
            const gamesData = await gamesRes.json();
            set({ completedGames: gamesData.games });
          } else if (gamesRes.status === 401) {
            get().logout();
          }
          
        } catch (error) {
          console.error('Fetch admin data error:', error);
        }
      },
      
      approveDeposit: async (depositId, notes = '') => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return false;
          
          const response = await fetch(
            `${API_URL}/admin/deposits/${depositId}/approve`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ notes }),
            }
          );
          
          if (response.ok) {
            console.log('Deposit approved:', depositId);
            setTimeout(() => get().fetchAdminData(), 500);
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Approve deposit error:', error);
        }
        return false;
      },
      
      rejectDeposit: async (depositId, notes = '') => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return false;
          
          const response = await fetch(
            `${API_URL}/admin/deposits/${depositId}/reject`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ notes }),
            }
          );
          
          if (response.ok) {
            console.log('Deposit rejected:', depositId);
            get().fetchAdminData();
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Reject deposit error:', error);
        }
        return false;
      },
      
      approveWithdrawal: async (withdrawalId, notes = '') => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return false;
          
          const response = await fetch(
            `${API_URL}/admin/withdrawals/${withdrawalId}/approve`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ notes }),
            }
          );
          
          if (response.ok) {
            console.log('Withdrawal approved:', withdrawalId);
            get().fetchAdminData();
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Approve withdrawal error:', error);
        }
        return false;
      },
      
      rejectWithdrawal: async (withdrawalId, notes = '') => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return false;
          
          const response = await fetch(
            `${API_URL}/admin/withdrawals/${withdrawalId}/reject`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ notes }),
            }
          );
          
          if (response.ok) {
            console.log('Withdrawal rejected:', withdrawalId);
            get().fetchAdminData();
            return true;
          } else if (response.status === 401) {
            get().logout();
          }
        } catch (error) {
          console.error('Reject withdrawal error:', error);
        }
        return false;
      },
      
      // Socket Connection
      connectSocket: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.log('No token, skipping socket connection');
            return;
          }
          
          if (get().socket) {
            console.log('Socket already connected');
            return;
          }
          
          const io = (await import('socket.io-client')).default;
          
          const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });
          
          socket.on('connect', () => {
            console.log('Socket connected successfully');
          });
          
          socket.on('connect_error', (error: any) => {
            console.error('Socket connection error:', error);
          });
          
          socket.on('game-state', (data: { game: Game; markedNumbers?: number[] }) => {
            console.log('Game state update received');
            set({ 
              currentGame: data.game,
              markedNumbers: new Set(data.markedNumbers || [0])
            });
          });
          
          socket.on('number-called', (data: { number: number }) => {
            console.log('Number called via socket:', data.number);
            const { currentGame, markedNumbers, selectedCard } = get();
            
            if (currentGame && selectedCard) {
              const cardNumbers = selectedCard.numbers.flat();
              if (cardNumbers.includes(data.number)) {
                const newMarked = new Set(markedNumbers);
                newMarked.add(data.number);
                set({ markedNumbers: newMarked });
              }
              
              set({
                currentGame: {
                  ...currentGame,
                  called_numbers: [...(currentGame.called_numbers || []), data.number],
                  current_number: data.number,
                },
              });
            }
          });
          
          socket.on('winner', (data: { winnerId: string; winnerName: string; winAmount: number }) => {
            console.log('Winner announcement:', data.winnerName);
            
            const user = get().user;
            if (user && data.winnerId === user.id) {
              set((state) => ({
                user: state.user 
                  ? { 
                      ...state.user, 
                      balance: state.user.balance + data.winAmount 
                    }
                  : null,
              }));
            }
            
            set({
              currentGame: null,
              selectedCard: null,
              markedNumbers: new Set([0]),
            });
          });
          
          socket.on('game-started', (data: { startedAt: string }) => {
            console.log('Game started via socket');
            set((state) => ({
              currentGame: state.currentGame 
                ? { 
                    ...state.currentGame, 
                    status: 'in_progress', 
                    started_at: data.startedAt 
                  }
                : null,
            }));
          });
          
          socket.on('player-joined', (data: { userId: string }) => {
            console.log('Player joined:', data.userId);
            set((state) => ({
              currentGame: state.currentGame 
                ? { 
                    ...state.currentGame, 
                    players: [...state.currentGame.players, data.userId] 
                  }
                : null,
            }));
          });
          
          socket.on('disconnect', (reason: string) => {
            console.log('Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
              socket.connect();
            }
          });
          
          set({ socket });
          
        } catch (error) {
          console.error('Socket connection error:', error);
        }
      },
      
      disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
          console.log('Disconnecting socket');
          socket.disconnect();
          set({ socket: null });
        }
      },
    }),
    {
      name: "habesha-bingo-storage",
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        currentTab: state.currentTab,
      }),
    }
  )
);