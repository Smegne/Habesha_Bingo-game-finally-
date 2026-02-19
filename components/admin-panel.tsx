"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
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
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Users,
  CreditCard,
  Wallet,
  Gamepad2,
  Trophy,
  Settings,
  LogOut,
  Home,
  BarChart,
  FileText,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Shield,
  Eye,
  Edit,
  RefreshCw,
  X,
  Menu,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Ban,
  AlertCircle,
  Loader2,
  Download,
  Filter,
} from "lucide-react"
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
  LineChart,
  Line,
  Cell,
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
  transaction_ref?: string;
  transaction_id?: string;
  screenshot_url?: string;
  proof_image?: string;
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

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  user?: {
    username: string;
    first_name: string;
  };
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Game {
  id: string;
  name: string;
  status: string;
  players: number;
  created_at: string;
}

export function AdminPanelEnhanced() {
  console.log('AdminPanelEnhanced component rendering');
  
  const { 
    user, 
    logout, 
    allUsers = [], 
    deposits = [], 
    withdrawals = [], 
    transactions = [], 
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
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null)
  
  // Data states with default empty arrays
  const [usersData, setUsersData] = useState<User[]>([])
  const [depositsData, setDepositsData] = useState<Deposit[]>([])
  const [withdrawalsData, setWithdrawalsData] = useState<Withdrawal[]>([])
  const [transactionsData, setTransactionsData] = useState<Transaction[]>([])
  const [gamesData, setGamesData] = useState<Game[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  
  // Deposit specific states
  const [depositStatusFilter, setDepositStatusFilter] = useState<string>('all')
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [showDepositDetails, setShowDepositDetails] = useState(false)
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  console.log('Dashboard stats state:', dashboardStats);

  // Safe calculations with fallbacks
  const pendingDeposits = useMemo(() => 
    Array.isArray(depositsData) ? depositsData.filter(d => d.status === 'pending') : [], 
    [depositsData]
  )
  
  const pendingWithdrawals = useMemo(() => 
    Array.isArray(withdrawals) ? withdrawals.filter((w: any) => w.status === 'pending') : [], 
    [withdrawals]
  )
  
  const onlineUsers = useMemo(() => 
    Array.isArray(allUsers) ? allUsers.filter((u: any) => u.is_online) : [], 
    [allUsers]
  )
  
  const adminUsers = useMemo(() => 
    Array.isArray(allUsers) ? allUsers.filter((u: any) => u.role === 'admin') : [], 
    [allUsers]
  )
  
  const totalDeposits = useMemo(() => 
    Array.isArray(deposits) 
      ? deposits.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0) 
      : 0, 
    [deposits]
  )
  
  const totalWithdrawals = useMemo(() => 
    Array.isArray(withdrawals) 
      ? withdrawals.reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0) 
      : 0, 
    [withdrawals]
  )
  
  const totalRevenue = totalDeposits - totalWithdrawals

  // Filtered deposits with safe checks
  const filteredDeposits = useMemo(() => {
    if (!Array.isArray(depositsData)) return []
    
    return depositsData.filter(deposit => {
      // Apply status filter
      if (depositStatusFilter !== 'all' && deposit.status !== depositStatusFilter) {
        return false
      }
      
      // Apply search filter
      if (!searchQuery) return true
      
      const query = searchQuery.toLowerCase()
      return (
        deposit.user?.username?.toLowerCase().includes(query) ||
        deposit.user?.first_name?.toLowerCase().includes(query) ||
        deposit.transaction_id?.toLowerCase().includes(query) ||
        deposit.method.toLowerCase().includes(query)
      )
    })
  }, [depositsData, depositStatusFilter, searchQuery])

  // POLLING SETUP
  useEffect(() => {
    console.log('AdminPanel: Setting up polling for real-time updates');
    
    let pollInterval: NodeJS.Timeout;
    let isActive = true;
    
    const pollForUpdates = async () => {
      if (!isActive) return;
      
      try {
        console.log('Polling: Checking for updates...');
        
        // Track previous pending counts for notifications
        const prevPendingCount = pendingDeposits.length;
        
        // Fetch latest stats based on active tab
        switch (activeNav) {
          case 'dashboard':
            await fetchDashboardData();
            break;
            
          case 'deposits':
            await fetchDepositsData();
            // Check for new pending deposits
            const newPendingCount = Array.isArray(depositsData) 
              ? depositsData.filter(d => d.status === 'pending').length 
              : 0;
            if (newPendingCount > prevPendingCount) {
              toast.info(`${newPendingCount - prevPendingCount} new pending deposit(s)`, {
                description: 'New deposits waiting for approval',
                duration: 5000,
              });
            }
            break;
            
          case 'users':
            await fetchUsersData();
            break;
            
          case 'withdrawals':
            await fetchWithdrawalsData();
            break;
            
          case 'transactions':
            await fetchTransactionsData();
            break;
            
          case 'games':
            await fetchGamesData();
            break;
            
          case 'analytics':
            await fetchAnalyticsData();
            break;
        }
        
        // Update last poll time on successful fetch
        setLastPollTime(new Date());
        
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    pollForUpdates();

    // Set up polling interval
    const setupPolling = () => {
      const isTabActive = !document.hidden;
      const intervalTime = isTabActive ? 15000 : 30000; // 15s active, 30s background
      
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(pollForUpdates, intervalTime);
    };

    setupPolling();

    const handleVisibilityChange = () => {
      setupPolling();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('AdminPanel: Cleaning up polling');
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeNav]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    console.log('fetchDashboardData: Starting');
    try {
      setIsLoading(true)
      const stats = await ClientAdminService.getDashboardStats()
      console.log('fetchDashboardData: Success', stats)
      setDashboardStats(stats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
      // Fallback mock data
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
  }, [])

  // Fetch users data
  const fetchUsersData = useCallback(async () => {
    console.log('=== FETCH USERS START ===');
    try {
      setIsLoading(true);
      
      const url = `/api/admin/working-users?page=${currentPage}&limit=${itemsPerPage}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const users = data.data.users || [];
        setUsersData(users);
        toast.success(`Loaded ${users.length} users`);
      } else {
        setUsersData([]);
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setUsersData([]);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH USERS END ===');
    }
  }, [currentPage, itemsPerPage]);

  // Fetch deposits data
  const fetchDepositsData = useCallback(async () => {
    console.log('=== FETCH DEPOSITS START ===');
    try {
      setIsLoading(true);
      
      const url = `/api/admin/working-data?type=deposits&page=${currentPage}&limit=${itemsPerPage}&status=${depositStatusFilter}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const deposits = data.data.deposits || [];
        
        // Format deposits safely
        const formattedDeposits = deposits.map((deposit: any) => ({
          id: deposit.id || '',
          user_id: deposit.user_id || '',
          amount: typeof deposit.amount === 'string' ? parseFloat(deposit.amount) : (deposit.amount || 0),
          method: deposit.method || 'telebirr',
          status: deposit.status || 'pending',
          transaction_id: deposit.transaction_ref || deposit.transaction_id,
          proof_image: deposit.screenshot_url || deposit.proof_image,
          admin_notes: deposit.admin_notes,
          approved_by: deposit.approved_by,
          approved_at: deposit.approved_at,
          created_at: deposit.created_at || new Date().toISOString(),
          updated_at: deposit.updated_at || new Date().toISOString(),
          user: {
            username: deposit.username || 'Unknown',
            first_name: deposit.first_name || 'User',
            telegram_id: deposit.telegram_id || 'N/A',
            balance: typeof deposit.user_balance === 'string' ? parseFloat(deposit.user_balance) : (deposit.user_balance || 0)
          }
        }));
        
        setDepositsData(formattedDeposits);
        
        if (formattedDeposits.length > 0) {
          toast.success(`Loaded ${formattedDeposits.length} deposits`);
        }
      } else {
        setDepositsData([]);
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      setDepositsData([]);
      toast.error(`Failed to load deposits: ${error.message}`);
    } finally {
      setIsLoading(false);
      console.log('=== FETCH DEPOSITS END ===');
    }
  }, [currentPage, itemsPerPage, depositStatusFilter]);

  // Fetch withdrawals data
  const fetchWithdrawalsData = useCallback(async () => {
    console.log('=== FETCH WITHDRAWALS START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/working-data?type=withdrawals&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success) {
        const withdrawals = data.data?.withdrawals || [];
        setWithdrawalsData(withdrawals);
        toast.success(`Loaded ${withdrawals.length} withdrawals`);
      } else {
        setWithdrawalsData([]);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      setWithdrawalsData([]);
      toast.error('Failed to load withdrawals');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH WITHDRAWALS END ===');
    }
  }, [currentPage, itemsPerPage]);

  // Fetch transactions data
  const fetchTransactionsData = useCallback(async () => {
    console.log('=== FETCH TRANSACTIONS START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/working-data?type=transactions&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success) {
        const transactions = data.data?.transactions || [];
        setTransactionsData(transactions);
        toast.success(`Loaded ${transactions.length} transactions`);
      } else {
        setTransactionsData([]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactionsData([]);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH TRANSACTIONS END ===');
    }
  }, [currentPage, itemsPerPage]);

  // Fetch games data
  const fetchGamesData = useCallback(async () => {
    console.log('=== FETCH GAMES START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/working-data?type=games&page=${currentPage}&limit=${itemsPerPage}`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success) {
        const games = data.data?.games || [];
        setGamesData(games);
        toast.success(`Loaded ${games.length} games`);
      } else {
        setGamesData([]);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setGamesData([]);
      toast.error('Failed to load games');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH GAMES END ===');
    }
  }, [currentPage, itemsPerPage]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    console.log('=== FETCH ANALYTICS START ===');
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics`);
      
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success) {
        setAnalyticsData(data.data);
        toast.success('Analytics data loaded');
      } else {
        setAnalyticsData(null);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalyticsData(null);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH ANALYTICS END ===');
    }
  }, []);

  // Handle navigation click
  const handleNavClick = useCallback((navId: string) => {
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
  }, [fetchDashboardData, fetchUsersData, fetchDepositsData, fetchWithdrawalsData, fetchGamesData, fetchTransactionsData, fetchAnalyticsData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
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
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [activeNav, fetchDashboardData, fetchUsersData, fetchDepositsData, fetchWithdrawalsData, fetchGamesData, fetchTransactionsData, fetchAnalyticsData]);

  // Approve deposit
  const handleApproveDeposit = useCallback(async (depositId: string) => {
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
      
      const payload = {
        action: 'approve',
        type: 'deposits',
        ids: [depositId]
      };
      
      const response = await fetch('/api/admin/working-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('✅ Deposit approved successfully!');
        
        setDepositsData(prev => prev.map(d => 
          d.id === depositId 
            ? { ...d, status: 'approved', approved_by: 'admin', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : d
        ));
        
        setTimeout(() => fetchDepositsData(), 1000);
        fetchDashboardData();
      } else {
        toast.error(data.message || 'Failed to approve deposit');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsProcessingDeposit(false);
    }
  }, [depositsData, fetchDepositsData, fetchDashboardData]);

  // Reject deposit
  const handleRejectDeposit = useCallback(async (depositId: string, reason: string = '') => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Are you sure you want to reject this deposit?')) {
      return;
    }

    try {
      setIsProcessingDeposit(true);

      const response = await fetch('/api/admin/working-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          type: 'deposits',
          ids: [depositId],
          admin_notes: reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Deposit rejected successfully!');
        setDepositsData(prev => prev.map(deposit =>
          deposit.id === depositId ? { ...deposit, status: 'rejected' } : deposit
        ));
        setRejectReason('');
        fetchDashboardData();
      } else {
        toast.error(data.message || 'Failed to reject deposit');
      }
    } catch (error) {
      toast.error('Failed to reject deposit');
    } finally {
      setIsProcessingDeposit(false);
      setShowDepositDetails(false);
    }
  }, [fetchDashboardData]);

  // View deposit details
  const handleViewDepositDetails = useCallback((deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setShowDepositDetails(true);
  }, []);

  // Bulk approve deposits
  const handleBulkApproveDeposits = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.warning('No deposits selected');
      return;
    }

    if (!confirm(`Approve ${selectedItems.length} deposits?`)) return;

    try {
      setIsProcessingDeposit(true);
      const response = await fetch('/api/admin/deposits/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_ids: selectedItems,
          admin_notes: 'Bulk approved by admin',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${selectedItems.length} deposits approved!`);
        fetchDepositsData();
        fetchDashboardData();
        setSelectedItems([]);
      } else {
        toast.error(data.message || 'Failed to approve deposits');
      }
    } catch (error) {
      toast.error('Failed to approve deposits');
    } finally {
      setIsProcessingDeposit(false);
    }
  }, [selectedItems, fetchDepositsData, fetchDashboardData]);

  // Bulk reject deposits
  const handleBulkRejectDeposits = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.warning('No deposits selected');
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    if (!confirm(`Reject ${selectedItems.length} deposits?`)) return;

    try {
      setIsProcessingDeposit(true);
      const response = await fetch('/api/admin/deposits/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_ids: selectedItems,
          admin_notes: rejectReason,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${selectedItems.length} deposits rejected!`);
        fetchDepositsData();
        fetchDashboardData();
        setSelectedItems([]);
        setRejectReason('');
      } else {
        toast.error(data.message || 'Failed to reject deposits');
      }
    } catch (error) {
      toast.error('Failed to reject deposits');
    } finally {
      setIsProcessingDeposit(false);
    }
  }, [selectedItems, rejectReason, fetchDepositsData, fetchDashboardData]);

  // Chart data with safe checks
  const revenueChartData = useMemo(() => {
    if (!dashboardStats) return []
    return [
      { name: 'Deposits', value: dashboardStats.total_deposits_amount || 0, color: CHART_COLORS.success },
      { name: 'Withdrawals', value: dashboardStats.total_withdrawals_amount || 0, color: CHART_COLORS.danger },
      { name: 'Revenue', value: dashboardStats.total_revenue || 0, color: CHART_COLORS.primary },
    ]
  }, [dashboardStats])

  const userGrowthData = useMemo(() => [
    { month: 'Jan', users: 100 },
    { month: 'Feb', users: 150 },
    { month: 'Mar', users: 200 },
    { month: 'Apr', users: 250 },
    { month: 'May', users: 300 },
    { month: 'Jun', users: dashboardStats?.total_users || 350 },
  ], [dashboardStats])

  // Render Sidebar
  const renderSidebar = useCallback(() => (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-background border-r transition-all duration-300 ease-in-out",
      isSidebarCollapsed ? "w-20" : "w-64",
      "lg:relative lg:translate-x-0",
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
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
          {isSidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
  ), [isSidebarCollapsed, isMobileMenuOpen, activeNav, user, pendingDeposits.length, onlineUsers.length, handleNavClick, logout]);

  // Render Dashboard
  const renderDashboard = useCallback(() => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}. Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-2">
          {lastPollTime && (
            <div className="text-xs text-muted-foreground mr-2">
              Last updated: {lastPollTime.toLocaleTimeString()}
            </div>
          )}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats ? [
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
            value: `ETB ${(dashboardStats.total_deposits_amount || 0).toLocaleString()}`,
            change: `${dashboardStats.revenue_growth || 0}%`,
            isPositive: (dashboardStats.revenue_growth || 0) >= 0,
            icon: DollarSign,
            color: "bg-primary/10 text-primary",
          },
          {
            title: "Active Users",
            value: (dashboardStats.active_users || 0).toLocaleString(),
            change: `${dashboardStats.user_growth || 0}%`,
            isPositive: (dashboardStats.user_growth || 0) >= 0,
            icon: Users,
            color: "bg-success/10 text-success",
          },
          {
            title: "Daily Winners",
            value: (dashboardStats.daily_winners || 0).toLocaleString(),
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
        }) : (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse flex items-center justify-between">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="text-right space-y-2">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-6 w-24 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Total deposits, withdrawals, and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {revenueChartData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
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
  ), [user, lastPollTime, handleRefresh, isRefreshing, dashboardStats, pendingDeposits.length, revenueChartData, userGrowthData]);

  // Render Users
  const renderUsers = useCallback(() => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users and their accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {lastPollTime && (
            <div className="text-xs text-muted-foreground mr-2">
              Last updated: {lastPollTime.toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" onClick={fetchUsersData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

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
              <Button variant="outline" className="mt-4" onClick={fetchUsersData} disabled={isLoading}>
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
                            <div className="font-medium">{user.username || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{user.first_name || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{user.telegram_id || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{Number(user.balance || 0).toFixed(2)} ETB</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role || 'user'}
                          </Badge>
                          <Badge variant={user.is_online ? 'default' : 'outline'}>
                            {user.is_online ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
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
  ), [lastPollTime, fetchUsersData, isLoading, usersData]);

  // Render Deposits
  const renderDeposits = useCallback(() => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deposit Management</h1>
          <p className="text-muted-foreground">Review and approve user deposit requests</p>
        </div>
        <div className="flex items-center gap-2">
          {lastPollTime && (
            <div className="text-xs text-muted-foreground mr-2">
              Last updated: {lastPollTime.toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" onClick={fetchDepositsData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

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
            value: `ETB ${depositsData.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}`,
            description: "All deposits",
            icon: DollarSign,
            color: "bg-primary/10 text-primary",
          },
          {
            title: "Approved Today",
            value: depositsData.filter(d => 
              d.status === 'approved' && 
              d.updated_at && new Date(d.updated_at).toDateString() === new Date().toDateString()
            ).length.toString(),
            description: "Successful",
            icon: CheckCircle,
            color: "bg-success/10 text-success",
          },
          {
            title: "Rejected Today",
            value: depositsData.filter(d => 
              d.status === 'rejected' && 
              d.updated_at && new Date(d.updated_at).toDateString() === new Date().toDateString()
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

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <Input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedItems.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedItems.length} deposits selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleBulkApproveDeposits} disabled={isProcessingDeposit}>
                  {isProcessingDeposit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={isProcessingDeposit}>
                      <Ban className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Deposits</DialogTitle>
                      <DialogDescription>
                        Provide a reason for rejecting {selectedItems.length} deposit(s).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Rejection Reason</Label>
                        <Input
                          placeholder="Enter reason..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleBulkRejectDeposits}
                        disabled={!rejectReason.trim() || isProcessingDeposit}
                        className="w-full"
                      >
                        {isProcessingDeposit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                        Confirm Rejection
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Button variant="outline" className="mt-4" onClick={fetchDepositsData} disabled={isLoading}>
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
                        checked={selectedItems.length === filteredDeposits.length && filteredDeposits.length > 0}
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
                        <div className="font-bold text-lg">{Number(deposit.amount || 0).toFixed(2)} ETB</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {deposit.method || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          deposit.status === 'approved' ? 'default' :
                          deposit.status === 'pending' ? 'warning' :
                          deposit.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {deposit.status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm truncate max-w-[150px]">
                          {deposit.transaction_id || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {deposit.created_at ? new Date(deposit.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {deposit.created_at ? new Date(deposit.created_at).toLocaleTimeString() : ''}
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
                                      Provide a reason for rejecting this deposit of {deposit.amount} ETB.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Rejection Reason</Label>
                                      <Input
                                        placeholder="Enter reason..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => handleRejectDeposit(deposit.id, rejectReason)}
                                      disabled={!rejectReason.trim() || isProcessingDeposit}
                                      className="w-full"
                                    >
                                      {isProcessingDeposit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                                      Confirm Rejection
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
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
  ), [lastPollTime, fetchDepositsData, isLoading, depositsData, pendingDeposits.length, searchQuery, depositStatusFilter, dateRange, selectedItems, isProcessingDeposit, handleBulkApproveDeposits, handleBulkRejectDeposits, rejectReason, filteredDeposits, handleViewDepositDetails, handleApproveDeposit, handleRejectDeposit]);

  // Placeholder renders for other sections
  const renderWithdrawals = useCallback(() => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Withdrawal Management</h1>
        {lastPollTime && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastPollTime.toLocaleTimeString()}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Withdrawal management coming soon...
        </CardContent>
      </Card>
    </div>
  ), [lastPollTime]);

  const renderGames = useCallback(() => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Games Management</h1>
        {lastPollTime && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastPollTime.toLocaleTimeString()}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Games management coming soon...
        </CardContent>
      </Card>
    </div>
  ), [lastPollTime]);

  const renderTransactions = useCallback(() => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
        {lastPollTime && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastPollTime.toLocaleTimeString()}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Transaction history coming soon...
        </CardContent>
      </Card>
    </div>
  ), [lastPollTime]);

  const renderAnalytics = useCallback(() => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        {lastPollTime && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastPollTime.toLocaleTimeString()}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Analytics dashboard coming soon...
        </CardContent>
      </Card>
    </div>
  ), [lastPollTime]);

  const renderSettings = useCallback(() => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Settings coming soon...
        </CardContent>
      </Card>
    </div>
  ), []);

  return (
    <div className="flex min-h-screen bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {renderSidebar()}

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 overflow-auto">
        <div className="container max-w-7xl mx-auto p-4 lg:p-6">
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
                  <p className="text-sm font-mono">{selectedDeposit.id || 'N/A'}</p>
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
                      <p className="text-xs text-muted-foreground">ID: {selectedDeposit.user_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <p className="text-2xl font-bold text-primary">{Number(selectedDeposit.amount || 0).toFixed(2)} ETB</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <p className="text-sm font-medium">{selectedDeposit.method || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Badge variant={
                      selectedDeposit.status === 'approved' ? 'default' :
                      selectedDeposit.status === 'pending' ? 'warning' :
                      selectedDeposit.status === 'rejected' ? 'destructive' : 'secondary'
                    } className="mt-1">
                      {selectedDeposit.status?.toUpperCase() || 'UNKNOWN'}
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
                      {selectedDeposit.approved_at ? new Date(selectedDeposit.approved_at).toLocaleString() : ''}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Created</Label>
                    <p className="text-sm">{selectedDeposit.created_at ? new Date(selectedDeposit.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Last Updated</Label>
                    <p className="text-sm">{selectedDeposit.updated_at ? new Date(selectedDeposit.updated_at).toLocaleString() : 'N/A'}</p>
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
                    {isProcessingDeposit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="flex-1" disabled={isProcessingDeposit}>
                        <Ban className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Deposit</DialogTitle>
                        <DialogDescription>
                          Provide a reason for rejecting this deposit.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Rejection Reason</Label>
                          <Input
                            placeholder="Enter reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={() => handleRejectDeposit(selectedDeposit.id, rejectReason)}
                          disabled={!rejectReason.trim() || isProcessingDeposit}
                          className="w-full"
                        >
                          {isProcessingDeposit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
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
    </div>
  );
}

export const AdminPanel = AdminPanelEnhanced;
export default AdminPanelEnhanced;