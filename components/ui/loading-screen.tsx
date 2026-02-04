interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="relative">
          <div className="h-16 w-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-primary/20 rounded-full"></div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Habesha Bingo</h3>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            Powered by Telegram WebApp
          </p>
        </div>
      </div>
    </div>
  )
}