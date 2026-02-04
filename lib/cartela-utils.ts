// C:\Projects\habesha-bingo-app (2)\lib\cartela-utils.ts
export interface Cartela {
  id: number;
  card_number: number;
  numbers: number[][];
  is_used: boolean;
  selected_by?: string;
  game_id?: string;
}

// Optimized number parsing
// In cartela-utils.ts
export function parseCartelaNumbers(numbers: any): number[][] {
  try {
    let parsed;
    
    // Handle string input
    if (typeof numbers === 'string') {
      parsed = JSON.parse(numbers);
    } 
    // Handle already parsed object
    else if (numbers && typeof numbers === 'object') {
      parsed = numbers;
    }
    // Invalid input
    else {
      return Array(5).fill(0).map(() => Array(5).fill(0));
    }
    
    // Ensure it's a 5x5 array and convert to integers
    if (Array.isArray(parsed)) {
      return parsed.map(row => 
        Array.isArray(row) 
          ? row.map(num => {
              const numValue = Number(num);
              // Handle both integers and floats like 7.0
              if (Number.isInteger(numValue)) {
                return numValue;
              } else {
                // If it's a float, round it
                const rounded = Math.round(numValue);
                // Check if it was originally an integer (like 7.0)
                return Math.abs(numValue - rounded) < 0.001 ? rounded : 0;
              }
            })
          : Array(5).fill(0)
      );
    }
    
    return Array(5).fill(0).map(() => Array(5).fill(0));
  } catch (error) {
    console.error('Error parsing cartela numbers:', error);
    return Array(5).fill(0).map(() => Array(5).fill(0));
  }
}

export function validateBingoCard(numbers: number[][]): boolean {
  if (!Array.isArray(numbers) || numbers.length !== 5) return false;
  return numbers.every(row => Array.isArray(row) && row.length === 5);
}

// Traditional bingo column ranges
export const BINGO_COLUMNS = {
  'B': { min: 1, max: 15 },
  'I': { min: 16, max: 30 },
  'N': { min: 31, max: 45 },
  'G': { min: 46, max: 60 },
  'O': { min: 61, max: 75 }
};

export function isNumberInColumn(num: number, column: keyof typeof BINGO_COLUMNS): boolean {
  const range = BINGO_COLUMNS[column];
  return num >= range.min && num <= range.max;
}

// Optimized formatter
export function formatCartelaForDisplay(cartela: any): Cartela {
  return {
    id: cartela.id || 0,
    card_number: cartela.card_number || cartela.id || 0,
    numbers: parseCartelaNumbers(cartela.numbers),
    is_used: Boolean(cartela.is_used),
    selected_by: cartela.selected_by,
    game_id: cartela.game_id
  };
}

// Helper to generate a test card
export function generateTestCard(cardNumber: number): Cartela {
  const numbers: number[][] = [];
  
  for (let row = 0; row < 5; row++) {
    const rowNumbers: number[] = [];
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        rowNumbers.push(0); // FREE
      } else {
        const base = col * 15 + 1;
        const num = base + Math.floor(Math.random() * 15);
        rowNumbers.push(num);
      }
    }
    numbers.push(rowNumbers);
  }
  
  return {
    id: cardNumber,
    card_number: cardNumber,
    numbers: numbers,
    is_used: false
  };
}