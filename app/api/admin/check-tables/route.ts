import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('Checking database tables...');
    
    // Check which tables exist
    const tables = ['users', 'deposits', 'withdrawals', 'games'];
    const results: any = {};
    
    for (const table of tables) {
      try {
        const result = await db.query(`SHOW TABLES LIKE '${table}'`);
        results[table] = {
          exists: result.length > 0,
          count: result.length,
        };
        
        if (result.length > 0) {
          // Try to count rows
          const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`) as any[];
          results[table].rowCount = countResult[0]?.count || 0;
        }
      } catch (error: any) {
        results[table] = {
          exists: false,
          error: error.message,
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Table check completed',
      tables: results,
    });
    
  } catch (error: any) {
    console.error('Table check error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to check tables',
      },
      { status: 500 }
    );
  }
}