"use client"

interface BingoBoardCompactProps {
  calledNumbers: number[]
}

export function BingoBoardCompact({ calledNumbers }: BingoBoardCompactProps) {
  const headers = ["B", "I", "N", "G", "O"]
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ]

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-5 gap-0.5">
        {headers.map((h) => (
          <div
            key={h}
            className="h-5 sm:h-6 flex items-center justify-center font-bold text-[10px] sm:text-xs bg-primary text-primary-foreground rounded"
          >
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-0.5">
        {headers.map((_, colIdx) => (
          <div key={colIdx} className="space-y-0.5">
            {Array.from({ length: 15 }, (_, rowIdx) => {
              const num = ranges[colIdx][0] + rowIdx
              const isCalled = calledNumbers.includes(num)
              return (
                <div
                  key={num}
                  className={`h-4 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] rounded ${
                    isCalled
                      ? "bg-secondary text-secondary-foreground font-bold"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {num}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}