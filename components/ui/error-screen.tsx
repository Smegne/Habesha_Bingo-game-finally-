import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorScreenProps {
  message?: string
  onRetry?: () => void
  showTelegramHelp?: boolean
}

export function ErrorScreen({ 
  message = "An error occurred",
  onRetry,
  showTelegramHelp = false 
}: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="h-16 w-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Oops!</h3>
          <p className="text-muted-foreground">{message}</p>
          {showTelegramHelp && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Make sure you're opening this from the Telegram bot using the <code>/play</code> command.
              </p>
            </div>
          )}
        </div>
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
        <div className="pt-4">
          <p className="text-xs text-muted-foreground">
            Need help? Contact @HabeshaBingoSupport on Telegram
          </p>
        </div>
      </div>
    </div>
  )
}