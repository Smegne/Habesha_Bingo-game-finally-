"use client"

import { useState, useEffect } from "react"
import { useGameStore } from "@/lib/game-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  LogOut,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  UserPlus,
  UserMinus,
  CreditCard,
  Wallet,
  Gamepad2,
  Trophy,
  History,
  BarChart3,
  Settings
} from "lucide-react"

export function AdminPanel() {
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
    approveDeposit,
    rejectDeposit,
    approveWithdrawal,
    rejectWithdrawal
  } = useGameStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notes, setNotes] = useState("")

  // Fetch admin data on mount
  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAdminData()
    setIsRefreshing(false)
  }

  const handleApproveDeposit = async (depositId: string) => {
    await approveDeposit(depositId, notes || "Approved by admin")
    setNotes("")
  }

  const handleRejectDeposit = async (depositId: string) => {
    await rejectDeposit(depositId, notes || "Rejected by admin")
    setNotes("")
  }

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    await approveWithdrawal(withdrawalId, notes || "Approved by admin")
    setNotes("")
  }

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    await rejectWithdrawal(withdrawalId, notes || "Rejected by admin")
    setNotes("")
  }

  // Filter data based on search
  const filteredUsers = allUsers.filter((u: any) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.telegram_id?.includes(searchQuery)
  )

  const pendingDeposits = deposits.filter((d: any) => d.status === 'pending')
  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'pending')
  const onlineUsers = allUsers.filter((u: any) => u.is_online)
  const adminUsers = allUsers.filter((u: any) => u.role === 'admin')

  // Stats calculations
  const totalDeposits = deposits.reduce((sum: number, d: any) => sum + d.amount, 0)
  const totalWithdrawals = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0)
  const totalRevenue = totalDeposits - totalWithdrawals

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-bold text-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg">Habesha Bingo Admin</span>
              <p className="text-xs opacity-80">Welcome, {user?.firstName} ({user?.role})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              <UserCheck className="mr-1 h-3 w-3" />
              {onlineUsers.length} Online
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto p-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="text-green-600">{onlineUsers.length} online</span>
                <span className="mx-2">•</span>
                <span>{adminUsers.length} admins</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Actions</p>
                  <p className="text-2xl font-bold">{pendingDeposits.length + pendingWithdrawals.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span>{pendingDeposits.length} deposits</span>
                <span className="mx-2">•</span>
                <span>{pendingWithdrawals.length} withdrawals</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span>Deposits: {totalDeposits.toFixed(2)}</span>
                <span className="mx-2">•</span>
                <span>Withdrawals: {totalWithdrawals.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Game Activity</p>
                  <p className="text-2xl font-bold">{gamesPlayed}</p>
                </div>
                <Gamepad2 className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span>{activePlayers} active players</span>
                <span className="mx-2">•</span>
                <span>{dailyWinners} daily winners</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="deposits">
              <CreditCard className="mr-2 h-4 w-4" />
              Deposits
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
              <Wallet className="mr-2 h-4 w-4" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="games">
              <Gamepad2 className="mr-2 h-4 w-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="logs">
              <History className="mr-2 h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all registered users</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-9 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="admins">Admins</SelectItem>
                        <SelectItem value="players">Players</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium">
                    <div className="col-span-3">User</div>
                    <div className="col-span-2">Telegram ID</div>
                    <div className="col-span-2">Balance</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Joined</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {filteredUsers.map((user: any) => (
                      <div key={user.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                        <div className="col-span-3">
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.first_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <div className="col-span-2 font-mono text-sm">{user.telegram_id}</div>
                        <div className="col-span-2">
                          <div className="font-bold">{parseFloat(user.balance).toFixed(2)} Birr</div>
                          <div className="text-xs text-muted-foreground">
                            Bonus: {parseFloat(user.bonus_balance).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            <Badge variant={user.is_online ? 'default' : 'outline'}>
                              {user.is_online ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                        <div className="col-span-2 text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <div className="col-span-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                                <DialogDescription>
                                  Complete information for {user.username}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Username</Label>
                                    <div className="font-medium">{user.username}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Full Name</Label>
                                    <div className="font-medium">{user.first_name}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Email</Label>
                                    <div className="font-medium">{user.email}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Telegram ID</Label>
                                    <div className="font-mono text-sm">{user.telegram_id}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Phone</Label>
                                    <div className="font-medium">{user.phone || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Referral Code</Label>
                                    <div className="font-mono text-sm">{user.referral_code}</div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Main Balance</Label>
                                    <div className="text-lg font-bold text-primary">
                                      {parseFloat(user.balance).toFixed(2)} Birr
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Bonus Balance</Label>
                                    <div className="text-lg font-bold text-secondary">
                                      {parseFloat(user.bonus_balance).toFixed(2)} Birr
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button className="flex-1" variant="outline">
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Edit User
                                  </Button>
                                  <Button className="flex-1" variant="outline">
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Adjust Balance
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Management</CardTitle>
                <CardDescription>Approve or reject deposit requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {pendingDeposits.length} Pending Deposits
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Total: {totalDeposits.toFixed(2)} Birr
                    </div>
                  </div>
                  
                  {pendingDeposits.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending deposits</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <Label>Admin Notes</Label>
                        <Input
                          placeholder="Enter notes for approval/rejection..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                      
                      {pendingDeposits.map((deposit: any) => (
                        <div key={deposit.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{deposit.username}</span>
                                <Badge variant="outline">@{deposit.telegram_id}</Badge>
                              </div>
                              <div className="text-2xl font-bold text-primary">
                                {deposit.amount} Birr
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Via {deposit.method} • {new Date(deposit.created_at).toLocaleString()}
                              </div>
                              {deposit.screenshot_url && (
                                <div className="mt-2">
                                  <a 
                                    href={deposit.screenshot_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View Payment Proof
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApproveDeposit(deposit.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectDeposit(deposit.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Management</CardTitle>
                <CardDescription>Process withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {pendingWithdrawals.length} Pending Withdrawals
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Total: {totalWithdrawals.toFixed(2)} Birr
                    </div>
                  </div>
                  
                  {pendingWithdrawals.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending withdrawals</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <Label>Admin Notes</Label>
                        <Input
                          placeholder="Enter notes for approval/rejection..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                      
                      {pendingWithdrawals.map((withdrawal: any) => (
                        <div key={withdrawal.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{withdrawal.username}</span>
                                <Badge variant="outline">@{withdrawal.telegram_id}</Badge>
                              </div>
                              <div className="text-2xl font-bold text-primary">
                                {withdrawal.amount} Birr
                              </div>
                              <div className="text-sm">
                                To: <span className="font-mono">{withdrawal.account_number}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Via {withdrawal.method} • {new Date(withdrawal.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectWithdrawal(withdrawal.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Game Management</CardTitle>
                <CardDescription>Monitor and manage games</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Active Games</p>
                          <p className="text-2xl font-bold">0</p>
                        </div>
                        <Gamepad2 className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed Games</p>
                          <p className="text-2xl font-bold">{completedGames.length}</p>
                        </div>
                        <Trophy className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold">Recent Winners</h3>
                  {completedGames.filter((g: any) => g.winner).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No completed games yet</p>
                  ) : (
                    <div className="space-y-2">
                      {completedGames
                        .filter((g: any) => g.winner)
                        .slice(0, 5)
                        .map((game: any) => (
                          <div key={game.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                            <div>
                              <span className="font-medium">{game.winnerName || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                Card #{game.cardId} - {game.stake} Birr
                              </span>
                            </div>
                            <Badge variant="secondary">
                              Won: {(game.stake || 10) * 5} Birr
                            </Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Logs</CardTitle>
                <CardDescription>Administrative activity history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {approvalLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No logs available</p>
                  ) : (
                    <div className="space-y-2">
                      {approvalLogs.slice().reverse().map((log: any) => (
                        <div key={log.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {log.action.replace('_', ' ').toUpperCase()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Admin ID: {log.adminId} • Target: {log.targetId}
                              </div>
                              {log.notes && (
                                <div className="text-sm mt-1 p-2 bg-muted rounded">
                                  Notes: {log.notes}
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}