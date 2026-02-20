// components/game/CountdownDisplay.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ClockFill, PeopleFill, XCircleFill } from 'react-bootstrap-icons';

interface CountdownDisplayProps {
  sessionCode: string;
  userId: string;
  onGameStart: () => void;
  onCancel: (reason: string) => void;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({
  sessionCode,
  userId,
  onGameStart,
  onCancel
}) => {
  const [countdown, setCountdown] = useState<number>(50);
  const [players, setPlayers] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartedRef = useRef<boolean>(false);

  // Cleanup function
  const cleanup = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollingRef.current = null;
    timerRef.current = null;
  };

  // Start real-time countdown timer
  const startCountdownTimer = (initialSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setCountdown(initialSeconds);
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // In CountdownDisplay.tsx - Update the fetchSession function

// Fetch session state
const fetchSession = async () => {
  try {
    const response = await fetch(`/api/game/sessions?code=${sessionCode}&userId=${userId}`);
    const data = await response.json();
    
    if (data.success) {
      const session = data.session;
      const currentPlayers = data.players;
      
      setPlayers(currentPlayers);
      setSessionStatus(session.status);
      
      // Handle session states
      if (session.status === 'cancelled') {
        cleanup();
        onCancel('No other players joined. Please try again.');
        return;
      }
      
      if (session.status === 'active' || session.shouldStartGame) {
        if (!gameStartedRef.current) {
          gameStartedRef.current = true;
          cleanup();
          
          // Pass the full session data when starting the game
          onGameStart();
          
          // Optionally store the session data in localStorage
          localStorage.setItem('currentSessionData', JSON.stringify({
            session: session,
            players: currentPlayers
          }));
        }
        return;
      }
      
      // Update countdown for countdown state
      if (session.status === 'countdown') {
        // Only start timer if we don't have one or if the countdown changed significantly
        if (!timerRef.current) {
          startCountdownTimer(session.countdownRemaining);
        } else if (Math.abs(countdown - session.countdownRemaining) > 2) {
          // Sync with server if drift is more than 2 seconds
          setCountdown(session.countdownRemaining);
        }
      }
      
      setIsLoading(false);
    }
  } catch (error) {
    console.error('Session fetch error:', error);
    setError('Connection lost. Reconnecting...');
  }
};

  // Initial fetch and polling
  useEffect(() => {
    fetchSession();
    
    // Poll every 2 seconds for session updates
    pollingRef.current = setInterval(fetchSession, 2000);
    
    return cleanup;
  }, [sessionCode, userId]);

  // Don't show countdown for cancelled/active games
  if (sessionStatus === 'cancelled') return null;
  if (sessionStatus === 'active') return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to game...</p>
        </div>
      </div>
    );
  }

return (
  <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 z-50 flex items-center justify-center p-4 backdrop-blur-sm">

    {/* Scrollable Container */}
    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-green-100 shadow-2xl p-6 sm:p-8">

      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 mb-2">
          {sessionStatus === 'countdown'
            ? 'Game Starting Soon!'
            : 'Waiting for Players'}
        </h2>

        <p className="text-green-600 text-base sm:text-lg">
          {sessionStatus === 'countdown'
            ? 'Get ready! Game starts in...'
            : 'Share this code with friends:'}
        </p>

        {/* Session Code */}
        <div className="mt-4 inline-block px-5 py-3 bg-green-100 rounded-2xl border border-green-300">
          <span className="text-xl sm:text-2xl font-mono font-bold text-green-800 tracking-widest">
            {sessionCode}
          </span>
        </div>
      </div>

      {/* Countdown */}
      {sessionStatus === 'countdown' && (
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto rounded-full bg-green-600 flex items-center justify-center shadow-xl shadow-green-200">
            <div className="flex flex-col items-center">
              <ClockFill size={24} className="text-white mb-1" />
              <span className="text-4xl sm:text-6xl md:text-7xl font-bold text-white">
                {countdown}
              </span>
              <span className="text-green-100 text-xs sm:text-sm">
                seconds
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="mb-6 sm:mb-8">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-green-700 flex items-center gap-2">
            <PeopleFill size={18} className="text-green-500" />
            Players in Lobby
          </h3>

          <span className="px-3 py-1 bg-green-600 rounded-full text-xs sm:text-sm font-bold text-white">
            {players.length} Players
          </span>
        </div>

        {/* Scrollable players section */}
        <div className="space-y-3 max-h-56 sm:max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {players.map((player, index) => (
            <div
              key={player.user_id}
              className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition"
            >
              <div className="relative">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>

                {player.player_status === 'ready' && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                )}
              </div>

              <div className="flex-1">
                <p className="text-green-800 font-semibold text-sm sm:text-base flex items-center gap-2">
                  {player.first_name || player.username}

                  {player.user_id === userId && (
                    <span className="px-2 py-0.5 text-xs bg-green-600 rounded-full text-white">
                      You
                    </span>
                  )}
                </p>

                <p className="text-green-600 text-xs sm:text-sm">
                  Joined{' '}
                  {new Date(player.joined_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {player.player_status === 'waiting' && (
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Message */}
      {sessionStatus === 'waiting' && (
        <div className="p-4 sm:p-5 bg-yellow-50 rounded-2xl border border-yellow-200 mb-6">
          <p className="text-yellow-600 text-center font-semibold mb-1 text-sm sm:text-base">
            ⏳ Waiting for players to join...
          </p>
        </div>
      )}

      {sessionStatus === 'countdown' && (
        <div className="p-4 sm:p-5 bg-green-50 rounded-2xl border border-green-200 mb-6">
          <p className="text-green-700 text-center font-semibold text-sm sm:text-base">
            🎮 Game starting in {countdown} seconds!
          </p>
        </div>
      )}

      {/* Cancel Button */}
      <div className="text-center">
        <button
          onClick={() => {
            cleanup();
            onCancel('User cancelled');
          }}
          className="w-full sm:w-auto px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow hover:shadow-lg flex items-center justify-center gap-2 mx-auto"
        >
          <XCircleFill size={18} />
          Cancel & Exit
        </button>
      </div>

    </div>

  </div>
);
};

export default CountdownDisplay;