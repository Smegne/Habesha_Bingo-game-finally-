import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const JWT_SECRET = process.env.JWT_SECRET!;

// Validate Telegram WebApp initData
function validateTelegramInitData(initData: string): boolean {
  try {
    console.log('Validating initData, length:', initData?.length);
    
    // Parse the data
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    console.log('Hash found:', !!hash);
    
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
    
    console.log('Data check string length:', dataCheckString.length);
    
    // Calculate secret key
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    console.log('Hashes match?', calculatedHash === hash);
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Telegram initData validation error:', error);
    return false;
  }
}

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Auto-login for Telegram users and web login
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
    console.log('Has initData:', !!initData);
    console.log('Has tgWebAppData:', !!tgWebAppData);
    
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
      
      // Query database - check by email first, then by username
      let user;
      let queryResult;
      
      // Try to find by email (if it looks like an email)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(loginIdentifier)) {
        queryResult = await db.query(
          'SELECT * FROM users WHERE email = ?',
          [loginIdentifier]
        ) as any;
      }
      
      // If not found by email or not an email, try by username
      let foundUser = false;
      if (queryResult) {
        if (Array.isArray(queryResult)) {
          const [rows] = queryResult;
          if (Array.isArray(rows) && rows.length > 0) {
            user = rows[0];
            foundUser = true;
          } else if (rows?.id) {
            user = rows;
            foundUser = true;
          }
        } else if (queryResult?.id) {
          user = queryResult;
          foundUser = true;
        }
      }
      
      if (!foundUser) {
        queryResult = await db.query(
          'SELECT * FROM users WHERE username = ?',
          [loginIdentifier]
        ) as any;
        
        if (Array.isArray(queryResult)) {
          const [rows] = queryResult;
          if (Array.isArray(rows) && rows.length > 0) {
            user = rows[0];
          } else if (rows?.id) {
            user = rows;
          }
        } else if (queryResult?.id) {
          user = queryResult;
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
      try {
        await db.query(
          'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = ?',
          [user.id]
        );
        console.log('User online status updated');
      } catch (updateError) {
        console.warn('Failed to update user status:', updateError);
      }
      
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
          balance: parseFloat(user.balance),
          bonusBalance: parseFloat(user.bonus_balance),
          referralCode: user.referral_code,
          createdAt: user.created_at,
        },
        token,
        source: 'web'
      });
      
      return addCorsHeaders(response);
    }
    
    // TELEGRAM LOGIN - Original Telegram authentication
    // Use whichever data we have
    const telegramData = initData || tgWebAppData;
    
    if (!telegramData) {
      console.error('No Telegram data provided');
      const response = NextResponse.json(
        { error: 'No Telegram authentication data provided' },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    console.log('Telegram data length:', telegramData.length);
    
    // Validate Telegram data
    if (!validateTelegramInitData(telegramData)) {
      console.error('Telegram validation failed');
      const response = NextResponse.json(
        { 
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
    
    console.log('User JSON exists:', !!userJson);
    
    if (!userJson) {
      console.error('No user data in Telegram auth');
      const response = NextResponse.json(
        { error: 'No user data in Telegram authentication' },
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
        { error: 'Invalid user data format' },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    console.log('Parsed user data:', userData);
    console.log('Telegram ID:', userData.id);
    
    const telegramId = userData.id?.toString();
    
    if (!telegramId) {
      console.error('No Telegram ID in user data');
      const response = NextResponse.json(
        { error: 'Telegram user ID not found' },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }
    
    // Check if user exists in database
    console.log('Querying database for telegram_id:', telegramId);
    
    try {
      // Query database - FIXED: Your db.query returns an object, not array
      const result = await db.query(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramId]
      ) as any;
      
      console.log('Database query result type:', typeof result);
      console.log('Database query result:', result);
      
      // Handle different database driver response formats
      let user;
      
      if (Array.isArray(result)) {
        // If result is an array (like [rows, fields])
        const [rows] = result;
        console.log('Result is array, rows type:', typeof rows);
        
        if (Array.isArray(rows) && rows.length > 0) {
          user = rows[0];
        } else if (rows && typeof rows === 'object' && rows.id) {
          // If rows is a single object (like your test showed)
          user = rows;
        } else {
          console.log('No user found in array format');
          user = null;
        }
      } else if (result && typeof result === 'object') {
        // If result is a single object
        if (result.id) {
          user = result;
        } else {
          // Check if it's an object with rows property
          const rows = (result as any).rows || (result as any)[0];
          if (Array.isArray(rows) && rows.length > 0) {
            user = rows[0];
          } else if (rows && rows.id) {
            user = rows;
          } else {
            user = null;
          }
        }
      }
      
      console.log('Extracted user:', user);
      
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
      
      console.log('User found in database:', {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        role: user.role
      });
      
      // Update user's last active status
      try {
        await db.query(
          'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = ?',
          [user.id]
        );
        console.log('User online status updated');
      } catch (updateError) {
        console.warn('Failed to update user status:', updateError);
        // Continue anyway, not critical
      }
      
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
      
      console.log('Token generated successfully');
      console.log('=== TELEGRAM AUTH SUCCESS ===');
      
      // Return user data with token
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          firstName: user.first_name,
          email: user.email,
          role: user.role,
          balance: parseFloat(user.balance),
          bonusBalance: parseFloat(user.bonus_balance),
          referralCode: user.referral_code,
          createdAt: user.created_at,
        },
        token,
        source: 'telegram'
      });
      
      return addCorsHeaders(response);
      
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      const response = NextResponse.json(
        { 
          error: 'Database error',
          details: dbError.message,
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        },
        { status: 500 }
      );
      return addCorsHeaders(response);
    }
    
  } catch (error: any) {
    console.error('Authentication error:', error);
    const response = NextResponse.json(
      { 
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const response = NextResponse.json({ authenticated: false });
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
      
      if (Array.isArray(result)) {
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
        const response = NextResponse.json({ authenticated: false });
        return addCorsHeaders(response);
      }
      
      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          username: user.username,
          firstName: user.first_name,
          email: user.email,
          role: user.role,
          balance: parseFloat(user.balance),
          bonusBalance: parseFloat(user.bonus_balance),
          referralCode: user.referral_code,
          createdAt: user.created_at,
        },
        source: decoded.source
      });
      
      return addCorsHeaders(response);
    } catch (error) {
      const response = NextResponse.json({ authenticated: false });
      return addCorsHeaders(response);
    }
  } catch (error: any) {
    console.error('Auth check error:', error);
    const response = NextResponse.json({ authenticated: false });
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