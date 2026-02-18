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
    <div className=" top-4 fixed inset-0 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-blue-900/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 max-w-lg w-full mx-4 border border-purple-500/30 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 mb-2">
            {sessionStatus === 'countdown' ? 'Game Starting Soon!' : 'Waiting for Players'}
          </h2>
          <p className="text-white/70 text-lg">
            {sessionStatus === 'countdown' 
              ? 'Get ready! Game starts in...' 
              : 'Share this code with friends:'}
          </p>
          
          {/* Session Code */}
          <div className="mt-4 inline-block px-6 py-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl border border-purple-500/50">
            <span className="text-2xl font-mono font-bold text-white tracking-wider">
              {sessionCode}
            </span>
          </div>
        </div>

        {/* Countdown Timer */}
        {sessionStatus === 'countdown' && (
          <div className="text-center mb-8">
            <div className="relative inline-block">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full animate-ping bg-red-500/20"></div>
              <div className="absolute inset-0 rounded-full animate-pulse bg-orange-500/30"></div>
              
              {/* Timer display */}
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-red-700 to-orange-700"></div>
                <div className="relative flex flex-col items-center justify-center">
                  <ClockFill size={32} className="text-white mb-1" />
                  <span className="text-6xl md:text-7xl font-bold text-white">
                    {countdown}
                  </span>
                  <span className="text-white/80 text-sm mt-1">seconds</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <PeopleFill size={10} className="text-green-400" />
              Players in Lobby
            </h3>
            <span className="px-2 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-sm font-bold text-white">
              {players.length}=players
            </span>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {players.map((player, index) => (
              <div 
                key={player.user_id}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  {player.player_status === 'ready' && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-white font-semibold flex items-center gap-2">
                    {player.first_name || player.username}
                    {player.user_id === userId && (
                      <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-white">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-white/50 text-sm">
                    Joined {new Date(player.joined_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                
                {player.player_status === 'waiting' && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status Message */}
        {sessionStatus === 'waiting' && (
          <div className="p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/30 mb-6">
            <p className="text-yellow-300 text-center font-semibold mb-2">
              ⏳ Waiting for players to join...
            </p>
            <p className="text-white/70 text-sm text-center">
              {players.length === 1 
                ? 'Need 1 more player to start the countdown!'
                : `Game will start when at least 2 players are ready.`}
            </p>
          </div>
        )}

        {sessionStatus === 'countdown' && (
          <div className="p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/30 mb-6">
            <p className="text-green-300 text-center font-semibold">
              🎮 Game starting in {countdown} seconds!
            </p>
            <p className="text-white/70 text-sm text-center mt-1">
              {players.length} players ready. Get your BINGO cards ready!
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
            className="px-8 py-3 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white rounded-xl font-semibold hover:from-red-500 hover:to-pink-500 transition-all border border-red-500/50 hover:border-transparent flex items-center gap-2 mx-auto"
          >
            <XCircleFill size={20} />
            Cancel & Exit
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default CountdownDisplay;