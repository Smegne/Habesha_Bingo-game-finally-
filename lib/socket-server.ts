import { Server } from 'socket.io';
import { createServer } from 'http';
import { verifySocketToken } from './auth';
import { db } from './mysql-db';

// Active game rooms
const gameRooms = new Map<string, {
  gameId: string;
  players: Map<string, any>;
  calledNumbers: Set<number>;
  timer: NodeJS.Timeout | null;
}>();

export function setupSocketServer(server: any) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.WEBAPP_URL 
        : 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    const user = verifySocketToken(token);
    
    if (!user) {
      return next(new Error('Invalid token'));
    }
    
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`User connected: ${user.username}`);
    
    // Join user's personal room
    socket.join(`user:${user.userId}`);
    
    // Join game room if in a game
    socket.on('join-game', async (gameId: string) => {
      // Check if user is in this game
      const [player] = await db.query(
        `SELECT gp.*, g.status 
         FROM game_players gp
         JOIN games g ON gp.game_id = g.id
         WHERE gp.game_id = ? AND gp.user_id = ?`,
        [gameId, user.userId]
      ) as any[];
      
      if (player.length === 0) {
        socket.emit('error', 'Not a player in this game');
        return;
      }
      
      socket.join(`game:${gameId}`);
      
      // Initialize game room if not exists
      if (!gameRooms.has(gameId)) {
        gameRooms.set(gameId, {
          gameId,
          players: new Map(),
          calledNumbers: new Set(),
          timer: null,
        });
      }
      
      const room = gameRooms.get(gameId)!;
      room.players.set(user.userId, {
        userId: user.userId,
        username: user.username,
        socketId: socket.id,
        markedNumbers: new Set(),
      });
      
      // Send current game state
      const [calledNumbers] = await db.query(
        'SELECT number FROM game_numbers WHERE game_id = ? ORDER BY called_at',
        [gameId]
      ) as any[];
      
      const numbers = calledNumbers.map((row: any) => row.number);
      socket.emit('game-state', {
        calledNumbers: numbers,
        players: Array.from(room.players.values()).map(p => ({
          userId: p.userId,
          username: p.username,
        })),
      });
      
      // Notify other players
      socket.to(`game:${gameId}`).emit('player-joined', {
        userId: user.userId,
        username: user.username,
      });
      
      // Start game if enough players (2+)
      if (room.players.size >= 2 && player[0].status === 'waiting') {
        startGame(gameId, io);
      }
    });
    
    // Mark number on card
    socket.on('mark-number', async ({ gameId, number }) => {
      const room = gameRooms.get(gameId);
      if (!room) return;
      
      // Check if number is called
      if (!room.calledNumbers.has(number)) {
        socket.emit('error', 'Number not called yet');
        return;
      }
      
      // Mark number for player
      const player = room.players.get(user.userId);
      if (player) {
        player.markedNumbers.add(number);
        
        // Check for win
        const winPattern = await checkWin(user.userId, gameId, player.markedNumbers);
        
        if (winPattern) {
          // Declare winner
          await declareWinner(gameId, user.userId, winPattern, io);
        }
      }
    });
    
    // Call number (admin only)
    socket.on('call-number', async (gameId: string) => {
      const room = gameRooms.get(gameId);
      if (!room || user.role !== 'admin') return;
      
      await callNextNumber(gameId, io);
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.username}`);
      
      // Remove from game rooms
      gameRooms.forEach((room, gameId) => {
        if (room.players.has(user.userId)) {
          room.players.delete(user.userId);
          
          // Notify other players
          io.to(`game:${gameId}`).emit('player-left', {
            userId: user.userId,
            username: user.username,
          });
          
          // Clean up empty rooms
          if (room.players.size === 0) {
            if (room.timer) {
              clearInterval(room.timer);
            }
            gameRooms.delete(gameId);
          }
        }
      });
    });
  });

  return io;
}

// Game functions
async function startGame(gameId: string, io: Server) {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  // Update game status in database
  await db.query(
    `UPDATE games 
     SET status = 'in_progress', started_at = NOW()
     WHERE id = ?`,
    [gameId]
  );
  
  // Notify all players
  io.to(`game:${gameId}`).emit('game-started', {
    message: 'Game started!',
    startedAt: new Date(),
  });
  
  // Start number calling interval (every 10 seconds)
  room.timer = setInterval(async () => {
    await callNextNumber(gameId, io);
  }, 10000);
}

async function callNextNumber(gameId: string, io: Server) {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  // Get remaining numbers (1-75)
  const allNumbers = new Set(Array.from({ length: 75 }, (_, i) => i + 1));
  room.calledNumbers.forEach(num => allNumbers.delete(num));
  
  if (allNumbers.size === 0) {
    // No more numbers, end game
    await endGame(gameId, io);
    return;
  }
  
  // Pick random number
  const remaining = Array.from(allNumbers);
  const newNumber = remaining[Math.floor(Math.random() * remaining.length)];
  
  // Determine letter
  let letter: string;
  if (newNumber <= 15) letter = 'B';
  else if (newNumber <= 30) letter = 'I';
  else if (newNumber <= 45) letter = 'N';
  else if (newNumber <= 60) letter = 'G';
  else letter = 'O';
  
  // Record in database
  await db.query(
    `INSERT INTO game_numbers (game_id, number, letter)
     VALUES (?, ?, ?)`,
    [gameId, newNumber, letter]
  );
  
  room.calledNumbers.add(newNumber);
  
  // Broadcast to all players
  io.to(`game:${gameId}`).emit('number-called', {
    number: newNumber,
    letter,
    calledAt: new Date(),
    totalCalled: room.calledNumbers.size,
  });
  
  // Check if any player has bingo
  room.players.forEach(async (player, userId) => {
    const winPattern = await checkWin(userId, gameId, player.markedNumbers);
    if (winPattern) {
      await declareWinner(gameId, userId, winPattern, io);
    }
  });
}

async function checkWin(
  userId: string, 
  gameId: string, 
  markedNumbers: Set<number>
): Promise<string | null> {
  // Get player's card
  const [playerData] = await db.query(
    `SELECT c.numbers 
     FROM game_players gp
     JOIN cartelas c ON gp.cartela_id = c.id
     WHERE gp.game_id = ? AND gp.user_id = ?`,
    [gameId, userId]
  ) as any[];
  
  if (playerData.length === 0) return null;
  
  const cardNumbers = JSON.parse(playerData[0].numbers);
  
  // Check horizontal lines
  for (let row = 0; row < 5; row++) {
    if (cardNumbers[row].every((num: number) => 
      num === 0 || markedNumbers.has(num)
    )) {
      return 'horizontal';
    }
  }
  
  // Check vertical lines
  for (let col = 0; col < 5; col++) {
    if (cardNumbers.every((row: number[]) => 
      row[col] === 0 || markedNumbers.has(row[col])
    )) {
      return 'vertical';
    }
  }
  
  // Check diagonals
  const diag1 = [cardNumbers[0][0], cardNumbers[1][1], cardNumbers[2][2], 
                 cardNumbers[3][3], cardNumbers[4][4]];
  const diag2 = [cardNumbers[0][4], cardNumbers[1][3], cardNumbers[2][2],
                 cardNumbers[3][1], cardNumbers[4][0]];
  
  if (diag1.every(num => num === 0 || markedNumbers.has(num))) {
    return 'diagonal';
  }
  if (diag2.every(num => num === 0 || markedNumbers.has(num))) {
    return 'diagonal';
  }
  
  // Check 2x2 squares
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const square = [
        cardNumbers[row][col],
        cardNumbers[row][col + 1],
        cardNumbers[row + 1][col],
        cardNumbers[row + 1][col + 1],
      ];
      if (square.every(num => num === 0 || markedNumbers.has(num))) {
        return 'square';
      }
    }
  }
  
  return null;
}

async function declareWinner(
  gameId: string, 
  userId: string, 
  winPattern: string,
  io: Server
) {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  // Stop calling numbers
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
  
  // Get game stake
  const [game] = await db.query(
    'SELECT stake FROM games WHERE id = ?',
    [gameId]
  ) as any[];
  
  if (game.length === 0) return;
  
  const stake = game[0].stake;
  const winAmount = stake * 5; // 5x multiplier
  
  // Update game in database
  await db.transaction(async (connection) => {
    // Update game
    await connection.execute(
      `UPDATE games 
       SET status = 'completed', 
           winner_id = ?, 
           win_pattern = ?,
           completed_at = NOW()
       WHERE id = ?`,
      [userId, winPattern, gameId]
    );
    
    // Update player
    await connection.execute(
      `UPDATE game_players 
       SET has_won = TRUE, win_amount = ?
       WHERE game_id = ? AND user_id = ?`,
      [winAmount, gameId, userId]
    );
    
    // Update user balance
    await connection.execute(
      `UPDATE users 
       SET balance = balance + ?
       WHERE id = ?`,
      [winAmount, userId]
    );
    
    // Record transaction
    await connection.execute(
      `INSERT INTO transactions 
      (user_id, type, amount, description, reference_id)
      VALUES (?, 'game_win', ?, 'Bingo win', ?)`,
      [userId, winAmount, gameId]
    );
    
    // Record game history
    await connection.execute(
      `INSERT INTO game_history 
      (user_id, game_id, cartela_id, stake, result, win_pattern, win_amount)
      SELECT ?, ?, cartela_id, ?, 'win', ?, ?
      FROM game_players 
      WHERE game_id = ? AND user_id = ?`,
      [userId, gameId, stake, winPattern, winAmount, gameId, userId]
    );
  });
  
  // Get winner info
  const [winner] = await db.query(
    'SELECT username FROM users WHERE id = ?',
    [userId]
  ) as any[];
  
  // Broadcast winner
  io.to(`game:${gameId}`).emit('winner', {
    winnerId: userId,
    winnerName: winner[0]?.username,
    winPattern,
    winAmount,
  });
  
  // Clean up room
  gameRooms.delete(gameId);
}

async function endGame(gameId: string, io: Server) {
  const room = gameRooms.get(gameId);
  if (!room) return;
  
  // Stop timer
  if (room.timer) {
    clearInterval(room.timer);
  }
  
  // Update game status
  await db.query(
    `UPDATE games 
     SET status = 'completed', completed_at = NOW()
     WHERE id = ?`,
    [gameId]
  );
  
  // Refund all players
  const [game] = await db.query(
    'SELECT stake FROM games WHERE id = ?',
    [gameId]
  ) as any[];
  
  if (game.length > 0) {
    const stake = game[0].stake;
    
    // Get all players
    const players = await db.query(
      'SELECT user_id FROM game_players WHERE game_id = ?',
      [gameId]
    ) as any[];
    
    // Refund each player
    for (const player of players) {
      await db.query(
        `UPDATE users SET balance = balance + ? WHERE id = ?`,
        [stake, player.user_id]
      );
      
      await db.query(
        `INSERT INTO transactions 
        (user_id, type, amount, description, reference_id)
        VALUES (?, 'game_stake', ?, 'Game cancelled - refund', ?)`,
        [player.user_id, stake, gameId]
      );
    }
  }
  
  // Notify players
  io.to(`game:${gameId}`).emit('game-ended', {
    message: 'Game ended - no winner',
  });
  
  // Clean up
  gameRooms.delete(gameId);
}