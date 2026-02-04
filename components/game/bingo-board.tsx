"use client"

interface BingoBoardProps {
  calledNumbers: number[]
}

export function BingoBoard({ calledNumbers }: BingoBoardProps) {
  const headers = ["B", "I", "N", "G", "O"]
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ]

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1">
        {headers.map((h, idx) => (
          <div key={h} className="text-center">
            <div className="font-bold text-primary mb-1">{h}</div>
            <div className="space-y-1">
              {Array.from({ length: 15 }, (_, i) => {
                const num = ranges[idx][0] + i
                const isCalled = calledNumbers.includes(num)
                return (
                  <div
                    key={num}
                    className={`text-xs py-1 rounded ${
                      isCalled ? "bg-secondary text-secondary-foreground font-bold" : "bg-muted/50"
                    }`}
                  >
                    {num}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}