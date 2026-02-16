// app/api/game/auto-call/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

// Store active timers (in production, use Redis or similar)
const activeGames = new Map();

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID required' },
        { status: 400 }
      );
    }

    // Check if game is already auto-calling
    if (activeGames.has(sessionId)) {
      return NextResponse.json({
        success: true,
        message: 'Auto-calling already active',
        isActive: true
      });
    }

    // Start auto-calling in the background
    startAutoCalling(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Auto-calling started',
      isActive: true
    });

  } catch (error: any) {
    console.error('Auto-call error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID required' },
        { status: 400 }
      );
    }

    // Stop auto-calling
    if (activeGames.has(sessionId)) {
      clearInterval(activeGames.get(sessionId));
      activeGames.delete(sessionId);
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-calling stopped'
    });

  } catch (error: any) {
    console.error('Stop auto-call error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

function startAutoCalling(sessionId: number) {
  // Clear any existing timer
  if (activeGames.has(sessionId)) {
    clearInterval(activeGames.get(sessionId));
  }

  // Set up interval (every 3 seconds)
  const timer = setInterval(async () => {
    try {
      await callNextNumber(sessionId);
    } catch (error) {
      console.error(`Error auto-calling for session ${sessionId}:`, error);
    }
  }, 3000);

  activeGames.set(sessionId, timer);
}

async function callNextNumber(sessionId: number) {
  // Use a transaction to ensure atomicity
  await db.transaction(async (tx) => {
    // 1. Get current game state
    const session = await tx.query(
      `SELECT * FROM game_sessions WHERE id = ? FOR UPDATE`,
      [sessionId]
    ) as any[];

    if (!session[0] || session[0].status !== 'active') {
      // Game not active, stop auto-calling
      if (activeGames.has(sessionId)) {
        clearInterval(activeGames.get(sessionId));
        activeGames.delete(sessionId);
      }
      return;
    }

    // 2. Parse called numbers
    let calledNumbers: number[] = [];
    if (session[0].called_numbers) {
      try {
        calledNumbers = JSON.parse(session[0].called_numbers);
      } catch (e) {
        calledNumbers = [];
      }
    }

    // 3. Check if all numbers are called
    if (calledNumbers.length >= 75) {
      // Game over - all numbers called
      await tx.execute(
        `UPDATE game_sessions SET status = 'finished', finished_at = NOW() WHERE id = ?`,
        [sessionId]
      );
      
      if (activeGames.has(sessionId)) {
        clearInterval(activeGames.get(sessionId));
        activeGames.delete(sessionId);
      }
      return;
    }

    // 4. Generate next random number (not called yet)
    let nextNumber: number;
    const availableNumbers = [];
    
    for (let i = 1; i <= 75; i++) {
      if (!calledNumbers.includes(i)) {
        availableNumbers.push(i);
      }
    }

    if (availableNumbers.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    nextNumber = availableNumbers[randomIndex];

    // 5. Add to called numbers
    calledNumbers.push(nextNumber);
    
    await tx.execute(
      `UPDATE game_sessions 
       SET called_numbers = ?, 
           last_called_at = NOW(),
           last_called_number = ?
       WHERE id = ?`,
      [JSON.stringify(calledNumbers), nextNumber, sessionId]
    );

    console.log(`Session ${sessionId}: Called number ${nextNumber}`);

    // 6. Check for winners after each call
    await checkForWinners(tx, sessionId, calledNumbers, nextNumber);

  });
}

async function checkForWinners(tx: any, sessionId: number, calledNumbers: number[], lastNumber: number) {
  // Get all players in this session
  const players = await tx.query(
    `SELECT gpq.*, bc.card_data 
     FROM game_players_queue gpq
     JOIN bingo_cards bc ON gpq.bingo_card_id = bc.id
     WHERE gpq.session_id = ? AND gpq.status = 'playing'`,
    [sessionId]
  ) as any[];

  const winners = [];

  for (const player of players) {
    const cardData = JSON.parse(player.card_data);
    const matrix = transformCardData(cardData);
    
    // Update matches based on called numbers
    updateCardMatches(matrix, calledNumbers);
    
    // Check for win patterns
    const winResult = checkWinPatterns(matrix);
    
    if (winResult.hasWin) {
      winners.push({
        userId: player.user_id,
        winType: winResult.winType,
        winPattern: winResult.winPattern,
        bingoCardId: player.bingo_card_id
      });
    }
  }

  if (winners.length > 0) {
    // Sort by win time (first come, first served)
    // In a real implementation, you'd track exact timing
    
    const firstWinner = winners[0];
    
    // Update session with winner
    await tx.execute(
      `UPDATE game_sessions 
       SET status = 'finished', 
           winner_user_id = ?,
           winning_pattern = ?,
           winning_type = ?,
           finished_at = NOW()
       WHERE id = ?`,
      [firstWinner.userId, JSON.stringify(firstWinner.winPattern), firstWinner.winType, sessionId]
    );

    // Stop auto-calling
    if (activeGames.has(sessionId)) {
      clearInterval(activeGames.get(sessionId));
      activeGames.delete(sessionId);
    }

    // Create win records
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      await tx.execute(
        `INSERT INTO game_wins 
         (game_session_id, user_id, bingo_card_id, win_type, win_pattern, win_position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [sessionId, winner.userId, winner.bingoCardId, winner.winType, 
         JSON.stringify(winner.winPattern), i + 1]
      );
    }

    console.log(`Session ${sessionId} has ${winners.length} winner(s)!`);
  }
}

// Helper functions (same as before)
function transformCardData(cardData: any) {
  // Your existing transformCardData function
  const matrix = [];
  
  for (let row = 0; row < 5; row++) {
    const rowArray = [];
    for (let col = 0; col < 5; col++) {
      rowArray.push({
        text: '',
        num: null,
        isMatch: false,
        isWin: false,
        row,
        col
      });
    }
    matrix.push(rowArray);
  }
  
  cardData.numbers.forEach((cell: any) => {
    if (cell.row !== undefined && cell.col !== undefined) {
      matrix[cell.row][cell.col] = {
        text: cell.isFree ? 'FREE' : cell.number,
        num: cell.isFree ? null : Number(cell.number),
        isMatch: cell.isFree || false,
        isWin: false,
        row: cell.row,
        col: cell.col
      };
    }
  });
  
  return matrix;
}

function updateCardMatches(matrix: any[][], calledNumbers: number[]) {
  matrix.forEach(row => {
    row.forEach(cell => {
      if (cell.num && calledNumbers.includes(cell.num)) {
        cell.isMatch = true;
      }
    });
  });
}

function checkWinPatterns(matrix: any[][]): { hasWin: boolean; winType: string; winPattern: number[] } {
  const wins: { type: string; cells: any[]; pattern: number[] }[] = [];
  
  // Check rows
  for (let r = 0; r < 5; r++) {
    if (matrix[r].every(cell => cell.isMatch)) {
      wins.push({
        type: 'horizontal',
        cells: matrix[r],
        pattern: matrix[r].map(cell => cell.row * 5 + cell.col)
      });
    }
  }
  
  // Check columns
  for (let c = 0; c < 5; c++) {
    const col = [];
    for (let r = 0; r < 5; r++) col.push(matrix[r][c]);
    if (col.every(cell => cell.isMatch)) {
      wins.push({
        type: 'vertical',
        cells: col,
        pattern: col.map(cell => cell.row * 5 + cell.col)
      });
    }
  }
  
  // Check diagonals
  const diag1 = [matrix[0][0], matrix[1][1], matrix[2][2], matrix[3][3], matrix[4][4]];
  if (diag1.every(cell => cell.isMatch)) {
    wins.push({
      type: 'diagonal',
      cells: diag1,
      pattern: diag1.map(cell => cell.row * 5 + cell.col)
    });
  }
  
  const diag2 = [matrix[0][4], matrix[1][3], matrix[2][2], matrix[3][1], matrix[4][0]];
  if (diag2.every(cell => cell.isMatch)) {
    wins.push({
      type: 'diagonal',
      cells: diag2,
      pattern: diag2.map(cell => cell.row * 5 + cell.col)
    });
  }
  
  // Check four corners
  const corners = [matrix[0][0], matrix[0][4], matrix[4][0], matrix[4][4]];
  if (corners.every(cell => cell.isMatch)) {
    wins.push({
      type: 'corners',
      cells: corners,
      pattern: corners.map(cell => cell.row * 5 + cell.col)
    });
  }
  
  // Check 2x2 squares
  const squares = [
    [matrix[0][0], matrix[0][1], matrix[1][0], matrix[1][1]],
    [matrix[0][3], matrix[0][4], matrix[1][3], matrix[1][4]],
    [matrix[3][0], matrix[3][1], matrix[4][0], matrix[4][1]],
    [matrix[3][3], matrix[3][4], matrix[4][3], matrix[4][4]],
    [matrix[2][2], matrix[2][3], matrix[3][2], matrix[3][3]]
  ];
  
  squares.forEach((square, index) => {
    if (square.every(cell => cell.isMatch)) {
      wins.push({
        type: 'square',
        cells: square,
        pattern: square.map(cell => cell.row * 5 + cell.col)
      });
    }
  });
  
  // Check full house
  const allCells = matrix.flat();
  const allMarked = allCells.every(cell => cell.isMatch || cell.text === 'FREE');
  if (allMarked) {
    wins.push({
      type: 'full-house',
      cells: allCells,
      pattern: allCells.map(cell => cell.row * 5 + cell.col)
    });
  }
  
  if (wins.length > 0) {
    return {
      hasWin: true,
      winType: wins[0].type,
      winPattern: wins[0].pattern
    };
  }
  
  return { hasWin: false, winType: '', winPattern: [] };
}