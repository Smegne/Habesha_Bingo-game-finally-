"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"

interface AuthBotProps {
  onBack: () => void
}

export function AuthBot({ onBack }: AuthBotProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Register via Telegram Bot</CardTitle>
          <CardDescription>Use our official bot to register</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Open Telegram and search for our bot:
            </p>
            <code className="block bg-background px-4 py-2 rounded text-primary font-mono">
              @HabeshaBingoBot
            </code>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Bot Commands:</p>
            <ul className="space-y-1">
              <li><code className="bg-muted px-1 rounded">/start</code> - Start registration</li>
              <li><code className="bg-muted px-1 rounded">/register</code> - Create account</li>
              <li><code className="bg-muted px-1 rounded">/play</code> - Open Mini App</li>
              <li><code className="bg-muted px-1 rounded">/balance</code> - Check balance</li>
              <li><code className="bg-muted px-1 rounded">/deposit</code> - Request deposit</li>
            </ul>
          </div>
          <Button 
            onClick={() => window.open("https://t.me/HabeshaBingoBot", "_blank")}
            className="w-full"
          >
            Open Telegram Bot
          </Button>
          <Button onClick={onBack} variant="ghost" className="w-full">
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}