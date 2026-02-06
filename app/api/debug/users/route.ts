// app/api/debug/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Fetching all users');
    
    const result = await db.query(
      'SELECT id, username, first_name, telegram_id, balance, created_at FROM users ORDER BY created_at DESC'
    ) as any;
    
    let users = [];
    if (result && Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows)) {
        users = rows;
      } else if (rows && typeof rows === 'object') {
        users = [rows];
      }
    }
    
    console.log('🔍 Debug: Found', users.length, 'users');
    
    return NextResponse.json({
      success: true,
      users: users,
      count: users.length,
      note: 'Check the actual user IDs in your database'
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}