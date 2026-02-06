// app/api/games/cards/seed/route.ts (POST endpoint)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

// Function to generate valid bingo numbers
function generateBingoNumbers(): number[][] {
  const numbers = Array.from({ length: 5 }, () => Array(5).fill(0));
  
  // Standard bingo: each column has a range
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  const ranges = [
    { min: 1, max: 15 },   // B
    { min: 16, max: 30 },  // I
    { min: 31, max: 45 },  // N
    { min: 46, max: 60 },  // G
    { min: 61, max: 75 },  // O
  ];
  
  for (let col = 0; col < 5; col++) {
    const usedNumbers = new Set<number>();
    const { min, max } = ranges[col];
    
    for (let row = 0; row < 5; row++) {
      if (row === 2 && col === 2) {
        // Center is free space
        numbers[row][col] = 0;
        continue;
      }
      
      let num;
      do {
        num = Math.floor(Math.random() * (max - min + 1)) + min;
      } while (usedNumbers.has(num));
      
      usedNumbers.add(num);
      numbers[row][col] = num;
    }
  }
  
  return numbers;
}

export async function POST(request: NextRequest) {
  try {
    // Clear existing cards
    await db.query('DELETE FROM cartelas');
    console.log('Cleared existing cards');
    
    // Generate 400 cards
    const cards = [];
    for (let i = 1; i <= 400; i++) {
      const numbers = generateBingoNumbers();
      const numbersJson = JSON.stringify(numbers);
      
      cards.push([i, numbersJson]);
    }
    
    // Insert all cards in batches
    const batchSize = 50;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const values = batch.map(() => '(?, ?)').join(', ');
      const params = batch.flat();
      
      await db.query(
        `INSERT INTO cartelas (card_number, numbers) VALUES ${values}`,
        params
      );
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}`);
    }
    
    // Verify insertion
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM cartelas'
    ) as any[];
    
    return NextResponse.json({
      success: true,
      message: `Successfully generated ${result[0].count} bingo cards`,
      count: result[0].count,
    });
    
  } catch (error: any) {
    console.error('Seed cards error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to seed cards',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}