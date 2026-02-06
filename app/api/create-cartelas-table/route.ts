// app/api/create-cartelas-table/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST() {
  try {
    console.log('Creating cartelas table...');
    
    // First check if it exists
    const [tables] = await db.query(
      "SHOW TABLES LIKE 'cartelas'"
    ) as any[];
    
    if (tables.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'cartelas table already exists',
        action: 'TABLE_EXISTS'
      });
    }
    
    // Create the table
    await db.query(`
      CREATE TABLE cartelas (
        id INT NOT NULL AUTO_INCREMENT,
        card_number INT NOT NULL,
        numbers JSON NOT NULL,
        game_id CHAR(36) DEFAULT NULL,
        selected_by CHAR(36) DEFAULT NULL,
        selected_at TIMESTAMP NULL DEFAULT NULL,
        is_used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY card_number (card_number),
        KEY idx_game_id (game_id),
        KEY idx_selected_by (selected_by),
        KEY idx_is_used (is_used)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    
    console.log('cartelas table created successfully');
    
    // Verify
    const [verify] = await db.query(
      "SHOW TABLES LIKE 'cartelas'"
    ) as any[];
    
    return NextResponse.json({
      success: true,
      message: 'cartelas table created successfully',
      tableCreated: verify.length > 0,
      action: 'TABLE_CREATED'
    });
    
  } catch (error: any) {
    console.error('Create table error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      action: 'CREATE_FAILED'
    });
  }
}