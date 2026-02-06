// app/api/auth/check/route.ts - UPDATED to get current user
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Auth check called - getting CURRENT user');
    
    // Get session/token from cookies
    const cookies = request.cookies;
    const sessionToken = cookies.get('session')?.value || 
                        cookies.get('auth_token')?.value ||
                        cookies.get('token')?.value;
    
    console.log('🔍 Session token from cookies:', sessionToken ? 'Found' : 'Not found');
    
    // If we have a session token, validate it
    if (sessionToken) {
      // Check if this is a Telegram WebApp session
      if (sessionToken.startsWith('telegram_')) {
        const telegramData = JSON.parse(
          Buffer.from(sessionToken.replace('telegram_', ''), 'base64').toString()
        );
        
        console.log('🔍 Telegram session data:', telegramData);
        
        // Find user by Telegram ID
        const [users] = await db.query(
          'SELECT id, telegram_id, username, first_name, balance FROM users WHERE telegram_id = ? OR telegram_user_id = ? LIMIT 1',
          [telegramData.id || telegramData.user?.id, telegramData.id || telegramData.user?.id]
        ) as any[];
        
        if (Array.isArray(users) && users.length > 0) {
          console.log('✅ Found user by Telegram ID:', users[0].username);
          return NextResponse.json({
            success: true,
            user: users[0],
            source: 'telegram_session'
          });
        }
      }
      
      // Check regular session table (if you have one)
      const [sessions] = await db.query(
        'SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > NOW()',
        [sessionToken]
      ) as any[];
      
      if (Array.isArray(sessions) && sessions.length > 0) {
        const session = sessions[0];
        const [users] = await db.query(
          'SELECT id, telegram_id, username, first_name, balance FROM users WHERE id = ?',
          [session.user_id]
        ) as any[];
        
        if (Array.isArray(users) && users.length > 0) {
          console.log('✅ Found user by session:', users[0].username);
          return NextResponse.json({
            success: true,
            user: users[0],
            source: 'regular_session'
          });
        }
      }
    }
    
    // Check for Telegram WebApp initData in query params
    const searchParams = request.nextUrl.searchParams;
    const initData = searchParams.get('tgWebAppData');
    
    if (initData) {
      console.log('🔍 Found Telegram WebApp initData');
      // Parse initData to get user
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');
      
      if (userParam) {
        try {
          const telegramUser = JSON.parse(userParam);
          console.log('🔍 Telegram user from initData:', telegramUser);
          
          // Find user by Telegram ID
          const [users] = await db.query(
            'SELECT id, telegram_id, username, first_name, balance FROM users WHERE telegram_user_id = ? OR telegram_id = ? LIMIT 1',
            [telegramUser.id, `telegram_${telegramUser.id}`]
          ) as any[];
          
          if (Array.isArray(users) && users.length > 0) {
            console.log('✅ Found user by Telegram WebApp:', users[0].username);
            return NextResponse.json({
              success: true,
              user: users[0],
              source: 'telegram_webapp'
            });
          }
        } catch (error) {
          console.error('Error parsing Telegram user:', error);
        }
      }
    }
    
    // Check for user_id in query params (for testing)
    const userId = searchParams.get('userId');
    if (userId) {
      console.log('🔍 Using userId from query params:', userId);
      const [users] = await db.query(
        'SELECT id, telegram_id, username, first_name, balance FROM users WHERE id = ?',
        [userId]
      ) as any[];
      
      if (Array.isArray(users) && users.length > 0) {
        console.log('✅ Found user by query param:', users[0].username);
        return NextResponse.json({
          success: true,
          user: users[0],
          source: 'query_param'
        });
      }
    }
    
    // Fallback: Check localStorage via custom header
    const localStorageUser = request.headers.get('x-localstorage-user');
    if (localStorageUser) {
      try {
        const user = JSON.parse(localStorageUser);
        console.log('🔍 User from localStorage header:', user.username);
        
        // Verify user exists in database
        const [users] = await db.query(
          'SELECT id, telegram_id, username, first_name, balance FROM users WHERE id = ?',
          [user.id]
        ) as any[];
        
        if (Array.isArray(users) && users.length > 0) {
          console.log('✅ Verified user from localStorage:', users[0].username);
          return NextResponse.json({
            success: true,
            user: users[0],
            source: 'localstorage_header'
          });
        }
      } catch (error) {
        console.error('Error parsing localStorage user:', error);
      }
    }
    
    // LAST RESORT: Return first user (current behavior)
    console.log('⚠️ No auth found, returning first user as fallback');
    const [users] = await db.query(
      'SELECT id, telegram_id, username, first_name, balance FROM users ORDER BY created_at DESC LIMIT 1'
    ) as any[];
    
    if (Array.isArray(users) && users.length > 0) {
      return NextResponse.json({
        success: true,
        user: users[0],
        source: 'first_user_fallback',
        warning: 'No authentication found, using first user'
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'No user found and no authentication detected'
    });
    
  } catch (error: any) {
    console.error('❌ Auth check error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database error: ' + error.message
    }, { status: 500 });
  }
}