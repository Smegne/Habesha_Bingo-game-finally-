// Create a test file to verify the exact query works
// app/api/admin/test-deposit-query/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    const query = `
      SELECT 
        d.*,
        u.username,
        u.first_name,
        u.telegram_id,
        u.balance as user_balance
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
      LIMIT 5
    `;
    
    console.log('Testing query:', query);
    const result = await db.query(query) as any[];
    
    return NextResponse.json({
      success: true,
      count: result.length,
      data: result,
      columns: result.length > 0 ? Object.keys(result[0]) : []
    });
    
  } catch (error: any) {
    console.error('Test query error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      query: "SELECT d.*, u.username, u.first_name, u.telegram_id, u.balance FROM deposits d LEFT JOIN users u ON d.user_id = u.id"
    }, { status: 500 });
  }
}