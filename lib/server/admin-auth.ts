import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface AdminUser {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  role: 'user' | 'admin';
}

export async function verifyAdminAuth(): Promise<{ user: AdminUser | null; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return { user: null, error: 'No authentication token found' };
    }
    
    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if user is admin
    if (payload.role !== 'admin') {
      return { user: null, error: 'User is not an admin' };
    }
    
    const user: AdminUser = {
      id: payload.userId as string,
      telegram_id: payload.telegram_id as string,
      username: payload.username as string,
      first_name: payload.first_name as string,
      role: payload.role as 'user' | 'admin',
    };
    
    return { user };
    
  } catch (error) {
    console.error('Admin auth error:', error);
    return { user: null, error: 'Invalid or expired token' };
  }
}