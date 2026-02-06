import 'server-only';

export interface AuthUser {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  role: 'user' | 'admin';
}

export async function simpleAuthCheck(request: Request): Promise<{ user: AuthUser | null; error?: string }> {
  try {
    // For now, let's just check if there's a cookie
    const cookies = request.headers.get('cookie');
    
    if (!cookies) {
      console.log('No cookies found');
      return { user: null, error: 'No authentication found' };
    }
    
    // Check if token exists in cookies
    const tokenMatch = cookies.match(/token=([^;]+)/);
    
    if (!tokenMatch) {
      console.log('No token found in cookies');
      return { user: null, error: 'No token found' };
    }
    
    // For development, let's accept any token
    // In production, you should verify the JWT
    console.log('Token found, accepting for development');
    
    // Create a mock admin user for development
    const user: AuthUser = {
      id: 'admin-id-123',
      telegram_id: 'admin-telegram',
      username: 'admin',
      first_name: 'Admin',
      role: 'admin',
    };
    
    return { user };
    
  } catch (error) {
    console.error('Auth check error:', error);
    return { user: null, error: 'Authentication error' };
  }
}