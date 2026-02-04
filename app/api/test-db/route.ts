// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test query for the specific user
    const [rows] = await db.query(
      'SELECT * FROM users WHERE telegram_id = ?',
      ['1317795910']
    );
    
    console.log('Query result:', rows);
    
    return NextResponse.json({
      success: true,
      rows: rows,
      rowCount: Array.isArray(rows) ? rows.length : 'unknown',
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}