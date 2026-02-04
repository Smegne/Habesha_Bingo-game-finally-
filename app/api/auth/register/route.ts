import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import bcrypt from 'bcryptjs';

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      telegramId, 
      username, 
      firstName, 
      password, 
      role = 'user',
      referralCode = '',
      email
    } = body;

    console.log('Registration request:', { telegramId, username, role, email });

    // Validate required fields
    if (!telegramId || !username || !firstName || !password || !email) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'All required fields must be provided' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Please provide a valid email address' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Validate password length
    if (password.length < 6) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Password must be at least 6 characters' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Password must contain uppercase, lowercase letters and numbers' 
        },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Check if email already exists
    const existingEmailUser = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any;

    let emailExists = false;
    if (Array.isArray(existingEmailUser)) {
      const [rows] = existingEmailUser;
      emailExists = Array.isArray(rows) ? rows.length > 0 : !!rows?.id;
    } else {
      emailExists = !!existingEmailUser?.id;
    }

    if (emailExists) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Email already registered' 
        },
        { status: 409 }
      );
      return addCorsHeaders(response);
    }

    // Check if telegram ID already exists
    const existingTelegramUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any;

    let telegramUserExists = false;
    if (Array.isArray(existingTelegramUser)) {
      const [rows] = existingTelegramUser;
      telegramUserExists = Array.isArray(rows) ? rows.length > 0 : !!rows?.id;
    } else {
      telegramUserExists = !!existingTelegramUser?.id;
    }

    if (telegramUserExists) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Telegram ID already registered' 
        },
        { status: 409 }
      );
      return addCorsHeaders(response);
    }

    // Check if username already exists
    const existingUsernameUser = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as any;

    let usernameExists = false;
    if (Array.isArray(existingUsernameUser)) {
      const [rows] = existingUsernameUser;
      usernameExists = Array.isArray(rows) ? rows.length > 0 : !!rows?.id;
    } else {
      usernameExists = !!existingUsernameUser?.id;
    }

    if (usernameExists) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Username already taken' 
        },
        { status: 409 }
      );
      return addCorsHeaders(response);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate referral code
    const userReferralCode = referralCode || 
      `HAB${telegramId.slice(-6)}${Date.now().toString(36).toUpperCase()}`;

    // Check referral code validity if provided
    let referrerId = null;
    if (referralCode && referralCode.trim() !== '') {
      const referrerResult = await db.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      ) as any;

      if (Array.isArray(referrerResult)) {
        const [rows] = referrerResult;
        if (Array.isArray(rows) && rows.length > 0) {
          referrerId = rows[0].id;
        } else if (rows?.id) {
          referrerId = rows.id;
        }
      } else if (referrerResult?.id) {
        referrerId = referrerResult.id;
      }

      if (!referrerId) {
        const response = NextResponse.json(
          { 
            success: false, 
            error: 'Invalid referral code' 
          },
          { status: 400 }
        );
        return addCorsHeaders(response);
      }
    }

    // IMPORTANT: We need to handle the transaction differently
    // Let's first create the user, then add transactions
    
    try {
      // First, create the user
      const userResult = await db.query(
        `INSERT INTO users 
        (telegram_id, username, first_name, email, password_hash, role, balance, bonus_balance, referral_code, referred_by, is_online)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          telegramId,
          username,
          firstName,
          email,
          hashedPassword,
          role,
          50.00, // Welcome bonus
          10.00, // Initial bonus
          userReferralCode,
          referrerId
        ]
      ) as any;

      console.log('User created result:', userResult);

      // Get the inserted user ID - handle different response formats
      let userId;
      if (Array.isArray(userResult)) {
        // MySQL2 returns [result, fields] format
        const [result] = userResult;
        userId = result.insertId;
      } else if (userResult && typeof userResult === 'object') {
        // Direct result object
        userId = (userResult as any).insertId;
      } else {
        throw new Error('Could not get user ID from insert result');
      }

      console.log('Created user ID:', userId);

      // If valid referral, reward referrer
      if (referrerId) {
        await db.query(
          `UPDATE users 
           SET bonus_balance = bonus_balance + 10 
           WHERE id = ?`,
          [referrerId]
        );

        // Record referral transaction
        await db.query(
          `INSERT INTO transactions 
          (user_id, type, amount, description, reference_id)
          VALUES (?, 'bonus', ?, 'Referral bonus for new user ${username}', ?)`,
          [referrerId, 10, userId]
        );
      }

      // Record welcome bonus transaction for new user
      await db.query(
        `INSERT INTO transactions 
        (user_id, type, amount, description)
        VALUES (?, 'bonus', ?, 'Welcome bonus')`,
        [userId, 50]
      );

      // Record initial bonus transaction
      await db.query(
        `INSERT INTO transactions 
        (user_id, type, amount, description)
        VALUES (?, 'bonus', ?, 'Initial bonus')`,
        [userId, 10]
      );

      // Get the created user
      const userQueryResult = await db.query(
        `SELECT 
          id,
          telegram_id as telegramId,
          username,
          first_name as firstName,
          email,
          phone,
          role,
          balance,
          bonus_balance as bonusBalance,
          referral_code as referralCode,
          is_online as isOnline,
          created_at as createdAt
         FROM users WHERE id = ?`,
        [userId]
      ) as any;

      let user;
      if (Array.isArray(userQueryResult)) {
        const [rows] = userQueryResult;
        if (Array.isArray(rows) && rows.length > 0) {
          user = rows[0];
        } else if (rows?.id) {
          user = rows;
        }
      } else if (userQueryResult?.id) {
        user = userQueryResult;
      }

      if (!user) {
        throw new Error('Could not retrieve created user');
      }

      const response = NextResponse.json({
        success: true,
        message: 'Registration successful! Welcome to Habesha Bingo!',
        user,
      });
      
      return addCorsHeaders(response);

    } catch (dbError: any) {
      console.error('Database error during registration:', dbError);
      throw dbError;
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}