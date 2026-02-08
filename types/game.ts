// types/game.ts
export interface BingoCardData {
  columns: {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
  };
  numbers: Array<{
    col: number;
    row: number;
    index: number;
    letter: string;
    number: number | string;
    isFree?: boolean;
  }>;
  generatedAt: string;
  cartelaNumber: string;
}

export interface BingoCard {
  id: number;
  cartela_id: number;
  user_id: string;
  card_data: BingoCardData;
  card_number: number;
  created_at: string;
}

export interface CartelaCard {
  id: number;
  cartela_number: string;
  is_available: boolean;
  created_at: string;
}

export interface GameSession {
  cartela_id: number;
  user_id: string;
  bingo_card_id: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface BingoGameState {
  gameId: number;
  cartelaNumber: string;
  cardNumber: number;
  numbers: BingoCardData['numbers'];
  userId: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// types/game.ts - Add these interfaces
export interface GameSession {
  id: number;
  cartela_id: number;
  user_id: string;
  bingo_card_id: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
}

export interface WinDeclarationData {
  gameSessionId: number;
  bingoCardId: number;
  userId: string;
  winType: 'row' | 'column' | 'diagonal' | 'full-house';
  winPattern: number[]; // indices of winning cells
  calledNumbers: number[];
  timestamp: string;
}

export interface WinConfirmationResponse {
  success: boolean;
  data?: {
    isWinner: boolean;
    isFirstWinner?: boolean;
    position?: number;
    prizeAmount?: number;
    message: string;
  };
  error?: string;
}