// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    // Check for token in cookies first
    const cookies = request.cookies;
    const token = cookies.get('auth_token')?.value || 
                 cookies.get('token')?.value;

    // Then check Authorization header
    const authHeader = request.headers.get('Authorization');
    let authToken = token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.split(' ')[1];
    }

    if (!authToken) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: 'No authentication token found'
      });
    }

    // Verify token
    const decoded = jwt.verify(authToken, JWT_SECRET) as any;
    
    // Get user from database
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId || decoded.id]
    ) as any;

    let user = null;
    if (userResult && Array.isArray(userResult) && userResult[0]) {
      const [rows] = userResult;
      if (Array.isArray(rows) && rows.length > 0) {
        user = rows[0];
      }
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: 'User not found'
      });
    }

    // Format safe user response
    const safeUser = {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      balance: parseFloat(user.balance) || 0,
      bonus_balance: parseFloat(user.bonus_balance) || 0,
      role: user.role || 'user',
      is_online: user.is_online || false
    };

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: safeUser
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      message: 'Invalid or expired session'
    });
  }
}