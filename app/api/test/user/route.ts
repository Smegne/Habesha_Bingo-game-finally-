// app/api/test/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('id');
    const username = searchParams.get('username');

    let query = 'SELECT id, username, first_name, balance, telegram_id FROM users';
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE id = ?';
      params.push(userId);
    } else if (username) {
      query += ' WHERE username = ?';
      params.push(username);
    } else {
      query += ' LIMIT 10';
    }

    const result = await db.query(query, params) as any;
    
    let users = [];
    if (result && Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows)) {
        users = rows;
      } else if (rows) {
        users = [rows];
      }
    }

    return NextResponse.json({
      success: true,
      users: users,
      count: users.length
    });

  } catch (error) {
    console.error('Test user error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}