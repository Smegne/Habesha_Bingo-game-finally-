"use client"

import { useState, useEffect, useRef } from "react"
import { useGameStore } from "@/lib/game-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientAdminService } from '@/lib/services/client-admin-service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Upload,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Users,
  CreditCard,
  Wallet,
  Gamepad2,
  Trophy,
  History,
  Settings,
  LogOut,
  Home,
  BarChart,
  FileText,
  Bell,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Shield,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Menu,
  Activity,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Ban,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Chart Components
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

// Sidebar Navigation Items
const NAVIGATION_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "users", label: "Users", icon: Users },
  { id: "deposits", label: "Deposits", icon: CreditCard },
  { id: "withdrawals", label: "Withdrawals", icon: Wallet },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "transactions", label: "Transactions", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart },
  { id: "settings", label: "Settings", icon: Settings },
]

// Color Palette for Charts
const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
  pink: "#ec4899",
  indigo: "#6366f1",
}

// Types
interface DashboardStats {
  total_users: number;
  active_users: number;
  total_admins: number;
  total_revenue: number;
  pending_actions: number;
  games_played: number;
  active_games: number;
  daily_winners: number;
  total_deposits_amount: number;
  total_withdrawals_amount: number;
  user_growth: number;
  revenue_growth: number;
  daily_deposits?: number;
  daily_withdrawals?: number;
  new_users_today?: number;
  new_users_week?: number;
}

