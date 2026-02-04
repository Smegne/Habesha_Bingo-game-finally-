"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, RefreshCw, UserPlus, LogIn } from "lucide-react"

interface AuthTelegramProps {
  isRetryingTelegram: boolean
  error: string
  onTelegramRetry: () => void
  onRegister: () => void
  onLogin: () => void
}

export function AuthTelegram({
  isRetryingTelegram,
  error,
  onTelegramRetry,
  onRegister,
  onLogin
}: AuthTelegramProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Telegram Authentication</CardTitle>
          <CardDescription>
            {isRetryingTelegram ? "Retrying authentication..." : "We need to verify your Telegram account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm">
                You opened this app from Telegram, but we couldn't verify your account automatically.
              </p>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">Possible reasons:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5"></span>
                  <span>You haven't registered with the Telegram bot yet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5"></span>
                  <span>Telegram authentication data is incomplete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5"></span>
                  <span>Network connection issue</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={onTelegramRetry} 
              className="w-full"
              disabled={isRetryingTelegram}
            >
              {isRetryingTelegram ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Telegram Authentication
                </>
              )}
            </Button>
            
            <Button 
              onClick={onRegister} 
              variant="outline" 
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Register Manually
            </Button>
            
            <Button 
              onClick={onLogin} 
              variant="ghost" 
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login with Username
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}