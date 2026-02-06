import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const JWT_SECRET = process.env.JWT_SECRET || 'habesha-bingo-secret-key-2024';

// Validate Telegram WebApp initData
function validateTelegramInitData(initData: string): boolean {
  try {
    console.log('Validating initData, length:', initData?.length);
    
    if (!initData) return false;
    
    // Parse the data
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.error('No hash in initData');
      return false;
    }

    // Create data check string
    const dataCheckArr: string[] = [];
    urlParams.forEach((value, key) => {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${value}`);
      }
    });
    
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');
    
    // Calculate secret key
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Telegram initData validation error:', error);
    return false;
  }
}

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

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Main authentication handler
export async function POST(request: NextRequest) {
  try {
    console.log('=== AUTH REQUEST START ===');
    
    const body = await request.json();
    const { 
      initData, 
      tgWebAppData, 
      source = 'telegram', 
      identifier, 
      username, 
      password, 
      email 
    } = body;
    
    console.log('Source:', source);
    
    // WEB LOGIN - Email/Username and Password
    if (source === 'web') {
      const loginIdentifier = identifier || username || email;
      
      if (!loginIdentifier || !password) {
        const response = NextResponse.json(
          { 
            success: false,
            error: 'Email/Username and password are required' 
          },
          { status: 400 }
        );
        return addCorsHeaders(response);
      }

      console.log('Web login attempt:', { loginIdentifier });
      
      // Query database
      let user = null;
      
      // Try to find by email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(loginIdentifier)) {
        const result = await db.query(
          'SELECT * FROM users WHERE email = ?',
          [loginIdentifier]
        ) as any;
        
        if (result && Array.isArray(result) && result[0]) {
          const [rows] = result;
          if (Array.isArray(rows) && rows.length > 0) {
            user = rows[0];
          } else if (rows && rows.id) {
            user = rows;
          }
        }
      }
      
      // If not found by email, try by username
      if (!user) {
        const result = await db.query(
          'SELECT * FROM users WHERE username = ?',
          [loginIdentifier]
        ) as any;
        
        if (result && Array.isArray(result) && result[0]) {
          const [rows] = result;
          if (Array.isArray(rows) && rows.length > 0) {
            user = rows[0];
          } else if (rows && rows.id) {
            user = rows;
          }
        }
      }
      
      if (!user) {
        console.log('User not found:', loginIdentifier);
        const response = NextResponse.json(
          { 
            success: false,
            error: 'Invalid email/username or password' 
          },
          { status: 401 }
        );
        return addCorsHeaders(response);
      }
      
      // Check password
      if (!user.password_hash) {
        console.log('User has no password_hash set');
        const response = NextResponse.json(
          { 
            success: false,
            error: 'Account not set up for password login. Please use Telegram login.' 
          },
          { status: 401 }
        );
        return addCorsHeaders(response);
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        console.log('Invalid password for user:', user.username);
        const response = NextResponse.json(
          { 
            success: false,
            error: 'Invalid email/username or password' 
          },
          { status: 401 }
        );
        return addCorsHeaders(response);
      }
      
      // Update user's last active status
      await db.query(
        'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = ?',
        [user.id]
      );
      
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          role: user.role,
          source: 'web'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('Web login successful:', user.username);
      
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          firstName: user.first_name,
          email: user.email,
          role: user.role,
          balance: parseFloat(user.balance) || 0,
          bonusBalance: parseFloat(user.bonus_balance) || 0,
          referralCode: user.referral_code,
          isOnline: true,
          createdAt: user.created_at,
        },
        token,
        source: 'web'
      });
      
      return addCorsHeaders(response);
    }
    
    // TELEGRAM LOGIN
    const telegramData = initData || tgWebAppData;
    
    if (!telegramData) {
      console.error('No Telegram data provided');
      const response = NextResponse.json(
        { 
          success: false,
          error: 'No Telegram authentication data provided' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    console.log('Telegram data received');
    
    // Validate Telegram data
    if (!validateTelegramInitData(telegramData)) {
      console.error('Telegram validation failed');
      const response = NextResponse.json(
        { 
          success: false,
          error: 'Invalid Telegram authentication',
          details: 'Hash validation failed'
        },
        { status: 401 }
      );
      return addCorsHeaders(response);
    }
    
    console.log('Telegram validation passed');
    
    // Extract user data
    const urlParams = new URLSearchParams(telegramData);
    const userJson = urlParams.get('user');
    
    if (!userJson) {
      console.error('No user data in Telegram auth');
      const response = NextResponse.json(
        { 
          success: false,
          error: 'No user data in Telegram authentication' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    let userData;
    try {
      userData = JSON.parse(userJson);
    } catch (e) {
      console.error('Failed to parse user JSON:', e);
      const response = NextResponse.json(
        { 
          success: false,
          error: 'Invalid user data format' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    console.log('Parsed Telegram user data:', userData);
    const telegramId = userData.id?.toString();
    
    if (!telegramId) {
      console.error('No Telegram ID in user data');
      const response = NextResponse.json(
        { 
          success: false,
          error: 'Telegram user ID not found' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    // Find user in database (handles all formats)
    const user = await findUserByTelegramId(telegramId);
    
    if (!user) {
      console.log('User not found in database, needs registration');
      const response = NextResponse.json(
        { 
          success: false,
          error: 'User not registered',
          needsRegistration: true,
          telegramId,
          userData
        },
        { status: 404 }
      );
      return addCorsHeaders(response);
    }
    
    console.log('✅ User found:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      role: user.role
    });
    
    // Update user's last active status
    await db.query(
      'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        role: user.role,
        source: 'telegram'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Telegram auth successful for:', user.username);
    
    // Return user data with token
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        email: user.email || '',
        role: user.role || 'user',
        balance: parseFloat(user.balance) || 0,
        bonusBalance: parseFloat(user.bonus_balance) || 0,
        referralCode: user.referral_code || '',
        isOnline: true,
        createdAt: user.created_at,
      },
      token,
      source: 'telegram'
    });
    
    return addCorsHeaders(response);
    
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    const response = NextResponse.json(
      { 
        success: false,
        error: 'Authentication failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

// Check authentication status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // Check cookies
      token = request.cookies.get('auth_token')?.value || '';
    }
    
    if (!token) {
      const response = NextResponse.json({ 
        success: false,
        authenticated: false 
      });
      return addCorsHeaders(response);
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get fresh user data from database
      const result = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [decoded.userId]
      ) as any;
      
      let user;
      if (result && Array.isArray(result) && result[0]) {
        const [rows] = result;
        if (Array.isArray(rows) && rows.length > 0) {
          user = rows[0];
        } else if (rows && rows.id) {
          user = rows;
        }
      } else if (result && result.id) {
        user = result;
      }
      
      if (!user) {
        const response = NextResponse.json({ 
          success: false,
          authenticated: false 
        });
        return addCorsHeaders(response);
      }
      
      const response = NextResponse.json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          firstName: user.first_name,
          email: user.email,
          role: user.role,
          balance: parseFloat(user.balance) || 0,
          bonusBalance: parseFloat(user.bonus_balance) || 0,
          referralCode: user.referral_code,
          isOnline: user.is_online,
          createdAt: user.created_at,
        },
        source: decoded.source || 'unknown'
      });
      
      return addCorsHeaders(response);
    } catch (error) {
      const response = NextResponse.json({ 
        success: false,
        authenticated: false 
      });
      return addCorsHeaders(response);
    }
  } catch (error: any) {
    console.error('Auth check error:', error);
    const response = NextResponse.json({ 
      success: false,
      authenticated: false 
    });
    return addCorsHeaders(response);
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}