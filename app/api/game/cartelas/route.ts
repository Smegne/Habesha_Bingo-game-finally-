// app/api/game/cartelas/route.ts - WITH 50-SECOND TEMPORARY HOLD
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

// Define interfaces
interface Cartela {
  id: number;
  cartela_number: string;
  is_available: boolean;
  status?: 'available' | 'waiting' | 'in_game';
  waiting_user_id?: string | null;
  waiting_expires_at?: string | null;
}

// Simple seeded random number generator class
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = Math.abs(seed) || 1;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Generate deterministic card based on cartela ID (1-400)
function generateDeterministicCard(cartelaId: number) {
  console.log('Generating deterministic card for cartela ID:', cartelaId);
  
  const seedValue = cartelaId * 99991;
  const rng = new SeededRandom(seedValue);
  
  const ranges = [
    { min: 1, max: 15, letter: 'B' },
    { min: 16, max: 30, letter: 'I' },
    { min: 31, max: 45, letter: 'N' },
    { min: 46, max: 60, letter: 'G' },
    { min: 61, max: 75, letter: 'O' }
  ];

  const numbers: (number | string)[] = [];
  const cardData = {
    cartelaNumber: cartelaId,
    numbers: [] as Array<{
      number: number | string;
      letter: string;
      row: number;
      col: number;
      index: number;
      isFree?: boolean;
    }>,
    columns: {} as {
      B: number[];
      I: number[];
      N: (number | string)[];
      G: number[];
      O: number[];
    }
  };

  for (let col = 0; col < 5; col++) {
    const columnNumbers: number[] = [];
    const range = ranges[col];
    const columnKey = range.letter as keyof typeof cardData.columns;
    cardData.columns[columnKey] = [];

    while (columnNumbers.length < 5) {
      const randomNum = rng.nextInt(range.min, range.max);
      
      if (!columnNumbers.includes(randomNum)) {
        columnNumbers.push(randomNum);
        (cardData.columns[columnKey] as number[]).push(randomNum);
      }
    }

    columnNumbers.sort((a, b) => a - b);

    for (let row = 0; row < 5; row++) {
      const index = row * 5 + col;
      numbers.push(columnNumbers[row]);
      
      cardData.numbers.push({
        number: columnNumbers[row],
        letter: range.letter,
        row,
        col,
        index
      });
    }
  }

  numbers[12] = 'FREE';
  cardData.numbers[12] = {
    number: 'FREE',
    letter: 'N',
    row: 2,
    col: 2,
    isFree: true,
    index: 12
  };
  
  cardData.columns.N = cardData.columns.N.map((num, idx) => idx === 2 ? 'FREE' : num);

  return {
    cartelaNumber: cartelaId,
    numbers,
    cardData
  };
}

// Cache for generated cards
const cardCache = new Map<number, any>();

function getDeterministicCard(cartelaId: number) {
  if (cardCache.has(cartelaId)) {
    return cardCache.get(cartelaId);
  }
  
  const card = generateDeterministicCard(cartelaId);
  cardCache.set(cartelaId, card);
  return card;
}

