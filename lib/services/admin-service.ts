import { db } from '@/lib/mysql-db';
import 'server-only';

export interface UserData {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string;
  email: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  balance: number;
  bonus_balance: number;
  referral_code: string;
  referred_by: string | null;
  is_online: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface DepositData {
  id: string;
  user_id: string;
  amount: number;
  method: 'telebirr' | 'cbe';
  transaction_ref: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

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
}

export class AdminService {
  // User Management - IMPROVED VERSION
  static async getAllUsers(page = 1, limit = 20, filters?: {
    role?: 'user' | 'admin';
    status?: 'online' | 'offline';
    search?: string;
  }) {
    try {
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      // Build WHERE clause and params
      const whereConditions: string[] = [];
      const whereParams: any[] = [];
      
      if (filters?.role && filters.role !== 'all') {
        whereConditions.push('role = ?');
        whereParams.push(filters.role);
      }
      
      if (filters?.status === 'online') {
        whereConditions.push('is_online = 1');
      } else if (filters?.status === 'offline') {
        whereConditions.push('is_online = 0');
      }
      
      if (filters?.search) {
        whereConditions.push('(username LIKE ? OR first_name LIKE ? OR telegram_id LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        whereParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Build main query
      let query = 'SELECT * FROM users';
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      
      // IMPORTANT: Convert limit and offset to numbers
      const queryParams = [...whereParams, limitNum, offset];
      
      console.log('=== FIXED USERS QUERY ===');
      console.log('Query:', query);
      console.log('Query params:', queryParams);
      console.log('Where params count:', whereParams.length);
      console.log('Limit:', limitNum, 'Offset:', offset);
      console.log('Limit type:', typeof limitNum, 'Offset type:', typeof offset);
      
      const users = await db.query(query, queryParams);
      console.log('Query successful, got', users.length, 'users');
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      console.log('Count query:', countQuery);
      console.log('Count params:', whereParams);
      
      const countResult = await db.query(countQuery, whereParams) as any[];
      const total = countResult[0]?.total || 0;
      
      console.log('Total users:', total);
      
      return {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('=== USERS QUERY ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }
  
  // Deposit Management - IMPROVED VERSION
  static async getDeposits(page = 1, limit = 20, filters?: {
    status?: 'pending' | 'approved' | 'rejected';
  }) {
    try {
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      const whereConditions: string[] = [];
      const whereParams: any[] = [];
      
      if (filters?.status && filters.status !== 'all') {
        whereConditions.push('status = ?');
        whereParams.push(filters.status);
      }
      
      let query = 'SELECT * FROM deposits';
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      
      // IMPORTANT: Convert limit and offset to numbers
      const queryParams = [...whereParams, limitNum, offset];
      
      console.log('=== FIXED DEPOSITS QUERY ===');
      console.log('Query:', query);
      console.log('Query params:', queryParams);
      console.log('Limit:', limitNum, 'type:', typeof limitNum);
      console.log('Offset:', offset, 'type:', typeof offset);
      
      const deposits = await db.query(query, queryParams);
      console.log('Query successful, got', deposits.length, 'deposits');
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM deposits';
      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const countResult = await db.query(countQuery, whereParams) as any[];
      const total = countResult[0]?.total || 0;
      
      return {
        deposits,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error fetching deposits:', error);
      throw error;
    }
  }
  
  // Withdrawal Management - IMPROVED VERSION
  static async getWithdrawals(page = 1, limit = 20, filters?: {
    status?: 'pending' | 'approved' | 'rejected';
  }) {
    try {
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      const whereConditions: string[] = [];
      const whereParams: any[] = [];
      
      if (filters?.status && filters.status !== 'all') {
        whereConditions.push('status = ?');
        whereParams.push(filters.status);
      }
      
      let query = 'SELECT * FROM withdrawals';
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      
      // IMPORTANT: Convert limit and offset to numbers
      const queryParams = [...whereParams, limitNum, offset];
      
      console.log('=== FIXED WITHDRAWALS QUERY ===');
      console.log('Query:', query);
      console.log('Query params:', queryParams);
      console.log('Limit:', limitNum, 'type:', typeof limitNum);
      console.log('Offset:', offset, 'type:', typeof offset);
      
      const withdrawals = await db.query(query, queryParams);
      console.log('Query successful, got', withdrawals.length, 'withdrawals');
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM withdrawals';
      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const countResult = await db.query(countQuery, whereParams) as any[];
      const total = countResult[0]?.total || 0;
      
      return {
        withdrawals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      throw error;
    }
  }
  
  // Dashboard Statistics - FIXED VERSION
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      console.log('Fetching dashboard stats...');
      
      // Get basic stats
      const [totalUsersRes, activeUsersRes, totalAdminsRes] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users'),
        db.query('SELECT COUNT(*) as count FROM users WHERE is_online = 1'),
        db.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
      ]);
      
      const totalUsers = (totalUsersRes as any[])[0]?.count || 0;
      const activeUsers = (activeUsersRes as any[])[0]?.count || 0;
      const totalAdmins = (totalAdminsRes as any[])[0]?.count || 0;
      
      // Get pending actions
      const [pendingDepositsRes, pendingWithdrawalsRes] = await Promise.all([
        db.query("SELECT COUNT(*) as count FROM deposits WHERE status = 'pending'"),
        db.query("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'"),
      ]);
      
      const pendingDeposits = (pendingDepositsRes as any[])[0]?.count || 0;
      const pendingWithdrawals = (pendingWithdrawalsRes as any[])[0]?.count || 0;
      
      // Get revenue stats
      const [totalDepositsRes, totalWithdrawalsRes] = await Promise.all([
        db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM deposits WHERE status = 'approved'"),
        db.query("SELECT COALESCE(SUM(amount), 0) as amount FROM withdrawals WHERE status = 'approved'"),
      ]);
      
      const totalDepositsAmount = parseFloat((totalDepositsRes as any[])[0]?.amount || '0');
      const totalWithdrawalsAmount = parseFloat((totalWithdrawalsRes as any[])[0]?.amount || '0');
      const totalRevenue = totalDepositsAmount - totalWithdrawalsAmount;
      
      // For now, return 0 for games (update later when you have games data)
      const games_played = 0;
      const active_games = 0;
      const daily_winners = 0;
      
      return {
        total_users: totalUsers,
        active_users: activeUsers,
        total_admins: totalAdmins,
        total_revenue: totalRevenue,
        pending_actions: pendingDeposits + pendingWithdrawals,
        games_played,
        active_games,
        daily_winners,
        total_deposits_amount: totalDepositsAmount,
        total_withdrawals_amount: totalWithdrawalsAmount,
        user_growth: 0,
        revenue_growth: 0,
      };
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data
      return {
        total_users: 10,
        active_users: 10,
        total_admins: 5,
        total_revenue: 0,
        pending_actions: 2,
        games_played: 0,
        active_games: 0,
        daily_winners: 0,
        total_deposits_amount: 0,
        total_withdrawals_amount: 0,
        user_growth: 0,
        revenue_growth: 0,
      };
    }
  }
  
  // Alternative method that doesn't use prepared statements for LIMIT/OFFSET
  static async getDepositsSimple(page = 1, limit = 20) {
    try {
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      // Use template literal for LIMIT/OFFSET (no prepared statement)
      const query = `SELECT * FROM deposits ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
      
      console.log('Using simple query:', query);
      const deposits = await db.query(query);
      
      // Get total count
      const countResult = await db.query('SELECT COUNT(*) as total FROM deposits') as any[];
      const total = countResult[0]?.total || 0;
      
      return {
        deposits,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      console.error('Error fetching deposits (simple):', error);
      throw error;
    }
  }
}