// app/api/game/call-number/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, number, userId } = body;

    if (!sessionId || !number) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get current called numbers
      const session = await tx.query(
        'SELECT called_numbers FROM game_sessions WHERE id = ? FOR UPDATE',
        [sessionId]
      ) as any[];

      if (!session || session.length === 0) {
        throw new Error('Session not found');
      }

      let calledNumbers: number[] = [];
      if (session[0].called_numbers) {
        try {
          calledNumbers = JSON.parse(session[0].called_numbers);
        } catch (e) {
          calledNumbers = [];
        }
      }

      // Check if number already called
      if (calledNumbers.includes(number)) {
        return {
          success: true,
          alreadyCalled: true,
          calledNumbers
        };
      }

      // Add new number
      calledNumbers.push(number);

      // Update session
      await tx.execute(
        'UPDATE game_sessions SET called_numbers = ? WHERE id = ?',
        [JSON.stringify(calledNumbers), sessionId]
      );

      // Log the call
      await tx.execute(
        `INSERT INTO game_number_calls (session_id, number, called_by, called_at)
         VALUES (?, ?, ?, NOW())`,
        [sessionId, number, userId]
      );

      return {
        success: true,
        alreadyCalled: false,
        calledNumbers,
        number
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Call number error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to call number' },
      { status: 500 }
    );
  }
}