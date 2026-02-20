// lib/deterministic-cards.ts

interface CardConfig {
  cartelaNumber: string | number; // Can be string or number now
  numbers: (number | string)[];
  cardData: {
    cartelaNumber: string | number;
    numbers: Array<{
      number: number | string;
      letter: string;
      row: number;
      col: number;
      index: number;
      isFree?: boolean;
    }>;
    columns: {
      B: number[];
      I: number[];
      N: (number | string)[];
      G: number[];
      O: number[];
    };
  };
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: string | number) {
    // Convert input to string for consistent hashing
    const seedString = String(seed);
    
    // Create a hash from the string
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and ensure it's not zero
    this.seed = Math.abs(hash) || 1;
    
    console.log(`Seed for ${seedString}: ${this.seed}`);
  }

  // Returns a random number between 0 and 1
  next(): number {
    // Simple but effective PRNG
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Returns a random integer between min and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Generate deterministic card based on cartela number (1-400)
export function generateDeterministicCard(cartelaId: number | string): CardConfig {
  console.log('Generating deterministic card for cartela ID:', cartelaId);
  
  // Convert to number if it's a string number
  const numericId = typeof cartelaId === 'string' ? parseInt(cartelaId, 10) : cartelaId;
  
  // Use the numeric ID as seed (1-400)
  // We add a large prime to create variation between consecutive IDs
  const seedValue = numericId * 99991; // Large prime multiplier for better distribution
  
  // Create seeded random generator
  const rng = new SeededRandom(seedValue);
  
  // BINGO ranges
  const ranges = [
    { min: 1, max: 15, letter: 'B' },
    { min: 16, max: 30, letter: 'I' },
    { min: 31, max: 45, letter: 'N' },
    { min: 46, max: 60, letter: 'G' },
    { min: 61, max: 75, letter: 'O' }
  ];

  const numbers: (number | string)[] = [];
  const cardData = {
    cartelaNumber: numericId,
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

  // Generate numbers for each column using seeded random
  for (let col = 0; col < 5; col++) {
    const columnNumbers: number[] = [];
    const range = ranges[col];
    const columnKey = range.letter as keyof typeof cardData.columns;
    cardData.columns[columnKey] = [];

    // Generate 5 unique numbers for this column
    while (columnNumbers.length < 5) {
      const randomNum = rng.nextInt(range.min, range.max);
      
      if (!columnNumbers.includes(randomNum)) {
        columnNumbers.push(randomNum);
        (cardData.columns[columnKey] as number[]).push(randomNum);
      }
    }

    // Sort numbers in ascending order (standard bingo card format)
    columnNumbers.sort((a, b) => a - b);

    // Add to card
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

  // Set the center cell as FREE (index 12 in a 5x5 grid)
  numbers[12] = 'FREE';
  cardData.numbers[12] = {
    number: 'FREE',
    letter: 'N',
    row: 2,
    col: 2,
    isFree: true,
    index: 12
  };
  
  // Update N column to include FREE at the center position (third element)
  cardData.columns.N = cardData.columns.N.map((num, idx) => idx === 2 ? 'FREE' : num);

  return {
    cartelaNumber: numericId,
    numbers,
    cardData
  };
}

// Optional: Cache generated cards to avoid regenerating
const cardCache = new Map<string, CardConfig>();

export function getDeterministicCard(cartelaId: number | string): CardConfig {
  const cacheKey = String(cartelaId);
  
  // Check cache first
  if (cardCache.has(cacheKey)) {
    console.log('Cache hit for cartela:', cartelaId);
    return cardCache.get(cacheKey)!;
  }
  
  // Generate new card
  console.log('Cache miss for cartela:', cartelaId);
  const card = generateDeterministicCard(cartelaId);
  cardCache.set(cacheKey, card);
  return card;
}

// Helper to preview cards for multiple IDs
export function previewCards(startId: number, count: number = 5) {
  console.log(`\n=== Previewing cards for cartelas ${startId} to ${startId + count - 1} ===\n`);
  
  for (let id = startId; id < startId + count; id++) {
    const card = generateDeterministicCard(id);
    
    console.log(`\n--- Cartela #${id} ---`);
    console.log('B: ' + card.cardData.columns.B.map(n => n.toString().padStart(2, ' ')).join(' '));
    console.log('I: ' + card.cardData.columns.I.map(n => n.toString().padStart(2, ' ')).join(' '));
    console.log('N: ' + card.cardData.columns.N.map(n => n === 'FREE' ? '  FREE' : n.toString().padStart(2, ' ')).join(' '));
    console.log('G: ' + card.cardData.columns.G.map(n => n.toString().padStart(2, ' ')).join(' '));
    console.log('O: ' + card.cardData.columns.O.map(n => n.toString().padStart(2, ' ')).join(' '));
  }
}

// Verify that same ID always produces same card
export function verifyDeterministicCards() {
  console.log('\n=== Verifying Deterministic Behavior ===\n');
  
  const testIds = [1, 42, 73, 105, 256, 399];
  
  for (const id of testIds) {
    console.log(`\nTesting Cartela #${id}:`);
    
    // Generate twice
    const card1 = generateDeterministicCard(id);
    const card2 = generateDeterministicCard(id);
    
    // Compare first rows
    const row1_card1 = card1.cardData.numbers.slice(0, 5).map(n => n.number);
    const row1_card2 = card2.cardData.numbers.slice(0, 5).map(n => n.number);
    
    console.log(`  Run 1 - First row: ${row1_card1.join(' | ')}`);
    console.log(`  Run 2 - First row: ${row1_card2.join(' | ')}`);
    console.log(`  Match: ${JSON.stringify(row1_card1) === JSON.stringify(row1_card2) ? '✅' : '❌'}`);
  }
}