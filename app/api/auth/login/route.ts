// app/api/auth/login/route.ts - PROPER LOGIN
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'habesha-bingo-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('🔐 Login attempt for email:', email);
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }
    
    // Find user by email
    const user = await getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }
    
    // Check if user has password (some users might not have passwords if created via Telegram)
    if (!user.password_hash) {
      return NextResponse.json({
        success: false,
        message: 'This account was created via Telegram. Please use Telegram login.',
        needsTelegram: true
      }, { status: 401 });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        message: 'Invalid password'
      }, { status: 401 });
    }
    
    console.log('✅ Login successful for:', user.username);
    
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
    await db.query(
      'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Format user response
    const safeUser = {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      email: user.email,
      balance: parseFloat(user.balance) || 0,
      bonus_balance: parseFloat(user.bonus_balance) || 0,
      role: user.role || 'user',
      referral_code: user.referral_code || '',
      is_online: true
    };
    
    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token: token,
      message: 'Login successful'
    });
    
    // Set cookie with token
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getUserByEmail(email: string) {
  try {
    const result = await db.query(
      `SELECT 
        id,
        telegram_id,
        username,
        first_name,
        email,
        password_hash,
        balance,
        bonus_balance,
        role,
        referral_code,
        is_online
       FROM users WHERE email = ?`,
      [email]
    ) as any;
    
    if (result && Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}