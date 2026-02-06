import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG USERS API ===');
    
    // 1. First, let's try a simple query
    const simpleResult = await db.query('SELECT * FROM users LIMIT 5');
    console.log('Simple query result:', simpleResult);
    
    // 2. Try with parameters
    const paramResult = await db.query('SELECT * FROM users WHERE role = ? LIMIT 5', ['admin']);
    console.log('Param query result:', paramResult);
    
    // 3. Show table structure
    const structure = await db.query('DESCRIBE users');
    console.log('Table structure:', structure);
    
    return NextResponse.json({
      success: true,
      simpleQuery: simpleResult,
      paramQuery: paramResult,
      tableStructure: structure,
    });
    
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      sql: error.sql,
      params: error.params,
    });
  }
}