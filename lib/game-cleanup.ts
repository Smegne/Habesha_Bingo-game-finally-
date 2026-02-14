// lib/game-cleanup.ts
import { db } from '@/lib/mysql-db';

export async function cleanupOldSessions() {
  try {
    // Find sessions that have been waiting too long (more than 2 minutes)
    const oldSessions = await db.query(`
      SELECT gs.id 
      FROM game_sessions gs
      WHERE gs.status = 'waiting'
        AND TIMESTAMPDIFF(MINUTE, gs.created_at, NOW()) > 2
    `) as any[];
    
    for (const session of oldSessions) {
      console.log(`🧹 Cleaning up old session ${session.id}`);
      
      await db.transaction(async (tx) => {
        // Make cartelas available again
        await tx.execute(`
          UPDATE cartela_card cc
          JOIN bingo_cards bc ON cc.id = bc.cartela_id
          JOIN game_players_queue gpq ON bc.id = gpq.bingo_card_id
          SET cc.is_available = TRUE
          WHERE gpq.session_id = ?
        `, [session.id]);
        
        // Update session status
        await tx.execute(`
          UPDATE game_sessions 
          SET status = 'cancelled',
              updated_at = NOW()
          WHERE id = ?
        `, [session.id]);
        
        // Update player status
        await tx.execute(`
          UPDATE game_players_queue 
          SET status = 'disconnected',
              left_at = NOW()
          WHERE session_id = ?
        `, [session.id]);
      });
    }
    
    console.log(`🧹 Cleaned up ${oldSessions.length} old sessions`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldSessions, 5 * 60 * 1000);
}