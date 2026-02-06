// app/api/auth/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    const users = await db.query(`
      SELECT id, telegram_id, username, first_name, balance, role, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    // Handle different return types
    let userArray = [];
    if (Array.isArray(users)) {
      userArray = users;
    } else if (users && typeof users === 'object') {
      userArray = [users];
    } else if (typeof users === 'object' && users !== null) {
      // Check if it's an array-like object
      userArray = Object.values(users);
    }
    
    return NextResponse.json({
      success: true,
      users: userArray
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      message: 'Error fetching users'
    }, { status: 500 });
  }
}