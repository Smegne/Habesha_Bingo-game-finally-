import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

// Helper function to generate valid bingo numbers (5x5 grid)
function generateBingoNumbers(): number[][] {
  const numbers = Array.from({ length: 5 }, () => Array(5).fill(0));
  
  // Standard bingo: each column has a range
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  for (let col = 0; col < 5; col++) {
    const usedNumbers = new Set<number>();
    for (let row = 0; row < 5; row++) {
      if (row === 2 && col === 2) {
        // Center is free space
        numbers[row][col] = 0;
        continue;
      }
      
      let num;
      do {
        const min = col * 15 + 1;
        const max = min + 14;
        num = Math.floor(Math.random() * (max - min + 1)) + min;
      } while (usedNumbers.has(num));
      
      usedNumbers.add(num);
      numbers[row][col] = num;
    }
  }
  
  return numbers;
}

// Helper function to generate mock bingo cards
function generateMockCards(count: number): any[] {
  return Array.from({ length: count }, (_, i) => {
    const cardId = i + 1;
    return {
      id: cardId,
      card_number: cardId,
      numbers: generateBingoNumbers(),
      is_used: i % 5 === 0, // 20% are used
      isSelected: i % 5 === 0,
      selected_by: i % 5 === 0 ? 'user_' + i : null,
      selected_by_username: i % 5 === 0 ? 'Player ' + i : null,
    };
  });
}