interface User {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  email: string | null;
  phone: string | null;
  password_hash?: string;
  role: string;
  balance: string;
  bonus_balance: string;
  referral_code: string;
  referred_by: string | null;
  is_online: number;
  last_active: string;
  created_at: string;
  updated_at: string;
}

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  transaction_ref?: string; // Actual DB field name
  transaction_id?: string; // Frontend expects this
  screenshot_url?: string; // Actual DB field name
  proof_image?: string; // Frontend expects this
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    first_name: string;
    telegram_id: string;
    balance: number | string;
  };
}
export function AdminPanelEnhanced() {
  console.log('AdminPanelEnhanced component rendering');
  
  const { 
    user, 
    logout, 
    allUsers, 
    deposits, 
    withdrawals, 
    transactions, 
    approvalLogs, 
    completedGames,
    activePlayers,
    gamesPlayed,
    dailyWinners,
    fetchAdminData,
  } = useGameStore()

  console.log('User from store:', user);

  // State Management
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notes, setNotes] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // New state for fetched users data
  const [usersData, setUsersData] = useState<User[]>([])
  const [depositsData, setDepositsData] = useState<Deposit[]>([])
  const [withdrawalsData, setWithdrawalsData] = useState<any[]>([])
  const [transactionsData, setTransactionsData] = useState<any[]>([])
  const [gamesData, setGamesData] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  
  // Deposit specific states
  const [depositStatusFilter, setDepositStatusFilter] = useState<string>('all')
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [showDepositDetails, setShowDepositDetails] = useState(false)
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  console.log('Dashboard stats state:', dashboardStats);

  // Real-time updates using WebSocket
  const wsRef = useRef<WebSocket | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('AdminPanel: useEffect running');
    
    const connectWebSocket = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
      const token = localStorage.getItem('token')
      
      if (!token) return
      
      const ws = new WebSocket(`${wsUrl}?token=${token}`)
      
      ws.onopen = () => {
        console.log('Admin WebSocket connected')
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }
      
      ws.onclose = () => {
        console.log('Admin WebSocket disconnected, attempting reconnect...')
        setTimeout(connectWebSocket, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('Admin WebSocket error:', error)
      }
      
      wsRef.current = ws
    }
    
    connectWebSocket()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'new_deposit':
        toast.info(`New deposit: ${data.amount} ETB`, {
          description: `From: ${data.username}`,
        })
        if (activeNav === 'deposits') {
          fetchDepositsData()
        }
        fetchDashboardData()
        break
        
      case 'new_withdrawal':
        toast.info(`New withdrawal request: ${data.amount} ETB`, {
          description: `From: ${data.username}`,
        })
        fetchDashboardData()
        break
        
      case 'game_started':
        toast.success('Game started', {
          description: `Stake: ${data.stake} ETB`,
        })
        break
        
      case 'game_completed':
        toast.success('Game completed!', {
          description: `Winner: ${data.winnerName} - ${data.winAmount} ETB`,
        })
        fetchDashboardData()
        break
        
      case 'user_online':
        toast.info('User online', {
          description: data.username,
        })
        break
    }
  }

  // Update the handleNavClick function
  const handleNavClick = (navId: string) => {
    console.log('Nav clicked:', navId);
    setActiveNav(navId);
    setIsMobileMenuOpen(false);
    
    // Fetch data based on selected nav
    switch (navId) {
      case 'dashboard':
        fetchDashboardData();
        break;
      case 'users':
        fetchUsersData();
        break;
      case 'deposits':
        fetchDepositsData();
        break;
      case 'withdrawals':
        fetchWithdrawalsData();
        break;
      case 'games':
        fetchGamesData();
        break;
      case 'transactions':
        fetchTransactionsData();
        break;
      case 'analytics':
        fetchAnalyticsData();
        break;
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    console.log('fetchDashboardData: Starting');
    try {
      setIsLoading(true)
      // Use ClientAdminService instead of AdminService
      const stats = await ClientAdminService.getDashboardStats()
      console.log('fetchDashboardData: Success', stats)
      setDashboardStats(stats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
      // Add fallback mock data
      setDashboardStats({
        total_users: 1250,
        active_users: 87,
        total_admins: 3,
        total_revenue: 125000,
        pending_actions: 14,
        games_played: 5230,
        active_games: 8,
        daily_winners: 45,
        total_deposits_amount: 250000,
        total_withdrawals_amount: 125000,
        user_growth: 12.5,
        revenue_growth: 8.3,
      })
    } finally {
      console.log('fetchDashboardData: Finished')
      setIsLoading(false)
    }
  }

  // Fetch users data
  const fetchUsersData = async () => {
    console.log('=== FETCH USERS START ===');
    try {
      setIsLoading(true);
      
      // Use the GUARANTEED working API
      const url = `/api/admin/working-users?page=${currentPage}&limit=${itemsPerPage}`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data success:', data.success);
      console.log('Users count:', data.data?.users?.length || 0);
      
      if (data.success && data.data) {
        const users = data.data.users || [];
        console.log('Setting users data:', users.length, 'users');
        console.log('First user:', users[0]);
        setUsersData(users);
        toast.success(`Loaded ${users.length} users`);
      } else {
        console.error('API returned failure');
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH USERS END ===');
    }
  };

  // Fetch deposits data

// In your admin panel - Update the deposits data handling
const fetchDepositsData = async () => {
  console.log('=== FETCH DEPOSITS START ===');
  try {
    setIsLoading(true);
    
    const url = `/api/admin/working-data?type=deposits&page=${currentPage}&limit=${itemsPerPage}&status=${depositStatusFilter}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response success:', data.success);
    console.log('Full data:', data);
    
    if (data.success && data.data) {
      const deposits = data.data.deposits || [];
      console.log('Raw deposits received:', deposits);
      
      // Map to your frontend interface
      const formattedDeposits = deposits.map((deposit: any) => {
        console.log('Processing deposit:', deposit.id);
        
        return {
          id: deposit.id,
          user_id: deposit.user_id,
          amount: typeof deposit.amount === 'string' ? parseFloat(deposit.amount) : deposit.amount,
          method: deposit.method || 'telebirr',
          status: deposit.status || 'pending',
          transaction_id: deposit.transaction_ref || deposit.transaction_id, // Use transaction_ref from DB
          proof_image: deposit.screenshot_url || deposit.proof_image, // Use screenshot_url from DB
          admin_notes: deposit.admin_notes,
          approved_by: deposit.approved_by,
          approved_at: deposit.approved_at,
          created_at: deposit.created_at,
          updated_at: deposit.updated_at,
          user: {
            username: deposit.username || 'Unknown',
            first_name: deposit.first_name || 'User',
            telegram_id: deposit.telegram_id || 'N/A',
            balance: typeof deposit.user_balance === 'string' ? parseFloat(deposit.user_balance) : deposit.user_balance
          }
        };
      });
      
      console.log('Formatted deposits:', formattedDeposits);
      setDepositsData(formattedDeposits);
      
      if (formattedDeposits.length > 0) {
        toast.success(`Loaded ${formattedDeposits.length} deposits`);
      } else {
        toast.info('No deposits found');
      }
    } else {
      console.error('API returned failure:', data);
      toast.error(data.message || 'Failed to load deposits');
    }
  } catch (error: any) {
    console.error('Fetch error:', error);
    toast.error(`Failed to load deposits: ${error.message}`);
  } finally {
    setIsLoading(false);
    console.log('=== FETCH DEPOSITS END ===');
  }
};
// Update the approve function
const handleApproveDeposit = async (depositId: string) => {
  console.log('=== APPROVE DEPOSIT ===');
  
  const deposit = depositsData.find(d => d.id === depositId);
  if (!deposit) {
    toast.error('Deposit not found');
    return;
  }
  
  if (!confirm(`Approve ${deposit.amount} ETB deposit from ${deposit.user?.username}?`)) {
    return;
  }

  try {
    setIsProcessingDeposit(true);
    
    // CORRECTED: No admin_notes in payload
    const payload = {
      action: 'approve',
      type: 'deposits',
      ids: [depositId]
    };
    
    console.log('Sending payload:', payload);
    
    const response = await fetch('/api/admin/working-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      toast.success('✅ Deposit approved successfully!');
      
      // Update UI
      setDepositsData(prev => prev.map(d => {
        if (d.id === depositId) {
          return {
            ...d,
            status: 'approved',
            approved_by: 'admin',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        return d;
      }));
      
      // Refresh list
      setTimeout(() => fetchDepositsData(), 1000);
      
      // Refresh dashboard
      fetchDashboardData();
      
    } else {
      console.error('Approve failed:', data);
      toast.error(data.message || 'Failed to approve deposit');
    }
    
  } catch (error: any) {
    console.error('Error:', error);
    toast.error(`Error: ${error.message}`);
  } finally {
    setIsProcessingDeposit(false);
  }
};
// Update the reject function
const handleRejectDeposit = async (depositId: string, reason: string = '') => {
  if (!reason.trim()) {
    toast.error('Please provide a reason for rejection');
    return;
  }

  if (!confirm('Are you sure you want to reject this deposit?')) {
    return;
  }

  try {
    setIsProcessingDeposit(true);
    console.log('Rejecting deposit:', depositId);

    const response = await fetch('/api/admin/working-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reject',
        type: 'deposits',
        ids: [depositId],
        admin_notes: reason,
      }),
    });

    const data = await response.json();
    console.log('Reject response:', data);

    if (data.success) {
      toast.success('Deposit rejected successfully!');
      // Update the deposit status in the list
      setDepositsData(prev => prev.map(deposit =>
        deposit.id === depositId ? { ...deposit, status: 'rejected' } : deposit
      ));
      setRejectReason('');
      // Refresh dashboard stats
      fetchDashboardData();
    } else {
      toast.error(data.message || 'Failed to reject deposit');
    }
  } catch (error) {
    console.error('Error rejecting deposit:', error);
    toast.error('Failed to reject deposit');
  } finally {
    setIsProcessingDeposit(false);
    setShowDepositDetails(false);
  }
};
  // Approve deposit
 

  // Reject deposit
 

  // Bulk approve deposits
  const handleBulkApproveDeposits = async () => {
    if (selectedItems.length === 0) {
      toast.warning('No deposits selected');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${selectedItems.length} deposits?`)) {
      return;
    }

    try {
      setIsProcessingDeposit(true);
      const response = await fetch('/api/admin/deposits/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deposit_ids: selectedItems,
          admin_notes: 'Bulk approved by admin',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${selectedItems.length} deposits approved successfully!`);
        // Refresh deposits list
        fetchDepositsData();
        // Refresh dashboard stats
        fetchDashboardData();
        // Clear selection
        setSelectedItems([]);
      } else {
        toast.error(data.message || 'Failed to approve deposits');
      }
    } catch (error) {
      console.error('Error bulk approving deposits:', error);
      toast.error('Failed to approve deposits');
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // Bulk reject deposits
  const handleBulkRejectDeposits = async () => {
    if (selectedItems.length === 0) {
      toast.warning('No deposits selected');
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (!confirm(`Are you sure you want to reject ${selectedItems.length} deposits?`)) {
      return;
    }

    try {
      setIsProcessingDeposit(true);
      const response = await fetch('/api/admin/deposits/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deposit_ids: selectedItems,
          admin_notes: rejectReason,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${selectedItems.length} deposits rejected successfully!`);
        // Refresh deposits list
        fetchDepositsData();
        // Refresh dashboard stats
        fetchDashboardData();
        // Clear selection and reason
        setSelectedItems([]);
        setRejectReason('');
      } else {
        toast.error(data.message || 'Failed to reject deposits');
      }
    } catch (error) {
      console.error('Error bulk rejecting deposits:', error);
      toast.error('Failed to reject deposits');
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // View deposit details
  const handleViewDepositDetails = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setShowDepositDetails(true);
  };

  // Filter deposits based on search and status
  const filteredDeposits = depositsData.filter(deposit => {
    // Apply status filter
    if (depositStatusFilter !== 'all' && deposit.status !== depositStatusFilter) {
      return false;
    }
    
    // Apply search filter
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      deposit.user?.username?.toLowerCase().includes(query) ||
      deposit.user?.first_name?.toLowerCase().includes(query) ||
      deposit.transaction_id?.toLowerCase().includes(query) ||
      deposit.method.toLowerCase().includes(query)
    );
  });

  const fetchWithdrawalsData = async () => {
    console.log('=== FETCH WITHDRAWALS START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/working-data?type=withdrawals&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      console.log('Withdrawals data response:', data);
      
      if (data.success) {
        const withdrawals = data.data?.withdrawals || [];
        setWithdrawalsData(withdrawals);
        toast.success(`Loaded ${withdrawals.length} withdrawals`);
      } else {
        toast.error('Failed to load withdrawals');
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH WITHDRAWALS END ===');
    }
  };

  const fetchTransactionsData = async () => {
    console.log('=== FETCH TRANSACTIONS START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/working-data?type=transactions&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      console.log('Transactions data response:', data);
      
      if (data.success) {
        const transactions = data.data?.transactions || [];
        setTransactionsData(transactions);
        toast.success(`Loaded ${transactions.length} transactions`);
      } else {
        toast.error('Failed to load transactions');
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH TRANSACTIONS END ===');
    }
  };

  const fetchGamesData = async () => {
    console.log('=== FETCH GAMES START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/working-data?type=games&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      console.log('Games data response:', data);
      
      if (data.success) {
        const games = data.data?.games || [];
        setGamesData(games);
        toast.success(`Loaded ${games.length} games`);
      } else {
        toast.error('Failed to load games');
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH GAMES END ===');
    }
  };

  const fetchAnalyticsData = async () => {
    console.log('=== FETCH ANALYTICS START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      console.log('Analytics data response:', data);
      
      if (data.success) {
        setAnalyticsData(data.data);
        toast.success('Analytics data loaded');
      } else {
        toast.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH ANALYTICS END ===');
    }
  };

  // Initial data fetch
  useEffect(() => {
    console.log('AdminPanel: Initial data fetch');
    fetchAdminData();
    fetchDashboardData();
    
    // Auto-fetch data based on active tab
    if (activeNav === 'users') {
      fetchUsersData();
    } else if (activeNav === 'deposits') {
      fetchDepositsData();
    }
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      console.log('AdminPanel: Auto-refreshing data');
      fetchDashboardData();
      
      // Refresh current tab data
      switch (activeNav) {
        case 'users':
          fetchUsersData();
          break;
        case 'deposits':
          fetchDepositsData();
          break;
        case 'withdrawals':
          fetchWithdrawalsData();
          break;
        case 'games':
          fetchGamesData();
          break;
        case 'transactions':
          fetchTransactionsData();
          break;
      }
    }, 30000);
    
    return () => {
      console.log('AdminPanel: Cleaning up interval');
      clearInterval(interval);
    }
  }, [activeNav]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    
    // Refresh current tab data
    switch (activeNav) {
      case 'dashboard':
        await fetchDashboardData();
        break;
      case 'users':
        await fetchUsersData();
        break;
      case 'deposits':
        await fetchDepositsData();
        break;
      case 'withdrawals':
        await fetchWithdrawalsData();
        break;
      case 'games':
        await fetchGamesData();
        break;
      case 'transactions':
        await fetchTransactionsData();
        break;
      case 'analytics':
        await fetchAnalyticsData();
        break;
    }
    
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Calculate stats
  const pendingDeposits = depositsData.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'pending');
  const onlineUsers = allUsers.filter((u: any) => u.is_online);
  const adminUsers = allUsers.filter((u: any) => u.role === 'admin');
  const totalDeposits = deposits.reduce((sum: number, d: any) => sum + d.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const totalRevenue = totalDeposits - totalWithdrawals;

  // Data for charts
  const revenueChartData = dashboardStats ? [
    { name: 'Deposits', value: dashboardStats.total_deposits_amount, color: CHART_COLORS.success },
    { name: 'Withdrawals', value: dashboardStats.total_withdrawals_amount, color: CHART_COLORS.danger },
    { name: 'Revenue', value: dashboardStats.total_revenue, color: CHART_COLORS.primary },
  ] : [];

  const userGrowthData = [
    { month: 'Jan', users: 100 },
    { month: 'Feb', users: 150 },
    { month: 'Mar', users: 200 },
    { month: 'Apr', users: 250 },
    { month: 'May', users: 300 },
    { month: 'Jun', users: dashboardStats?.total_users || 350 },
  ];

  // Render Sidebar (same as before)
  const renderSidebar = () => (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-background border-r transition-all duration-300 ease-in-out",
      isSidebarCollapsed ? "w-20" : "w-64",
      "lg:relative lg:translate-x-0",
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">Habesha Bingo</span>
          </div>
        )}
        {isSidebarCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto">
            <Shield className="h-5 w-5" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:inline-flex"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* User Info */}
      {!isSidebarCollapsed && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.firstName || 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role || 'Administrator'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant={activeNav === item.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isSidebarCollapsed && "justify-center px-2"
                  )}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t">
        <div className="space-y-2">
          {!isSidebarCollapsed && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending Deposits</span>
                <Badge variant="destructive">{pendingDeposits.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Online Users</span>
                <Badge variant="secondary">{onlineUsers.length}</Badge>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 mt-4",
              isSidebarCollapsed && "justify-center px-2"
            )}
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  // Render Dashboard (same as before)
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}. Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats && [
          {
            title: "Pending Deposits",
            value: pendingDeposits.length.toString(),
            change: pendingDeposits.length > 0 ? "Needs review" : "All clear",
            isPositive: pendingDeposits.length === 0,
            icon: Clock,
            color: pendingDeposits.length > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success",
          },
          {
            title: "Total Deposits",
            value: `ETB ${dashboardStats.total_deposits_amount.toLocaleString()}`,
            change: `${dashboardStats.revenue_growth}%`,
            isPositive: dashboardStats.revenue_growth >= 0,
            icon: DollarSign,
            color: "bg-primary/10 text-primary",
          },
          {
            title: "Active Users",
            value: dashboardStats.active_users.toLocaleString(),
            change: `${dashboardStats.user_growth}%`,
            isPositive: dashboardStats.user_growth >= 0,
            icon: Users,
            color: "bg-success/10 text-success",
          },
          {
            title: "Daily Winners",
            value: dashboardStats.daily_winners.toLocaleString(),
            change: "+2 today",
            isPositive: true,
            icon: Trophy,
            color: "bg-purple/10 text-purple",
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", stat.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{stat.title}</div>
                    <div className="text-2xl font-bold mt-1">{stat.value}</div>
                    <div className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      stat.isPositive ? "text-success" : "text-destructive"
                    )}>
                      {stat.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {stat.change}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts (same as before) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Total deposits, withdrawals, and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <RechartsTooltip formatter={(value) => [`ETB ${Number(value).toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                    {revenueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Monthly user registration trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <RechartsTooltip formatter={(value) => [`${value} users`, 'Count']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Total Users"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Users Management (same as before)
  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users and their accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchUsersData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
        </div>
      </div>

      {/* Users table implementation (same as before) */}
      <Card>
        <CardContent className="p-0">
          {isLoading && usersData.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : usersData.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={fetchUsersData}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Users
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData.slice(0, 10).map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.first_name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{user.telegram_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{parseFloat(user.balance).toFixed(2)} ETB</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                          <Badge variant={user.is_online ? 'default' : 'outline'}>
                            {user.is_online ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render Deposits Management
  const renderDeposits = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deposit Management</h1>
          <p className="text-muted-foreground">Review and approve user deposit requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchDepositsData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => window.open('/api/admin/deposits/export', '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards for Deposits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Pending Deposits",
            value: pendingDeposits.length.toString(),
            description: "Need approval",
            icon: Clock,
            color: "bg-warning/10 text-warning",
          },
          {
            title: "Total Amount",
            value: `ETB ${depositsData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}`,
            description: "All deposits",
            icon: DollarSign,
            color: "bg-primary/10 text-primary",
          },
          {
            title: "Approved Today",
            value: depositsData.filter(d => 
              d.status === 'approved' && 
              new Date(d.updated_at).toDateString() === new Date().toDateString()
            ).length.toString(),
            description: "Successful",
            icon: CheckCircle,
            color: "bg-success/10 text-success",
          },
          {
            title: "Rejected Today",
            value: depositsData.filter(d => 
              d.status === 'rejected' && 
              new Date(d.updated_at).toDateString() === new Date().toDateString()
            ).length.toString(),
            description: "Unsuccessful",
            icon: XCircle,
            color: "bg-destructive/10 text-destructive",
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", stat.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{stat.title}</div>
                    <div className="text-2xl font-bold mt-1">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search Deposits</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user, transaction ID..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={depositStatusFilter} onValueChange={setDepositStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cbe">CBE Birr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  placeholder="Start" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <Input 
                  type="date" 
                  placeholder="End" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedItems.length} deposits selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleBulkApproveDeposits}
                  disabled={isProcessingDeposit}
                >
                  {isProcessingDeposit ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve Selected
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      disabled={isProcessingDeposit}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Reject Selected
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Deposits</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting {selectedItems.length} deposit(s).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Rejection Reason</Label>
                        <Input
                          placeholder="Enter reason for rejection..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleBulkRejectDeposits}
                        disabled={!rejectReason.trim() || isProcessingDeposit}
                        className="w-full"
                      >
                        {isProcessingDeposit ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4 mr-2" />
                        )}
                        Confirm Rejection
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposits Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && depositsData.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading deposits...</span>
            </div>
          ) : depositsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No deposits found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={fetchDepositsData}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Deposits
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input 
                        type="checkbox"
                        checked={selectedItems.length === filteredDeposits.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(filteredDeposits.map(d => d.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.slice(0, 10).map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(deposit.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, deposit.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== deposit.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{deposit.user?.username || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {deposit.user?.first_name || 'No name'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-lg">{deposit.amount.toFixed(2)} ETB</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {deposit.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          deposit.status === 'approved' ? 'default' :
                          deposit.status === 'pending' ? 'warning' :
                          deposit.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {deposit.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm truncate max-w-[150px]">
                          {deposit.transaction_id || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(deposit.created_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleViewDepositDetails(deposit)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {deposit.status === 'pending' && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-success hover:text-success hover:bg-success/10"
                                      onClick={() => handleApproveDeposit(deposit.id)}
                                      disabled={isProcessingDeposit}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Approve Deposit</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <Dialog>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                          disabled={isProcessingDeposit}
                                        >
                                          <Ban className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject Deposit</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Deposit</DialogTitle>
                                    <DialogDescription>
                                      Please provide a reason for rejecting this deposit of {deposit.amount} ETB.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Rejection Reason</Label>
                                      <Input
                                        placeholder="Enter reason for rejection..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => handleRejectDeposit(deposit.id)}
                                      disabled={!rejectReason.trim() || isProcessingDeposit}
                                      className="w-full"
                                    >
                                      {isProcessingDeposit ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Ban className="h-4 w-4 mr-2" />
                                      )}
                                      Confirm Rejection
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          
                          {deposit.status === 'approved' && (
                            <Badge variant="default" className="ml-2">
                              Approved by: {deposit.approved_by || 'Admin'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {filteredDeposits.length > 10 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing 1-10 of {filteredDeposits.length} deposits
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {currentPage}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render other sections (simplified placeholders)
  const renderWithdrawals = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Withdrawal Management</h1>
      <p className="text-muted-foreground">Manage and process withdrawal requests</p>
      {/* Add withdrawals table */}
    </div>
  );

  const renderGames = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Games Management</h1>
      <p className="text-muted-foreground">Monitor and manage active games</p>
      {/* Add games table */}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
      <p className="text-muted-foreground">View all system transactions</p>
      {/* Add transactions table */}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
      <p className="text-muted-foreground">Detailed analytics and insights</p>
      {/* Add analytics charts */}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground">System configuration and preferences</p>
      {/* Add settings forms */}
    </div>
  );

  // Main Render
  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      {renderSidebar()}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container max-w-7xl mx-auto p-4 lg:p-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">Habesha Bingo</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content based on active nav */}
          {activeNav === "dashboard" && renderDashboard()}
          {activeNav === "users" && renderUsers()}
          {activeNav === "deposits" && renderDeposits()}
          {activeNav === "withdrawals" && renderWithdrawals()}
          {activeNav === "games" && renderGames()}
          {activeNav === "transactions" && renderTransactions()}
          {activeNav === "analytics" && renderAnalytics()}
          {activeNav === "settings" && renderSettings()}
        </div>
      </div>

      {/* Deposit Details Sheet */}
      <Sheet open={showDepositDetails} onOpenChange={setShowDepositDetails}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Deposit Details</SheetTitle>
            <SheetDescription>
              Detailed information about the deposit
            </SheetDescription>
          </SheetHeader>
          {selectedDeposit && (
            <div className="mt-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Deposit ID</Label>
                  <p className="text-sm font-mono">{selectedDeposit.id}</p>
                </div>
                <div>
                  <Label className="text-xs">User Information</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedDeposit.user?.username || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{selectedDeposit.user?.first_name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">ID: {selectedDeposit.user_id}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <p className="text-2xl font-bold text-primary">{selectedDeposit.amount.toFixed(2)} ETB</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <p className="text-sm font-medium">{selectedDeposit.method}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Badge variant={
                      selectedDeposit.status === 'approved' ? 'default' :
                      selectedDeposit.status === 'pending' ? 'warning' :
                      selectedDeposit.status === 'rejected' ? 'destructive' : 'secondary'
                    } className="mt-1">
                      {selectedDeposit.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                {selectedDeposit.transaction_id && (
                  <div>
                    <Label className="text-xs">Transaction ID</Label>
                    <p className="text-sm font-mono">{selectedDeposit.transaction_id}</p>
                  </div>
                )}
                {selectedDeposit.admin_notes && (
                  <div>
                    <Label className="text-xs">Admin Notes</Label>
                    <p className="text-sm">{selectedDeposit.admin_notes}</p>
                  </div>
                )}
                {selectedDeposit.approved_by && (
                  <div>
                    <Label className="text-xs">Approved By</Label>
                    <p className="text-sm">{selectedDeposit.approved_by}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedDeposit.approved_at || '').toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Created</Label>
                    <p className="text-sm">{new Date(selectedDeposit.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Last Updated</Label>
                    <p className="text-sm">{new Date(selectedDeposit.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              {selectedDeposit.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    className="flex-1"
                    onClick={() => handleApproveDeposit(selectedDeposit.id)}
                    disabled={isProcessingDeposit}
                  >
                    {isProcessingDeposit ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        disabled={isProcessingDeposit}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Deposit</DialogTitle>
                        <DialogDescription>
                          Please provide a reason for rejecting this deposit.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Rejection Reason</Label>
                          <Input
                            placeholder="Enter reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={() => handleRejectDeposit(selectedDeposit.id)}
                          disabled={!rejectReason.trim() || isProcessingDeposit}
                          className="w-full"
                        >
                          {isProcessingDeposit ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4 mr-2" />
                          )}
                          Confirm Rejection
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Toast Container */}
      <div className="fixed bottom-0 right-0 p-4 z-50" />
    </div>
  );
}

// Add named exports for easier access
export const AdminPanel = AdminPanelEnhanced;
export default AdminPanelEnhanced;