export async function GET() {
  try {
    console.log('GET /api/game/cartelas - Fetching cartelas with waiting state');
    
    // Release any expired waiting cartelas (older than 50 seconds)
    await db.execute(
      `UPDATE cartela_card 
       SET status = 'available', 
           waiting_user_id = NULL, 
           waiting_session_id = NULL,
           waiting_expires_at = NULL
       WHERE status = 'waiting' 
         AND waiting_expires_at < NOW()`
    );
    
    // Fetch cartelas with their current status
    const cartelas = await db.query(`
      SELECT 
        cc.id, 
        cc.cartela_number, 
        CASE 
          WHEN cc.status = 'available' THEN TRUE 
          ELSE FALSE 
        END as is_available,
        cc.status,
        cc.waiting_user_id,
        cc.waiting_session_id,
        cc.waiting_expires_at,
        CASE 
          WHEN cc.status = 'waiting' AND cc.waiting_expires_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, NOW(), cc.waiting_expires_at) 
          ELSE NULL 
        END as waiting_seconds_remaining,
        u.username as waiting_username,
        u.first_name as waiting_first_name
      FROM cartela_card cc
      LEFT JOIN users u ON cc.waiting_user_id = u.id
      ORDER BY cc.cartela_number
    `);
    
    console.log('GET /api/game/cartelas - Success:', { count: cartelas.length });
    
    return NextResponse.json({
      success: true,
      cartelas: cartelas as Cartela[],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /api/game/cartelas - Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cartelas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/game/cartelas - Request received');
  
  try {
    const body = await request.json();
    console.log('POST /api/game/cartelas - Request body:', body);
    
    const { cartelaId, userId, generatePreview, saveGame, cardData, action } = body;

    if (!cartelaId) {
      return NextResponse.json(
        { success: false, message: 'Cartela ID is required' },
        { status: 400 }
      );
    }

    // Handle selecting a cartela for waiting (50-second hold)
    if (action === 'select_for_waiting') {
      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'User ID is required to select cartela' },
          { status: 400 }
        );
      }
      return await handleSelectForWaiting(cartelaId, userId);
    }

    // Handle releasing a waiting cartela (user cancels or leaves)
    if (action === 'release_waiting') {
      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'User ID is required to release cartela' },
          { status: 400 }
        );
      }
      return await handleReleaseWaiting(cartelaId, userId);
    }

    // For preview only - generate deterministic card data
    if (generatePreview) {
      console.log('POST /api/game/cartelas - Generating deterministic card for cartelaId:', cartelaId);
      
      const cartelaArray = await db.query(
        `SELECT id, cartela_number, status, waiting_user_id 
         FROM cartela_card WHERE id = ?`,
        [cartelaId]
      ) as any[];

      if (cartelaArray.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Cartela not found' },
          { status: 404 }
        );
      }

      const cartela = cartelaArray[0];
      
      // Allow preview even if cartela is waiting (for the user who selected it)
      if (cartela.status === 'in_game') {
        return NextResponse.json(
          { success: false, message: 'Cartela is already in an active game' },
          { status: 409 }
        );
      }

      // If cartela is waiting for someone else, don't allow preview
      if (cartela.status === 'waiting' && cartela.waiting_user_id !== userId) {
        return NextResponse.json(
          { success: false, message: 'This cartela is currently selected by another user' },
          { status: 409 }
        );
      }

      const deterministicCard = getDeterministicCard(cartelaId);
      
      return NextResponse.json({
        success: true,
        cardData: deterministicCard.cardData,
        cartelaStatus: cartela.status,
        waitingUserId: cartela.waiting_user_id,
        message: 'Deterministic bingo card generated successfully'
      });
    }

    // Save game data (when game actually starts)
    if (saveGame && userId && cardData) {
      return await handleSaveGame(cartelaId, userId, cardData);
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid request parameters'
    }, { status: 400 });

  } catch (error: any) {
    console.error('POST /api/game/cartelas - Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Handle selecting a cartela for waiting - 50 SECOND HOLD ONLY
async function handleSelectForWaiting(cartelaId: number, userId: string) {
  try {
    const result = await db.transaction(async (tx) => {
      // First, release ANY expired waiting cartelas (older than 50 seconds)
      await tx.execute(
        `UPDATE cartela_card 
         SET status = 'available', 
             waiting_user_id = NULL, 
             waiting_session_id = NULL,
             waiting_expires_at = NULL
         WHERE status = 'waiting' 
           AND waiting_expires_at < NOW()`
      );

      // Check current cartela status
      const cartelaCheck = await tx.query(
        `SELECT id, cartela_number, status, waiting_user_id, waiting_expires_at 
         FROM cartela_card 
         WHERE id = ?`,
        [cartelaId]
      ) as any[];

      if (cartelaCheck.length === 0) {
        throw new Error('Cartela not found');
      }

      const cartela = cartelaCheck[0];

      // If cartela is in_game, cannot select
      if (cartela.status === 'in_game') {
        throw new Error('Cartela is already in an active game');
      }

      // If cartela is waiting for someone else (and not expired), cannot select
      if (cartela.status === 'waiting' && 
          cartela.waiting_user_id !== userId && 
          new Date(cartela.waiting_expires_at) > new Date()) {
        throw new Error('This cartela is currently selected by another user');
      }

      // Check if user already has a waiting cartela (and release it)
      const userWaiting = await tx.query(
        `SELECT id FROM cartela_card 
         WHERE waiting_user_id = ? AND status = 'waiting'`,
        [userId]
      ) as any[];

      if (userWaiting.length > 0) {
        // Release the user's previous waiting cartela
        await tx.execute(
          `UPDATE cartela_card 
           SET status = 'available', 
               waiting_user_id = NULL, 
               waiting_session_id = NULL,
               waiting_expires_at = NULL
           WHERE waiting_user_id = ? AND status = 'waiting'`,
          [userId]
        );

        // Log cancellation
        await tx.execute(
          `INSERT INTO cartela_waiting_history (cartela_id, user_id, status)
           VALUES (?, ?, 'auto_released')`,
          [userWaiting[0].id, userId]
        );
      }

      // Set this cartela as waiting (expires in 50 SECONDS)
      await tx.execute(
        `UPDATE cartela_card 
         SET status = 'waiting', 
             waiting_user_id = ?,
             waiting_expires_at = DATE_ADD(NOW(), INTERVAL 50 SECOND)
         WHERE id = ?`,
        [userId, cartelaId]
      );

      // Log selection
      await tx.execute(
        `INSERT INTO cartela_waiting_history (cartela_id, user_id, status)
         VALUES (?, ?, 'selected')`,
        [cartelaId, userId]
      );

      return { 
        success: true,
        expiresIn: 50, // 50 seconds hold time
        message: 'Cartela selected successfully. You have 50 seconds to start the game.'
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in handleSelectForWaiting:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to select cartela' },
      { status: 500 }
    );
  }
}

// Handle releasing a waiting cartela (user cancels or leaves)
async function handleReleaseWaiting(cartelaId: number, userId: string) {
  try {
    const result = await db.transaction(async (tx) => {
      // Verify user owns this waiting cartela and it's not expired
      const cartela = await tx.query(
        `SELECT id, waiting_expires_at FROM cartela_card 
         WHERE id = ? AND waiting_user_id = ? AND status = 'waiting'`,
        [cartelaId, userId]
      ) as any[];

      if (cartela.length === 0) {
        // Check if it's expired
        const expiredCheck = await tx.query(
          `SELECT id FROM cartela_card 
           WHERE id = ? AND status = 'available'`,
          [cartelaId]
        ) as any[];
        
        if (expiredCheck.length > 0) {
          return { 
            success: true, 
            message: 'Cartela selection already expired' 
          };
        }
        
        throw new Error('Cartela not found or you do not have permission');
      }

      // Release the cartela immediately
      await tx.execute(
        `UPDATE cartela_card 
         SET status = 'available', 
             waiting_user_id = NULL, 
             waiting_session_id = NULL,
             waiting_expires_at = NULL
         WHERE id = ?`,
        [cartelaId]
      );

      // Log cancellation
      await tx.execute(
        `INSERT INTO cartela_waiting_history (cartela_id, user_id, status)
         VALUES (?, ?, 'cancelled')`,
        [cartelaId, userId]
      );

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      message: 'Cartela released successfully'
    });

  } catch (error: any) {
    console.error('Error in handleReleaseWaiting:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to release cartela' },
      { status: 500 }
    );
  }
}

// Handle saving game (when game actually starts)
async function handleSaveGame(cartelaId: number, userId: string, cardData: any) {
  try {
    const result = await db.transaction(async (tx) => {
      // Check cartela status - should be waiting and owned by this user (and not expired)
      const cartelaCheck = await tx.query(
        `SELECT id, cartela_number, status, waiting_user_id, waiting_expires_at 
         FROM cartela_card 
         WHERE id = ?`,
        [cartelaId]
      ) as any[];

      if (cartelaCheck.length === 0) {
        throw new Error('Cartela not found');
      }

      const cartela = cartelaCheck[0];

      // Check if cartela is still in waiting status and owned by this user
      if (cartela.status !== 'waiting') {
        throw new Error('Cartela is not in waiting state');
      }

      if (cartela.waiting_user_id !== userId) {
        throw new Error('This cartela was selected by another user');
      }

      // Check if waiting period has expired
      if (new Date(cartela.waiting_expires_at) < new Date()) {
        // Auto-release expired cartela
        await tx.execute(
          `UPDATE cartela_card 
           SET status = 'available', 
               waiting_user_id = NULL, 
               waiting_session_id = NULL,
               waiting_expires_at = NULL
           WHERE id = ?`,
          [cartelaId]
        );
        throw new Error('Your 50-second selection period has expired. Please select again.');
      }

      // Update cartela to in_game
      await tx.execute(
        `UPDATE cartela_card 
         SET status = 'in_game', 
             is_available = FALSE,
             waiting_user_id = NULL,
             waiting_expires_at = NULL
         WHERE id = ?`,
        [cartelaId]
      );

      // Get next card number
      const [lastCard] = await tx.query(
        'SELECT MAX(card_number) as last_number FROM bingo_cards WHERE cartela_id = ?',
        [cartelaId]
      ) as any[];

      const lastNumber = lastCard[0]?.last_number || 0;
      const nextCardNumber = lastNumber + 1;

      // Save bingo card
      const [insertResult] = await tx.execute(
        `INSERT INTO bingo_cards 
         (cartela_id, user_id, card_data, card_number, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [
          cartelaId,
          userId,
          JSON.stringify(cardData),
          nextCardNumber
        ]
      ) as any;

      const bingoCardId = insertResult.insertId;

      // Log to history
      await tx.execute(
        `INSERT INTO cartela_waiting_history (cartela_id, user_id, status)
         VALUES (?, ?, 'joined_game')`,
        [cartelaId, userId]
      );

      return {
        gameId: bingoCardId,
        cardNumber: nextCardNumber,
        gameState: {
          gameId: bingoCardId,
          cartelaNumber: cartela.cartela_number,
          cardNumber: nextCardNumber,
          numbers: cardData.numbers,
          userId: userId,
          createdAt: new Date().toISOString()
        },
        cardData: cardData
      };
    });

    return NextResponse.json({
      success: true,
      gameId: result.gameId,
      cardNumber: result.cardNumber,
      gameState: result.gameState,
      cardData: result.cardData,
      message: 'Game started successfully'
    });

  } catch (error: any) {
    console.error('Error in handleSaveGame:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to start game' },
      { status: 500 }
    );
  }
}