// GET endpoint to fetch all cards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Default to 100
    
    console.log('Fetching cards with params:', { gameId, page, limit });
    
    let query: string;
    let params: any[] = [];
    let totalCount = 0;
    
    if (gameId) {
      query = `
        SELECT 
          c.id,
          c.card_number,
          c.numbers,
          c.is_used,
          c.selected_by,
          u.username as selected_by_username
        FROM cartelas c
        LEFT JOIN users u ON c.selected_by = u.id
        WHERE c.game_id = ? 
        ORDER BY c.card_number
        LIMIT ? OFFSET ?
      `;
      params = [gameId, limit, (page - 1) * limit];
    } else {
      query = `
        SELECT 
          id,
          card_number,
          numbers,
          is_used,
          selected_by
        FROM cartelas 
        ORDER BY card_number
        LIMIT ? OFFSET ?
      `;
      params = [limit, (page - 1) * limit];
    }
    
    console.log('Executing query:', query);
    console.log('Query params:', params);
    
    // Test database connection first
    try {
      const [testResult] = await db.query('SELECT 1 as test') as any[];
      console.log('Database connection test:', testResult);
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed',
          details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
        },
        { status: 500 }
      );
    }
    
    // Get total count
    try {
      const [totalResult] = await db.query(
        'SELECT COUNT(*) as total FROM cartelas'
      ) as any[];
      totalCount = totalResult[0]?.total || 0;
    } catch (countError) {
      console.warn('Failed to get total count:', countError);
      totalCount = 400; // Default to 400 for mock data
    }
    
    // Execute the main query
    const [cardsResult] = await db.query(query, params) as any[];
    console.log('Query result count:', cardsResult?.length || 0);
    
    // If no cards returned, use mock data
    let cardsToReturn;
    
    if (!cardsResult || !Array.isArray(cardsResult) || cardsResult.length === 0) {
      console.log('No cards found in database, using mock data');
      
      // Apply pagination to mock data
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const allMockCards = generateMockCards(400);
      
      // Slice for current page
      cardsToReturn = allMockCards.slice(startIndex, endIndex);
      
      // Update totalCount for mock data
      totalCount = 400;
      
      console.log(`Mock data: page=${page}, showing cards ${startIndex + 1}-${Math.min(endIndex, 400)}`);
    } else {
      // Parse numbers from database
      cardsToReturn = cardsResult.map((card: any) => {
        let parsedNumbers;
        try {
          // Try to parse JSON string
          if (typeof card.numbers === 'string') {
            parsedNumbers = JSON.parse(card.numbers);
          } else if (Array.isArray(card.numbers)) {
            parsedNumbers = card.numbers;
          } else {
            parsedNumbers = generateBingoNumbers();
          }
          
          // Ensure it's a 5x5 array
          if (!Array.isArray(parsedNumbers) || parsedNumbers.length !== 5) {
            parsedNumbers = generateBingoNumbers();
          }
        } catch (error) {
          console.warn(`Error parsing numbers for card ${card.id}:`, error);
          parsedNumbers = generateBingoNumbers();
        }
        
        return {
          id: card.id,
          card_number: card.card_number || card.id,
          numbers: parsedNumbers,
          is_used: Boolean(card.is_used),
          isSelected: Boolean(card.is_used),
          selected_by: card.selected_by || null,
          selected_by_username: card.selected_by_username || null,
        };
      });
    }
    
    console.log(`Returning ${cardsToReturn.length} cards for page ${page}`);
    
    return NextResponse.json({
      success: true,
      cards: cardsToReturn,
      total: cardsToReturn.length,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      hasMore: (page * limit) < totalCount,
    });
    
  } catch (error: any) {
    console.error('Get cards error:', error);
    
    // For development, return mock data with pagination
    if (process.env.NODE_ENV === 'development') {
      console.log('Error occurred, returning mock data for development');
      
      const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '100');
      
      // Apply pagination to mock data
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const allMockCards = generateMockCards(400);
      const mockCards = allMockCards.slice(startIndex, endIndex);
      
      return NextResponse.json({
        success: true,
        cards: mockCards,
        total: mockCards.length,
        totalCount: 400,
        totalPages: Math.ceil(400 / limit),
        currentPage: page,
        hasMore: (page * limit) < 400,
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch cards',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST endpoint to select a card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardNumber, stake, userId } = body;
    
    console.log('Select card request:', { cardNumber, stake, userId });
    
    if (!cardNumber || !stake || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // For development, simulate success
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: simulating card selection');
      return NextResponse.json({
        success: true,
        message: 'Card selected successfully (development mode)',
        data: {
          gameId: 'dev-game-' + Date.now(),
          cardId: cardNumber,
          cardNumber,
          stake,
        },
      });
    }
    
    // Start transaction
    const result = await db.transaction(async (connection) => {
      // Check user balance
      const [user] = await connection.execute(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      ) as any[];
      
      if (user.length === 0) {
        throw new Error('User not found');
      }
      
      if (user[0].balance < stake) {
        throw new Error('Insufficient balance');
      }
      
      // Check card availability
      const [card] = await connection.execute(
        'SELECT * FROM cartelas WHERE card_number = ? AND is_used = FALSE',
        [cardNumber]
      ) as any[];
      
      if (card.length === 0) {
        throw new Error('Card not available or already taken');
      }
      
      // Find or create waiting game
      const [waitingGames] = await connection.execute(
        `SELECT id FROM games 
         WHERE status = 'waiting' AND stake = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [stake]
      ) as any[];
      
      let gameId;
      
      if (waitingGames.length > 0) {
        gameId = waitingGames[0].id;
      } else {
        // Create new game
        const [newGame] = await connection.execute(
          `INSERT INTO games (stake, status) 
           VALUES (?, 'waiting')`,
          [stake]
        ) as any;
        gameId = newGame.insertId;
      }
      
      // Deduct stake from user balance
      await connection.execute(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [stake, userId]
      );
      
      // Mark card as used and assign to game
      await connection.execute(
        `UPDATE cartelas 
         SET game_id = ?, selected_by = ?, selected_at = NOW(), is_used = TRUE
         WHERE card_number = ?`,
        [gameId, userId, cardNumber]
      );
      
      // Add player to game
      await connection.execute(
        `INSERT INTO game_players (game_id, user_id, cartela_id)
         VALUES (?, ?, ?)`,
        [gameId, userId, card[0].id]
      );
      
      // Record transaction
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, reference_id)
         VALUES (?, 'game_stake', ?, 'Bingo game stake', ?)`,
        [userId, -stake, gameId]
      );
      
      return {
        gameId,
        cardId: card[0].id,
        cardNumber,
        stake,
      };
    });
    
    return NextResponse.json({
      success: true,
      message: 'Card selected successfully',
      data: result,
    });
    
  } catch (error: any) {
    console.error('Select card error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to select card' 
      },
      { status: 400 }
    );
  }
}

// PATCH endpoint to update a card
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardId, updates } = body;
    
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Card ID is required' },
        { status: 400 }
      );
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (updates.is_used !== undefined) {
      updateFields.push('is_used = ?');
      updateValues.push(updates.is_used);
    }
    
    if (updates.selected_by !== undefined) {
      updateFields.push('selected_by = ?');
      updateValues.push(updates.selected_by);
    }
    
    if (updates.game_id !== undefined) {
      updateFields.push('game_id = ?');
      updateValues.push(updates.game_id);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }
    
    updateValues.push(cardId);
    
    const query = `
      UPDATE cartelas 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    await db.execute(query, updateValues);
    
    return NextResponse.json({
      success: true,
      message: 'Card updated successfully',
    });
    
  } catch (error: any) {
    console.error('Update card error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update card' 
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a card (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Card ID is required' },
        { status: 400 }
      );
    }
    
    await db.execute('DELETE FROM cartelas WHERE id = ?', [cardId]);
    
    return NextResponse.json({
      success: true,
      message: 'Card deleted successfully',
    });
    
  } catch (error: any) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete card' 
      },
      { status: 500 }
    );
  }
}