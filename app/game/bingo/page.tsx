'use client'

import { useState, useEffect } from 'react'

export default function BingoGame() {
  const [loading, setLoading] = useState(true)
  const [gameData, setGameData] = useState(null)

  useEffect(() => {
    // Fetch game data
    const fetchGame = async () => {
      try {
        const response = await fetch('/api/game/bingo')
        const data = await response.json()
        setGameData(data)
      } catch (error) {
        console.error('Error loading game:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGame()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Bingo Game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bingo Game</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Your bingo game UI here */}
        <p className="text-gray-600">Game content coming soon...</p>
      </div>
    </div>
  )
}