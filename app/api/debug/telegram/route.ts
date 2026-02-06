// app/api/debug/telegram/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get('id');
    
    if (!telegramId) {
      return NextResponse.json({
        success: false,
        message: 'Telegram ID is required'
      }, { status: 400 });
    }
    
    console.log('🔍 Debug Telegram ID:', telegramId);
    
    const results = [];
    
    // Try exact match
    const exactResult = await db.query(
      'SELECT id, telegram_id, telegram_user_id, username, first_name, balance FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any;
    
    if (exactResult && Array.isArray(exactResult) && exactResult[0]) {
      const [rows] = exactResult;
      if (Array.isArray(rows) && rows.length > 0) {
        results.push({ method: 'exact', user: rows[0] });
      } else if (rows && rows.id) {
        results.push({ method: 'exact', user: rows });
      }
    }
    
    // Try with "user" prefix
    if (/^\d+$/.test(telegramId)) {
      const prefixedId = `user${telegramId}`;
      const prefixedResult = await db.query(
        'SELECT id, telegram_id, telegram_user_id, username, first_name, balance FROM users WHERE telegram_id = ?',
        [prefixedId]
      ) as any;
      
      if (prefixedResult && Array.isArray(prefixedResult) && prefixedResult[0]) {
        const [rows] = prefixedResult;
        if (Array.isArray(rows) && rows.length > 0) {
          results.push({ method: 'prefixed', user: rows[0] });
        } else if (rows && rows.id) {
          results.push({ method: 'prefixed', user: rows });
        }
      }
    }
    
    // Try telegram_user_id field
    const numericId = parseInt(telegramId);
    if (!isNaN(numericId)) {
      const numericResult = await db.query(
        'SELECT id, telegram_id, telegram_user_id, username, first_name, balance FROM users WHERE telegram_user_id = ?',
        [numericId]
      ) as any;
      
      if (numericResult && Array.isArray(numericResult) && numericResult[0]) {
        const [rows] = numericResult;
        if (Array.isArray(rows) && rows.length > 0) {
          results.push({ method: 'telegram_user_id', user: rows[0] });
        } else if (rows && rows.id) {
          results.push({ method: 'telegram_user_id', user: rows });
        }
      }
    }
    
    // Get all users for comparison
    const allUsersResult = await db.query(
      'SELECT id, telegram_id, telegram_user_id, username, first_name FROM users ORDER BY created_at DESC LIMIT 20'
    ) as any;
    
    let allUsers = [];
    if (allUsersResult && Array.isArray(allUsersResult) && allUsersResult[0]) {
      const [rows] = allUsersResult;
      if (Array.isArray(rows)) {
        allUsers = rows;
      } else if (rows && rows.id) {
        allUsers = [rows];
      }
    }
    
    return NextResponse.json({
      success: true,
      telegramId,
      searchResults: results,
      count: results.length,
      allUsers: allUsers,
      note: 'Check which format your Telegram ID is stored in'
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}