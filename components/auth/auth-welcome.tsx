"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { isOpenedFromTelegramBot } from "@/lib/telegram/telegram-webapp"
import { Gamepad2, Bot, UserPlus, LogIn } from "lucide-react"

interface AuthWelcomeProps {
  onRegister: () => void
  onLogin: () => void
  onBot: () => void
  onTelegramRetry: () => void
}

export function AuthWelcome({
  onRegister,
  onLogin,
  onBot,
  onTelegramRetry
}: AuthWelcomeProps) {
  const fromTelegram = typeof window !== 'undefined' && isOpenedFromTelegramBot()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Gamepad2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Habesha Bingo</CardTitle>
          <CardDescription>
            {fromTelegram ? "Telegram Gaming Platform" : "Ethiopian Bingo Gaming Platform"}
          </CardDescription>
          {fromTelegram && (
            <Badge variant="secondary" className="mx-auto">
              <Bot className="mr-1 h-3 w-3" />
              Telegram WebApp
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {fromTelegram ? (
            <>
              <Button 
                onClick={onTelegramRetry} 
                className="w-full" 
                size="lg"
              >
                <Bot className="mr-2 h-5 w-5" />
                Continue with Telegram
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
            </>
          ) : null}
          
          <Button onClick={onRegister} className="w-full" size="lg">
            <UserPlus className="mr-2 h-5 w-5" />
            Create Account
          </Button>
          <Button onClick={onLogin} variant="outline" className="w-full bg-transparent" size="lg">
            <LogIn className="mr-2 h-5 w-5" />
            Login
          </Button>
          
          {!fromTelegram && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Button onClick={onBot} variant="secondary" className="w-full" size="lg">
                <Bot className="mr-2 h-5 w-5" />
                Register via Bot
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}