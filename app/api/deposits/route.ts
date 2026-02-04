import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as string;
    const screenshot = formData.get('screenshot') as File;
    
    // Validate amount
    if (amount < 10) {
      return NextResponse.json(
        { error: 'Minimum deposit amount is 10 Birr' },
        { status: 400 }
      );
    }
    
    // Validate method
    if (!['telebirr', 'cbe'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }
    
    let screenshotUrl = null;
    
    // Handle screenshot upload
    if (screenshot) {
      const bytes = await screenshot.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create unique filename
      const filename = `deposit_${userId}_${uuidv4()}${path.extname(screenshot.name)}`;
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'deposits', filename);
      
      // Ensure directory exists
      await writeFile(uploadPath, buffer);
      
      screenshotUrl = `/uploads/deposits/${filename}`;
    }
    
    // Create deposit record
    const result = await db.query(
      `INSERT INTO deposits 
      (user_id, amount, method, screenshot_url, status)
      VALUES (?, ?, ?, ?, 'pending')`,
      [userId, amount, method, screenshotUrl]
    ) as any;
    
    return NextResponse.json({
      success: true,
      message: 'Deposit request submitted successfully',
      depositId: result.insertId,
      screenshotUrl,
    });
    
  } catch (error: any) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { error: 'Failed to submit deposit request' },
      { status: 500 }
    );
  }
}

// Get user deposits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    
    let query = `
      SELECT d.*, u.username, u.telegram_id
      FROM deposits d
      JOIN users u ON d.user_id = u.id
    `;
    const params: any[] = [];
    
    if (userId) {
      query += ' WHERE d.user_id = ?';
      params.push(userId);
      
      if (status) {
        query += ' AND d.status = ?';
        params.push(status);
      }
    } else if (status) {
      query += ' WHERE d.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const deposits = await db.query(query, params) as any[];
    
    return NextResponse.json({
      success: true,
      deposits,
    });
    
  } catch (error: any) {
    console.error('Get deposits error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deposits' },
      { status: 500 }
    );
  }
}