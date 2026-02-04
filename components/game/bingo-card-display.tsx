"use client"

import { Badge } from "@/components/ui/badge"

interface BingoCardDisplayProps {
  card: { id: number; numbers: number[][] }
  small?: boolean
  marked?: Set<number>
  onMark?: (num: number) => void
}

export function BingoCardDisplay({ card, small, marked, onMark }: BingoCardDisplayProps) {
  const headers = ["B", "I", "N", "G", "O"]

  return (
    <div className="inline-block w-full max-w-[180px] sm:max-w-none">
      <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
        {headers.map((h) => (
          <div
            key={h}
            className={`h-6 w-full sm:h-8 flex items-center justify-center font-bold bg-primary text-primary-foreground rounded text-[10px] sm:text-xs`}
          >
            {h}
          </div>
        ))}
        {card.numbers.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const isMarked = marked?.has(num)
            const isFree = num === 0
            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => onMark?.(num)}
                disabled={!onMark || isFree}
                className={`h-6 w-full sm:h-8 flex items-center justify-center rounded text-[10px] sm:text-xs font-medium transition-colors ${
                  isMarked || isFree
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-card border border-border hover:bg-muted"
                }`}
              >
                {isFree ? "F" : num}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}