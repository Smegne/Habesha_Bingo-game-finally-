// app/api/auth/secure-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'habesha-bingo-secret-key-2024';

// Helper function to find user by Telegram ID (handles all formats)
async function findUserByTelegramId(telegramId: string) {
  try {
    console.log('🔍 Searching for Telegram ID:', telegramId);
    
    // METHOD 1: Try exact match in telegram_id
    let result = await db.query(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any;
    
    if (result && Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('✅ Found user by exact telegram_id match');
        return rows[0];
      } else if (rows && typeof rows === 'object' && rows.id) {
        console.log('✅ Found user by exact telegram_id match (single object)');
        return rows;
      }
    }
    
    // METHOD 2: If telegramId is numeric, try with "user" prefix
    if (/^\d+$/.test(telegramId)) {
      const prefixedId = `user${telegramId}`;
      console.log('🔍 Trying with user prefix:', prefixedId);
      
      result = await db.query(
        'SELECT * FROM users WHERE telegram_id = ?',
        [prefixedId]
      ) as any;
      
      if (result && Array.isArray(result) && result[0]) {
        const [rows] = result;
        if (Array.isArray(rows) && rows.length > 0) {
          console.log('✅ Found user by prefixed telegram_id');
          return rows[0];
        } else if (rows && typeof rows === 'object' && rows.id) {
          console.log('✅ Found user by prefixed telegram_id (single object)');
          return rows;
        }
      }
    }
    
    // METHOD 3: Try telegram_user_id field (numeric)
    const numericId = parseInt(telegramId);
    if (!isNaN(numericId)) {
      console.log('🔍 Trying telegram_user_id field:', numericId);
      
      result = await db.query(
        'SELECT * FROM users WHERE telegram_user_id = ?',
        [numericId]
      ) as any;
      
      if (result && Array.isArray(result) && result[0]) {
        const [rows] = result;
        if (Array.isArray(rows) && rows.length > 0) {
          console.log('✅ Found user by telegram_user_id');
          return rows[0];
        } else if (rows && typeof rows === 'object' && rows.id) {
          console.log('✅ Found user by telegram_user_id (single object)');
          return rows;
        }
      }
    }
    
    console.log('❌ No user found for Telegram ID:', telegramId);
    return null;
    
  } catch (error) {
    console.error('❌ Error finding user by Telegram ID:', error);
    return null;
  }
}

// Helper function to find user by ID
async function getUserById(userId: string) {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as any;
    
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
    console.error('❌ Error getting user by ID:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Secure-check endpoint called');
    
    // Get authentication data from different sources
    const authHeader = request.headers.get('Authorization');
    const telegramData = request.headers.get('X-Telegram-Data');
    const userIdHeader = request.headers.get('X-User-ID');
    
    // Check for JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Get user from database
        const user = await getUserById(decoded.userId);
        if (user) {
          console.log('✅ JWT auth successful for:', user.username);
          return createAuthResponse(user, 'jwt_token');
        }
      } catch (jwtError) {
        console.log('❌ JWT verification failed:', jwtError);
      }
    }
    
    // Check for Telegram WebApp data
    if (telegramData) {
      try {
        const params = new URLSearchParams(telegramData);
        const userJson = params.get('user');
        if (userJson) {
          const telegramUser = JSON.parse(userJson);
          
          // Find user by Telegram ID (handles all formats)
          const user = await findUserByTelegramId(telegramUser.id.toString());
          
          if (user) {
            console.log('✅ Telegram auth successful for:', user.username);
            return createAuthResponse(user, 'telegram_webapp');
          }
        }
      } catch (telegramError) {
        console.log('❌ Telegram auth failed:', telegramError);
      }
    }
    
    // Check for user ID header (from localStorage)
    if (userIdHeader) {
      const user = await getUserById(userIdHeader);
      if (user) {
        console.log('✅ User ID auth successful for:', user.username);
        return createAuthResponse(user, 'user_id_header');
      }
    }
    
    // Check cookies
    const authToken = request.cookies.get('auth_token')?.value;
    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as any;
        const user = await getUserById(decoded.userId);
        if (user) {
          console.log('✅ Cookie auth successful for:', user.username);
          return createAuthResponse(user, 'cookie_token');
        }
      } catch (cookieError) {
        console.log('❌ Cookie auth failed:', cookieError);
      }
    }
    
    // No valid authentication found
    console.log('❌ No valid authentication found');
    return NextResponse.json({
      success: false,
      message: 'Not authenticated'
    }, { status: 401 });
    
  } catch (error) {
    console.error('❌ Auth error:', error);
    return NextResponse.json({
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function createAuthResponse(user: any, source: string) {
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
    'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = ?',
    [user.id]
  ).catch(err => console.log('Update online status error:', err));
  
  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      email: user.email || '',
      balance: parseFloat(user.balance) || 0,
      bonus_balance: parseFloat(user.bonus_balance) || 0,
      role: user.role || 'user',
      referral_code: user.referral_code || '',
      is_online: true
    },
    source: source,
    token: token,
    verified: true
  });
}