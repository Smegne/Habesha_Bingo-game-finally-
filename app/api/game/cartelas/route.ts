// app/api/game/cartelas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

// Define interfaces
interface Cartela {
  id: number;
  cartela_number: string;
  is_available: boolean;
}

export async function GET() {
  try {
    console.log('GET /api/game/cartelas - Fetching available cartelas');
    
    // Fetch available cartelas using db.query
    const cartelas = await db.query(
      'SELECT id, cartela_number, is_available FROM cartela_card WHERE is_available = TRUE ORDER BY cartela_number'
    );
    
    console.log('GET /api/game/cartelas - Success:', { count: cartelas.length });
    
    return NextResponse.json({
      success: true,
      cartelas: cartelas as Cartela[]
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
    
    const { cartelaId, userId, generatePreview, saveGame, cardData } = body;

    // Validate required fields
    if (!cartelaId) {
      console.log('POST /api/game/cartelas - Missing cartelaId');
      return NextResponse.json(
        { success: false, message: 'Cartela ID is required' },
        { status: 400 }
      );
    }

    // For preview only - generate card data
    if (generatePreview) {
      console.log('POST /api/game/cartelas - Generating preview for cartelaId:', cartelaId);
      
      // Check if cartela exists and is available
      const cartelaArray = await db.query(
        'SELECT id, cartela_number, is_available FROM cartela_card WHERE id = ?',
        [cartelaId]
      ) as Cartela[];

      if (cartelaArray.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Cartela not found' },
          { status: 404 }
        );
      }

      const cartela = cartelaArray[0];
      const previewCardData = generateBingoCardData(cartela.cartela_number);
      
      console.log('POST /api/game/cartelas - Preview generated successfully');
      
      return NextResponse.json({
        success: true,
        cardData: previewCardData,
        message: 'Bingo card generated successfully'
      });
    }

    // Save game data
    if (saveGame && userId && cardData) {
      console.log('POST /api/game/cartelas - Saving game data:', {
        cartelaId,
        userId,
        cardDataNumbers: cardData.numbers?.length
      });

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.log('POST /api/game/cartelas - Invalid userId format:', userId);
        return NextResponse.json(
          { success: false, message: 'Invalid user ID format' },
          { status: 400 }
        );
      }

      try {
        // Use transaction for atomic operations
        const result = await db.transaction(async (tx) => {
          console.log('POST /api/game/cartelas - Starting transaction');
          
          // 1. Check cartela availability - FIXED: Use 'id' instead of 'cartela_id'
          const cartelaCheck = await tx.query(
            'SELECT id, cartela_number FROM cartela_card WHERE id = ? AND is_available = TRUE',
            [cartelaId]
          ) as Cartela[];

          if (cartelaCheck.length === 0) {
            throw new Error('Cartela is no longer available');
          }

          const cartela = cartelaCheck[0];
          console.log('POST /api/game/cartelas - Cartela found:', cartela.cartela_number);

          // 2. Update cartela as unavailable
          const [updateResult] = await tx.execute(
            'UPDATE cartela_card SET is_available = FALSE WHERE id = ?',
            [cartelaId]
          ) as any;

          console.log('POST /api/game/cartelas - Cartela updated, affected rows:', updateResult.affectedRows);

          // 3. Get next card number for this cartela
          const [lastCard] = await tx.query(
            'SELECT MAX(card_number) as last_number FROM bingo_cards WHERE cartela_id = ?',
            [cartelaId]
          ) as any[];

          const lastNumber = lastCard[0]?.last_number || 0;
          const nextCardNumber = lastNumber + 1;
          console.log('POST /api/game/cartelas - Next card number:', nextCardNumber);

          // 4. Save bingo card to database
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
          console.log('POST /api/game/cartelas - Bingo card saved, ID:', bingoCardId);

          // 5. Create game session (optional - might be done in sessions route)
          await tx.execute(
            `INSERT INTO game_sessions 
             (session_code, status, created_at) 
             VALUES (?, 'waiting', NOW())`,
            [`BINGO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`]
          );

          console.log('POST /api/game/cartelas - Game session placeholder created');

          // Prepare response data
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

        console.log('POST /api/game/cartelas - Transaction completed successfully');
        
        return NextResponse.json({
          success: true,
          gameId: result.gameId,
          cardNumber: result.cardNumber,
          gameState: result.gameState,
          cardData: result.cardData,
          message: 'Game started successfully'
        });

      } catch (transactionError: any) {
        console.error('POST /api/game/cartelas - Transaction failed:', transactionError);
        
        if (transactionError.message === 'Cartela is no longer available') {
          return NextResponse.json(
            { success: false, message: 'Cartela is no longer available' },
            { status: 409 }
          );
        }
        
        throw transactionError;
      }
    }

    console.log('POST /api/game/cartelas - Invalid parameters');
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

// Helper function to generate BINGO card data
function generateBingoCardData(cartelaNumber: string) {
  console.log('Generating BINGO card data for cartela:', cartelaNumber);
  
  // BINGO ranges
  const ranges = [
    { min: 1, max: 15, letter: 'B' },
    { min: 16, max: 30, letter: 'I' },
    { min: 31, max: 45, letter: 'N' },
    { min: 46, max: 60, letter: 'G' },
    { min: 61, max: 75, letter: 'O' }
  ];

  const numbers: (number | string)[] = [];
  const cardData: any = {
    cartelaNumber: cartelaNumber,
    numbers: [],
    columns: {},
    generatedAt: new Date().toISOString()
  };

  // Generate numbers for each column
  for (let col = 0; col < 5; col++) {
    const columnNumbers: number[] = [];
    const range = ranges[col];
    cardData.columns[range.letter] = [];

    // Generate 5 unique numbers for this column
    while (columnNumbers.length < 5) {
      const randomNum = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      if (!columnNumbers.includes(randomNum)) {
        columnNumbers.push(randomNum);
        cardData.columns[range.letter].push(randomNum);
      }
    }

    // Sort numbers
    columnNumbers.sort((a, b) => a - b);

    // Add column numbers to the card
    for (let row = 0; row < 5; row++) {
      numbers.push(columnNumbers[row]);
      cardData.numbers.push({
        number: columnNumbers[row],
        letter: range.letter,
        row,
        col,
        index: row * 5 + col
      });
    }
  }

  // Set the center cell as FREE
  numbers[12] = 'FREE';
  cardData.numbers[12] = {
    number: 'FREE',
    letter: 'N',
    row: 2,
    col: 2,
    isFree: true,
    index: 12
  };

  console.log('Generated card with', numbers.length, 'cells');
  return cardData;
}