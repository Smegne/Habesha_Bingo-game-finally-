// components/game/leaderboard.tsx
"use client"

import { useState, useEffect } from 'react'
import './bingo-game.css'

interface LeaderboardEntry {
  username: string;
  total_wins: number;
  total_prizes: number;
  last_win: string;
}

interface WinStats {
  recentWins: any[];
  leaderboard: LeaderboardEntry[];
  userStats: {
    totalWins: number;
    totalPrize: number;
  };
}

export default function Leaderboard() {
  const [stats, setStats] = useState<WinStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/game/win', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
      } else {
        setError(result.message || 'Failed to load leaderboard')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading-spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchLeaderboard} className="control-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>🏆 Today's Leaderboard</h2>
        <button onClick={fetchLeaderboard} className="refresh-button">
          🔄
        </button>
      </div>
      
      {stats?.userStats && (
        <div className="user-stats-card">
          <h3>Your Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Wins</div>
              <div className="stat-value">{stats.userStats.totalWins}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Prize</div>
              <div className="stat-value">${stats.userStats.totalPrize.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="leaderboard-list">
        <div className="leaderboard-header-row">
          <div className="rank-col">Rank</div>
          <div className="player-col">Player</div>
          <div className="wins-col">Wins</div>
          <div className="prize-col">Prize</div>
        </div>
        
        {stats?.leaderboard.map((player, index) => (
          <div 
            key={index} 
            className={`leaderboard-row ${index < 3 ? 'top-three' : ''}`}
          >
            <div className="rank-col">
              <div className={`rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}`}>
                {index + 1}
              </div>
            </div>
            <div className="player-col">
              <span className="username">{player.username}</span>
            </div>
            <div className="wins-col">{player.total_wins}</div>
            <div className="prize-col">${player.total_prizes?.toFixed(2) || '0.00'}</div>
          </div>
        ))}
        
        {(!stats?.leaderboard || stats.leaderboard.length === 0) && (
          <div className="no-data-message">
            No wins recorded yet today. Be the first to win!
          </div>
        )}
      </div>
      
      {stats?.recentWins && stats.recentWins.length > 0 && (
        <div className="recent-wins">
          <h3>Your Recent Wins</h3>
          <div className="wins-list">
            {stats.recentWins.slice(0, 5).map((win: any, index: number) => (
              <div key={index} className="win-item">
                <div className="win-cartela">Cartela #{win.cartela_number}</div>
                <div className="win-details">
                  <span className={`win-type ${win.win_type}`}>{win.win_type}</span>
                  <span className="win-position">{win.win_position}{getOrdinalSuffix(win.win_position)}</span>
                  <span className="win-prize">${win.prize_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="win-time">
                  {new Date(win.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getOrdinalSuffix(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]
}