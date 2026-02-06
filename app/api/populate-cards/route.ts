// app/api/populate-cards/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/mysql-db';

function generateBingoNumbers(): number[][] {
  const numbers = Array.from({ length: 5 }, () => Array(5).fill(0));
  
  for (let col = 0; col < 5; col++) {
    const usedNumbers = new Set<number>();
    for (let row = 0; row < 5; row++) {
      if (row === 2 && col === 2) {
        numbers[row][col] = 0; // Free space
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

export async function POST() {
  try {
    console.log('Populating cartelas table...');
    
    // Check if table exists
    const [tables] = await db.query(
      "SHOW TABLES LIKE 'cartelas'"
    ) as any[];
    
    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'cartelas table does not exist. Create it first.',
        action: 'CREATE_TABLE_FIRST'
      });
    }
    
    // Check if we already have cards
    const [existing] = await db.query(
      'SELECT COUNT(*) as count FROM cartelas'
    ) as any[];
    
    if (existing[0].count > 0) {
      return NextResponse.json({
        success: true,
        message: `Already have ${existing[0].count} cards. To regenerate, delete first.`,
        count: existing[0].count,
        action: 'CARDS_EXIST'
      });
    }
    
    // Generate and insert 400 cards
    console.log('Generating 400 bingo cards...');
    
    const batchSize = 100;
    const totalCards = 400;
    
    for (let batch = 0; batch < totalCards / batchSize; batch++) {
      const values = [];
      const params = [];
      const startCard = batch * batchSize + 1;
      const endCard = Math.min((batch + 1) * batchSize, totalCards);
      
      for (let i = startCard; i <= endCard; i++) {
        const numbers = generateBingoNumbers();
        values.push('(?, ?)');
        params.push(i, JSON.stringify(numbers));
      }
      
      await db.query(
        `INSERT INTO cartelas (card_number, numbers) VALUES ${values.join(', ')}`,
        params
      );
      
      console.log(`Inserted cards ${startCard} to ${endCard}`);
    }
    
    // Verify
    const [finalCount] = await db.query(
      'SELECT COUNT(*) as count FROM cartelas'
    ) as any[];
    
    // Sample some cards
    const [samples] = await db.query(
      'SELECT id, card_number, is_used FROM cartelas ORDER BY card_number LIMIT 5'
    ) as any[];
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${finalCount[0].count} bingo cards`,
      count: finalCount[0].count,
      samples: samples,
      action: 'POPULATED'
    });
    
  } catch (error: any) {
    console.error('Populate cards error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      action: 'POPULATE_FAILED'
    });
  }
}