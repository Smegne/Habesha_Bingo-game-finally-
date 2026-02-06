import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Simple test query
    const result = await db.query('SELECT 1 as test');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: result,
    });
    
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Database connection failed',
        details: error
      },
      { status: 500 }
    );
  }
}