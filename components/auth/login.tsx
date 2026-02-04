"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/game-store"
import { isOpenedFromTelegramBot } from "@/lib/telegram/telegram-webapp"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Loader2, LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react"

interface LoginFormProps {
  error: string
  success: string
  onLoginSuccess: (result: { success: boolean; message: string; role?: string }) => void
  onTelegramRetry: () => void
  onSwitchToRegister: () => void
  onBack: () => void
}

export function LoginForm({
  error,
  success,
  onLoginSuccess,
  onTelegramRetry,
  onSwitchToRegister,
  onBack
}: LoginFormProps) {
  const { login } = useGameStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    
    if (!email || !password) {
      onLoginSuccess({ 
        success: false, 
        message: "Please enter email and password" 
      })
      setIsLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      onLoginSuccess({ 
        success: false, 
        message: "Please enter a valid email address" 
      })
      setIsLoading(false)
      return
    }

    console.log('Login attempt with email:', email)

    // For now, we need to extract username from email or use email as username
    // This depends on your backend login implementation
    const result = await login(email, password) // Using email as username for now
    
    onLoginSuccess(result)
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Login to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              {success}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="login-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="login-email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleLogin()}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="login-password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password *
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10"
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => {/* TODO: Implement forgot password */}}
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>

          {/* Login Button */}
          <Button 
            onClick={handleLogin} 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Login
              </>
            )}
          </Button>

          {/* Switch to Register */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{"Don't have an account? "}</span>
            <button 
              onClick={onSwitchToRegister}
              className="text-primary hover:underline font-medium"
              disabled={isLoading}
            >
              Register
            </button>
          </div>

          {/* Telegram Auth Option (if from Telegram) */}
          {typeof window !== 'undefined' && isOpenedFromTelegramBot() && (
            <Button 
              onClick={onTelegramRetry} 
              variant="outline" 
              className="w-full"
              disabled={isLoading}
            >
              <Bot className="mr-2 h-4 w-4" />
              Try Telegram Auth Again
            </Button>
          )}

          {/* Back Button */}
          <Button 
            onClick={onBack} 
            variant="ghost" 
            className="w-full"
            disabled={isLoading}
          >
            Back to Welcome
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}