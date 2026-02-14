import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      tables: {},
      errors: []
    };

    // 1. Check cartela_card table
    try {
      const cartelas = await db.query('SELECT COUNT(*) as count FROM cartela_card');
      results.tables.cartela_card = {
        exists: true,
        count: cartelas[0]?.count || 0
      };
    } catch (error: any) {
      results.tables.cartela_card = { exists: false, error: error.message };
      results.errors.push(`cartela_card: ${error.message}`);
    }

    // 2. Check bingo_cards table
    try {
      const bingoCards = await db.query('SELECT COUNT(*) as count FROM bingo_cards');
      results.tables.bingo_cards = {
        exists: true,
        count: bingoCards[0]?.count || 0
      };
    } catch (error: any) {
      results.tables.bingo_cards = { exists: false, error: error.message };
      results.errors.push(`bingo_cards: ${error.message}`);
    }

    // 3. Check game_sessions table
    try {
      const sessions = await db.query('SELECT COUNT(*) as count FROM game_sessions');
      results.tables.game_sessions = {
        exists: true,
        count: sessions[0]?.count || 0
      };
      
      // Check columns
      const columns = await db.query('SHOW COLUMNS FROM game_sessions');
      results.tables.game_sessions.columns = columns.map((c: any) => c.Field);
    } catch (error: any) {
      results.tables.game_sessions = { exists: false, error: error.message };
      results.errors.push(`game_sessions: ${error.message}`);
    }

    // 4. Check game_players_queue table
    try {
      const queue = await db.query('SELECT COUNT(*) as count FROM game_players_queue');
      results.tables.game_players_queue = {
        exists: true,
        count: queue[0]?.count || 0
      };
    } catch (error: any) {
      results.tables.game_players_queue = { exists: false, error: error.message };
      results.errors.push(`game_players_queue: ${error.message}`);
    }

    // 5. Test a sample cartela
    try {
      const sampleCartela = await db.query(
        'SELECT id, cartela_number, is_available FROM cartela_card WHERE is_available = TRUE LIMIT 1'
      );
      results.sample_cartela = sampleCartela[0] || null;
    } catch (error: any) {
      results.sample_cartela_error = error.message;
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}