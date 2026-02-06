// app/api/admin/test-exact-query/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    console.log('=== TEST EXACT QUERY ===');
    
    const depositId = '7e09934d-021c-11f1-8b5c-98e7f4364d07';
    const userId = '099cb23d-ffc0-11f0-b998-98e7f4364d07';
    
    // Test the EXACT query from working-data POST
    const queries = [
      {
        name: 'Get deposit with pending status',
        sql: 'SELECT user_id, amount FROM deposits WHERE id = ? AND status = ?',
        params: [depositId, 'pending']
      },
      {
        name: 'Update deposit status',
        sql: `UPDATE deposits SET status = 'approved', approved_by = 'admin', approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
        params: [depositId]
      },
      {
        name: 'Update user balance (if we have amount)',
        sql: 'UPDATE users SET balance = balance + ? WHERE id = ?',
        params: [22.00, userId] // Using hardcoded amount for testing
      }
    ];
    
    const results = [];
    
    for (const query of queries) {
      console.log(`\nTesting: ${query.name}`);
      console.log('SQL:', query.sql);
      console.log('Params:', query.params);
      
      try {
        const result = await db.query(query.sql, query.params);
        console.log('✅ Success:', result);
        results.push({
          name: query.name,
          success: true,
          result: result
        });
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL State:', error.sqlState);
        results.push({
          name: query.name,
          success: false,
          error: error.message,
          code: error.code,
          sqlState: error.sqlState
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      queries: results,
      note: 'Testing the exact queries from working-data POST'
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}