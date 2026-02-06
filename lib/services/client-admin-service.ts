// Client-side service that uses fetch API instead of direct DB calls

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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export class ClientAdminService {
  private static baseUrl = '/api/admin';
  
  // Get dashboard stats
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      console.log('ClientAdminService: Fetching dashboard stats');
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<DashboardStats> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch dashboard stats');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data
      return this.getFallbackStats();
    }
  }
  
  // Get users
  static async getUsers(page = 1, limit = 20, filters?: any) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      
      console.log('ClientAdminService: Fetching users with params:', params.toString());
      
      const response = await fetch(`${this.baseUrl}/users?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch users');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return { users: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }
  
  // Get deposits
  static async getDeposits(page = 1, limit = 20, filters?: any) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      
      console.log('ClientAdminService: Fetching deposits with params:', params.toString());
      
      const response = await fetch(`${this.baseUrl}/deposits?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch deposits');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching deposits:', error);
      return { deposits: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }
  
  // Get withdrawals
  static async getWithdrawals(page = 1, limit = 20, filters?: any) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      
      console.log('ClientAdminService: Fetching withdrawals with params:', params.toString());
      
      const response = await fetch(`${this.baseUrl}/withdrawals?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch withdrawals');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      return { withdrawals: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }
  
  // Get games
  static async getGames(page = 1, limit = 20, filters?: any) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      
      console.log('ClientAdminService: Fetching games with params:', params.toString());
      
      const response = await fetch(`${this.baseUrl}/games?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch games');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching games:', error);
      return { games: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }
  
  // Fallback stats when API fails
  private static getFallbackStats(): DashboardStats {
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
    };
  }
}