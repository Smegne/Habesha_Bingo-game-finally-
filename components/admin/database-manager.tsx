// components/admin/database-manager.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DatabaseManager() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [message, setMessage] = useState("")

  const checkDatabase = async () => {
    setLoading(true)
    setMessage("Checking database...")
    try {
      const response = await fetch('/api/db-test')
      const data = await response.json()
      setStatus(data)
      setMessage(data.success ? "Database check complete" : "Database check failed")
    } catch (error) {
      setMessage("Error checking database")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const seedCards = async () => {
    if (!confirm("This will generate 400 new bingo cards. Continue?")) {
      return
    }
    
    setLoading(true)
    setMessage("Generating cards...")
    try {
      const response = await fetch('/api/games/cards/seed', {
        method: 'POST',
      })
      const data = await response.json()
      setMessage(data.message || "Cards generated")
      // Refresh status
      checkDatabase()
    } catch (error) {
      setMessage("Error generating cards")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const checkCardStatus = async () => {
    setLoading(true)
    setMessage("Checking cards...")
    try {
      const response = await fetch('/api/games/cards/stats')
      const data = await response.json()
      setMessage(`Found ${data.stats.totalCards} cards (${data.stats.availableCards} available)`)
    } catch (error) {
      setMessage("Error checking cards")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Database Management</CardTitle>
        <CardDescription>
          Manage bingo cards and database setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button 
              onClick={checkDatabase} 
              disabled={loading}
              variant="outline"
            >
              Check Database
            </Button>
            <Button 
              onClick={checkCardStatus} 
              disabled={loading}
              variant="outline"
            >
              Check Cards
            </Button>
            <Button 
              onClick={seedCards} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Generate Cards
            </Button>
          </div>
          
          {message && (
            <div className={`p-3 rounded ${message.includes("Error") ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>
              {message}
            </div>
          )}
          
          {status && (
            <div className="space-y-2">
              <h4 className="font-semibold">Database Status:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}