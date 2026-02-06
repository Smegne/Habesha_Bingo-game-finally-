// app/api/auth/simple-login/route.ts - UPDATED WITH CORRECT USER ID
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'habesha-bingo-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    console.log('🔐 Simple login attempt for userId:', userId);
    
    // Use actual user ID if not provided
    const targetUserId = userId || 'b73bb25f-0385-11f1-a7c6-98e7f4364d07';
    
    // Get user from database
    const user = await getUserById(targetUserId);
    
    if (!user) {
      // Try to get first user
      const firstUser = await getFirstUser();
      if (!firstUser) {
        return NextResponse.json({
          success: false,
          message: 'No users found in database'
        }, { status: 404 });
      }
      return createLoginResponse(firstUser, 'first_user_fallback');
    }
    
    console.log('✅ User found:', user.username);
    return createLoginResponse(user, 'user_login');
    
  } catch (error) {
    console.error('❌ Simple login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getUserById(userId: string) {
  try {
    console.log('🔍 Searching user by ID:', userId);
    
    const result = await db.query(
      `SELECT 
        id,
        telegram_id,
        username,
        first_name,
        balance,
        bonus_balance,
        role
       FROM users WHERE id = ?`,
      [userId]
    ) as any;
    
    console.log('🔍 DB result:', result);
    
    if (result && Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      } else if (rows && typeof rows === 'object' && rows.id) {
        return rows;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

async function getFirstUser() {
  try {
    const result = await db.query(
      `SELECT 
        id,
        telegram_id,
        username,
        first_name,
        balance,
        bonus_balance,
        role
       FROM users ORDER BY created_at LIMIT 1`
    ) as any;
    
    if (result && Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting first user:', error);
    return null;
  }
}

function createLoginResponse(user: any, source: string) {
  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Update user as online
  db.query(
    'UPDATE users SET is_online = TRUE WHERE id = ?',
    [user.id]
  ).catch(err => console.log('Update online status error:', err));
  
  // Create response
  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      balance: parseFloat(user.balance) || 0,
      bonus_balance: parseFloat(user.bonus_balance) || 0,
      role: user.role || 'user'
    },
    token: token,
    source: source,
    message: 'Login successful'
  });
  
  // Set cookie
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
    path: '/'
  });
  
  return response;
}