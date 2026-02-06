// app/api/admin/check-deposits/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET() {
  try {
    // Check if deposits table exists
    const tableCheck = await db.query(
      "SHOW TABLES LIKE 'deposits'"
    ) as any[];
    
    const tableExists = tableCheck.length > 0;
    
    if (!tableExists) {
      return NextResponse.json({
        success: false,
        message: 'Deposits table does not exist',
        suggestion: 'Run the SQL below to create it'
      });
    }
    
    // Check if there's any data
    const depositCount = await db.query(
      'SELECT COUNT(*) as count FROM deposits'
    ) as any[];
    
    const count = depositCount[0]?.count || 0;
    
    // Get a sample of deposits
    const sampleDeposits = await db.query(
      'SELECT * FROM deposits ORDER BY created_at DESC LIMIT 5'
    ) as any[];
    
    return NextResponse.json({
      success: true,
      tableExists,
      depositCount: count,
      sampleDeposits: sampleDeposits,
      sqlToCreateTable: `
        CREATE TABLE deposits (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          user_id VARCHAR(36) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          method VARCHAR(50) DEFAULT 'telegram',
          status ENUM('pending', 'approved', 'rejected', 'failed') DEFAULT 'pending',
          transaction_id VARCHAR(100),
          proof_image TEXT,
          admin_notes TEXT,
          approved_by VARCHAR(36),
          approved_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `
    });
    
  } catch (error: any) {
    console.error('Check deposits error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Error checking deposits table'
    }, { status: 500 });
  }
}