import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/mysql-db';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthUser {
  userId: string;
  telegramId: string;
  username: string;
  role: 'user' | 'admin';
}

export async function authMiddleware(request: NextRequest): Promise<{
  user: AuthUser | null;
  userId?: string;
}> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Verify user exists in database
    const user = await db.query(
      'SELECT id, telegram_id, username, role FROM users WHERE id = ?',
      [decoded.userId]
    ) as any[];
    
    if (user.length === 0) {
      return { user: null };
    }
    
    const dbUser = user[0];
    
    return {
      user: {
        userId: dbUser.id,
        telegramId: dbUser.telegram_id,
        username: dbUser.username,
        role: dbUser.role,
      },
      userId: dbUser.id,
    };
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { user: null };
  }
}

// Socket.IO authentication
export function verifySocketToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}