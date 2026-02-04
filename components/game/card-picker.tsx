"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useGameStore } from "@/lib/game-store"
import { BingoCardDisplay } from "./bingo-card-display"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface CardPickerProps {
  stake: 10 | 20
  onSelect: (cardId: number) => void
}

export function CardPicker({ stake, onSelect }: CardPickerProps) {
  const { availableCards, user, fetchAvailableCards, cardsPagination } = useGameStore()
  const [cardNumber, setCardNumber] = useState("")
  const [previewCard, setPreviewCard] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch cards on mount and when page changes
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true)
        // Fetch cards for the current page (100 per page)
        await fetchAvailableCards(undefined, currentPage, 100)
      } catch (err) {
        console.error("Failed to load cards:", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadCards()
  }, [fetchAvailableCards, currentPage])

  const handleSelect = () => {
    const num = parseInt(cardNumber)
    if (num >= 1 && num <= 400) {
      const card = availableCards.find((c) => 
        c.card_number === num || c.id === num
      )
      if (card && !card.is_used && !card.isSelected) {
        onSelect(num)
      }
    }
  }

  const selectedCardData = previewCard 
    ? availableCards.find((c) => 
        c.card_number === previewCard || c.id === previewCard
      ) 
    : null

  // Calculate statistics
  const availableCount = useMemo(() => 
    availableCards.filter(card => !card.is_used && !card.isSelected).length,
    [availableCards]
  )
  const usedCount = useMemo(() => 
    availableCards.filter(card => card.is_used || card.isSelected).length,
    [availableCards]
  )

  // Use pagination from store or calculate locally
  const totalPages = cardsPagination?.totalPages || 4 // 400 cards / 100 per page = 4 pages
  const totalCards = cardsPagination?.totalCards || 400
  
  // Calculate page ranges
  const pageRanges = useMemo(() => {
    const ranges = []
    for (let i = 0; i < totalPages; i++) {
      const start = i * 100 + 1
      const end = Math.min((i + 1) * 100, totalCards)
      ranges.push({ start, end })
    }
    return ranges
  }, [totalPages, totalCards])

  const currentRange = pageRanges[currentPage - 1] || { start: 1, end: 100 }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium">Your Balance: <span className={`font-bold ${(user?.balance || 0) < stake ? 'text-destructive' : 'text-green-600'}`}>${user?.balance || 0}</span></p>
          <p className="text-sm">Stake: <span className="font-bold">${stake}</span></p>
        </div>
        <p className="text-xs text-muted-foreground">
          {availableCount} cards available • {usedCount} cards taken • Total: {totalCards} cards
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Page {currentPage} of {totalPages} (Cards {currentRange.start}-{currentRange.end})
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          max={400}
          placeholder="Enter card number (1-400)"
          value={cardNumber}
          onChange={(e) => {
            setCardNumber(e.target.value)
            const num = parseInt(e.target.value)
            if (num >= 1 && num <= 400) {
              setPreviewCard(num)
              // Auto-navigate to the correct page
              const cardPage = Math.ceil(num / 100)
              if (cardPage !== currentPage) {
                setCurrentPage(cardPage)
              }
            }
          }}
        />
        <Button
          onClick={handleSelect}
          disabled={
            !cardNumber ||
            parseInt(cardNumber) < 1 ||
            parseInt(cardNumber) > 400 ||
            (user?.balance || 0) < stake
          }
        >
          {user?.balance && user.balance < stake ? "Insufficient Balance" : "Select Card"}
        </Button>
      </div>

      {selectedCardData && (
        <div className="space-y-2 p-4 border rounded-lg">
          <p className="text-sm font-medium">
            Card #{selectedCardData.card_number} Preview{" "}
            {(selectedCardData.is_used || selectedCardData.isSelected) && (
              <Badge variant="destructive" className="ml-2">
                Taken
              </Badge>
            )}
          </p>
          <BingoCardDisplay card={selectedCardData} small />
          {(selectedCardData.is_used || selectedCardData.isSelected) ? (
            <p className="text-xs text-destructive">This card is already taken by another player</p>
          ) : user?.balance && user.balance < stake ? (
            <p className="text-xs text-destructive">You need ${stake} to select this card</p>
          ) : (
            <p className="text-xs text-green-600">Available to select for ${stake}</p>
          )}
        </div>
      )}

      <div className="border rounded-lg p-4">
        {/* Pagination Controls - TOP */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <h3 className="text-sm font-medium mb-2 text-center">
          Cards {currentRange.start} to {currentRange.end}
        </h3>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading cards...</p>
          </div>
        ) : availableCards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No cards available</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-10 gap-1 max-h-96 overflow-y-auto p-2 bg-muted/20 rounded">
              {availableCards.map((card) => {
                const cardId = card.card_number || card.id
                const isUsed = card.is_used || card.isSelected
                const canAfford = (user?.balance || 0) >= stake
                
                return (
                  <button
                    key={cardId}
                    onClick={() => {
                      setCardNumber(cardId.toString())
                      setPreviewCard(cardId)
                    }}
                    disabled={isUsed || !canAfford}
                    className={`aspect-square text-xs rounded transition-colors relative ${
                      isUsed
                        ? "bg-destructive/20 text-destructive-foreground cursor-not-allowed"
                        : !canAfford
                        ? "bg-yellow-500/20 text-yellow-800 cursor-not-allowed"
                        : previewCard === cardId
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 hover:bg-primary/20 text-foreground"
                    }`}
                    title={
                      isUsed 
                        ? `Card ${cardId} - Taken` 
                        : !canAfford 
                        ? `Card ${cardId} - Need $${stake} (You have $${user?.balance || 0})`
                        : `Card ${cardId} - Available for $${stake}`
                    }
                  >
                    {cardId}
                    {isUsed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-destructive rounded-full"></div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            
            {/* Pagination Controls - BOTTOM */}
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Cards {currentRange.start}-{currentRange.end} of {totalCards}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex justify-center items-center mt-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/10 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500/20 rounded"></div>
                <span>Need Funds</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-destructive/20 rounded"></div>
                <span>Taken</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick navigation to specific card ranges */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm font-medium text-blue-800">🚀 Quick Jump to Page</p>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[1, 2, 3, 4].map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum === 1 && "1-100"}
              {pageNum === 2 && "101-200"}
              {pageNum === 3 && "201-300"}
              {pageNum === 4 && "301-400"}
            </Button>
          ))}
        </div>
      </div>

      {/* Deposit reminder if balance is low */}
      {user?.balance !== undefined && user.balance < stake && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm font-medium text-yellow-800">💰 Need Funds to Play</p>
          <p className="text-xs text-yellow-700 mt-1">
            You need at least ${stake} to select a card. Current balance: ${user.balance}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Go to the <span className="font-medium">Wallet</span> tab to deposit funds.
          </p>
        </div>
      )}
    </div>
  )
}