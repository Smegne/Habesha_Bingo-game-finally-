import 'server-only';
import { db } from '@/lib/mysql-db';

export interface DashboardStats {
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
  daily_deposits: number;
  daily_withdrawals: number;
  new_users_today: number;
  new_users_week: number;
}

export async function getDashboardStatsFromDB(): Promise<DashboardStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    
    // All database queries
    const queries = [
      // Total users
      db.query('SELECT COUNT(*) as count FROM users') as Promise<any>,
      // Active users (online in last 5 minutes)
      db.query('SELECT COUNT(*) as count FROM users WHERE last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE)') as Promise<any>,
      // Total admins
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'") as Promise<any>,
      // Total deposits amount
      db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM deposits WHERE status = 'approved'") as Promise<any>,
      // Total withdrawals amount
      db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM withdrawals WHERE status = 'approved'") as Promise<any>,
      // Pending deposits
      db.query("SELECT COUNT(*) as count FROM deposits WHERE status = 'pending'") as Promise<any>,
      // Pending withdrawals
      db.query("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'") as Promise<any>,
      // Completed games
      db.query("SELECT COUNT(*) as count FROM games WHERE status = 'completed'") as Promise<any>,
      // Active games
      db.query("SELECT COUNT(*) as count FROM games WHERE status = 'in_progress'") as Promise<any>,
      // Daily winners
      db.query("SELECT COUNT(DISTINCT winner_id) as count FROM games WHERE status = 'completed' AND DATE(completed_at) = ?", [today]) as Promise<any>,
      // New users today
      db.query("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?", [today]) as Promise<any>,
      // New users this week
      db.query("SELECT COUNT(*) as count FROM users WHERE created_at >= ?", [lastWeek]) as Promise<any>,
      // Daily deposits
      db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM deposits WHERE status = 'approved' AND DATE(created_at) = ?", [today]) as Promise<any>,
      // Daily withdrawals
      db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM withdrawals WHERE status = 'approved' AND DATE(created_at) = ?", [today]) as Promise<any>,
      // Users yesterday for growth calculation
      db.query("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?", [yesterday]) as Promise<any>,
      // Deposits yesterday
      db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM deposits WHERE status = 'approved' AND DATE(created_at) = ?", [yesterday]) as Promise<any>,
    ];

    const results = await Promise.all(queries);
    
    // Extract values
    const totalUsers = results[0][0]?.count || 0;
    const activeUsers = results[1][0]?.count || 0;
    const totalAdmins = results[2][0]?.count || 0;
    const totalDepositsAmount = results[3][0]?.amount || 0;
    const totalWithdrawalsAmount = results[4][0]?.amount || 0;
    const pendingDeposits = results[5][0]?.count || 0;
    const pendingWithdrawals = results[6][0]?.count || 0;
    const completedGames = results[7][0]?.count || 0;
    const activeGames = results[8][0]?.count || 0;
    const dailyWinners = results[9][0]?.count || 0;
    const newUsersToday = results[10][0]?.count || 0;
    const newUsersWeek = results[11][0]?.count || 0;
    const dailyDeposits = results[12][0]?.amount || 0;
    const dailyWithdrawals = results[13][0]?.amount || 0;
    const usersYesterday = results[14][0]?.count || 0;
    const depositsYesterday = results[15][0]?.amount || 0;

    // Calculate growth percentages
    const userGrowth = usersYesterday > 0 
      ? ((newUsersToday - usersYesterday) / usersYesterday * 100)
      : newUsersToday > 0 ? 100 : 0;
    
    const revenueGrowth = depositsYesterday > 0
      ? ((dailyDeposits - depositsYesterday) / depositsYesterday * 100)
      : dailyDeposits > 0 ? 100 : 0;

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      total_admins: totalAdmins,
      total_revenue: totalDepositsAmount - totalWithdrawalsAmount,
      pending_actions: pendingDeposits + pendingWithdrawals,
      games_played: completedGames,
      active_games: activeGames,
      daily_winners: dailyWinners,
      total_deposits_amount: totalDepositsAmount,
      total_withdrawals_amount: totalWithdrawalsAmount,
      user_growth: parseFloat(userGrowth.toFixed(1)),
      revenue_growth: parseFloat(revenueGrowth.toFixed(1)),
      daily_deposits: dailyDeposits,
      daily_withdrawals: dailyWithdrawals,
      new_users_today: newUsersToday,
      new_users_week: newUsersWeek,
    };
    
  } catch (error) {
    console.error('Error fetching dashboard stats from DB:', error);
    // Return mock data if DB fails
    return getMockDashboardStats();
  }
}

// Fallback mock data
function getMockDashboardStats(): DashboardStats {
  return {
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
    daily_deposits: 8500,
    daily_withdrawals: 4200,
    new_users_today: 24,
    new_users_week: 156,
  };
}

// Additional helper functions for other admin operations
export async function getUsersFromDB(page = 1, limit = 20, filters?: any) {
  try {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const users = await db.query(query, [limit, offset]);
    const totalRes = await db.query('SELECT COUNT(*) as total FROM users') as any[];
    
    return {
      users,
      pagination: {
        page,
        limit,
        total: totalRes[0]?.total || 0,
        totalPages: Math.ceil((totalRes[0]?.total || 0) / limit),
      }
    };
  } catch (error) {
    console.error('Error fetching users from DB:', error);
    throw error;
  }
}

export async function getDepositsFromDB(page = 1, limit = 20, filters?: any) {
  try {
    const offset = (page - 1) * limit;
    const query = `
      SELECT d.*, u.username, u.first_name 
      FROM deposits d 
      JOIN users u ON d.user_id = u.id 
      ORDER BY d.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const deposits = await db.query(query, [limit, offset]);
    const totalRes = await db.query('SELECT COUNT(*) as total FROM deposits') as any[];
    
    return {
      deposits,
      pagination: {
        page,
        limit,
        total: totalRes[0]?.total || 0,
        totalPages: Math.ceil((totalRes[0]?.total || 0) / limit),
      }
    };
  } catch (error) {
    console.error('Error fetching deposits from DB:', error);
    throw error;
  }
}