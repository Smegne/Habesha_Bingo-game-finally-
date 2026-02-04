"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/game-store"
import { isOpenedFromTelegramBot } from "@/lib/telegram/telegram-webapp"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Bot, User, Shield, Mail, Lock, Eye, EyeOff } from "lucide-react"

interface SignupFormProps {
  error: string
  success: string
  onRegisterSuccess: (result: { success: boolean; message: string; role?: string }) => void
  onTelegramRetry: () => void
  onSwitchToLogin: () => void
  onBack: () => void
}

export function SignupForm({
  error,
  success,
  onRegisterSuccess,
  onTelegramRetry,
  onSwitchToLogin,
  onBack
}: SignupFormProps) {
  const { register } = useGameStore()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<"user" | "admin">("user")
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    setIsLoading(true)
    
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      onRegisterSuccess({ 
        success: false, 
        message: "Please fill in all required fields" 
      })
      setIsLoading(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      onRegisterSuccess({ 
        success: false, 
        message: "Please enter a valid email address" 
      })
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      onRegisterSuccess({ 
        success: false, 
        message: "Passwords do not match" 
      })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      onRegisterSuccess({ 
        success: false, 
        message: "Password must be at least 6 characters" 
      })
      setIsLoading(false)
      return
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      onRegisterSuccess({ 
        success: false, 
        message: "Password must contain uppercase, lowercase letters and numbers" 
      })
      setIsLoading(false)
      return
    }

    // Generate a telegramId from email for web registration
    const telegramId = `user_${btoa(email).slice(0, 10)}_${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '')
    
    // Extract first name from full name
    const firstName = fullName.split(' ')[0] || fullName

    // For demo, generate username from email (remove @domain part)
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')

    console.log('Registration data:', {
      telegramId,
      username,
      firstName,
      email,
      password: '***', // Don't log actual password
      role
    })

    // Call register with all required parameters
    const result = await register(
      telegramId,
      username,
      firstName,
      password,
      role,
      undefined, // referralCode (optional)
      email       // email
    )
    
    onRegisterSuccess(result)
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>Join Habesha Bingo and start winning!</CardDescription>
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

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name *
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              className="pl-10"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="pl-10"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password *
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10"
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
            <div className="text-xs text-muted-foreground">
              Password must contain:
              <ul className="ml-4 mt-1 space-y-0.5">
                <li className={`flex items-center gap-1 ${password.length >= 6 ? 'text-green-600' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                  At least 6 characters
                </li>
                <li className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                  One uppercase letter
                </li>
                <li className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                  One lowercase letter
                </li>
                <li className={`flex items-center gap-1 ${/\d/.test(password) ? 'text-green-600' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                  One number
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={role === "user" ? "default" : "outline"}
                className={role === "user" ? "" : "bg-transparent"}
                onClick={() => setRole("user")}
                disabled={isLoading}
              >
                <User className="mr-2 h-4 w-4" />
                Player
              </Button>
              <Button
                type="button"
                variant={role === "admin" ? "default" : "outline"}
                className={role === "admin" ? "" : "bg-transparent"}
                onClick={() => setRole("admin")}
                disabled={isLoading}
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </div>
            {role === "admin" && (
              <p className="text-xs text-muted-foreground">
                Admin accounts have access to game management and user administration.
              </p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                required
                disabled={isLoading}
              />
              <Label htmlFor="terms" className="text-sm font-normal">
                I agree to the{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => window.open('/terms', '_blank')}
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => window.open('/privacy', '_blank')}
                >
                  Privacy Policy
                </button>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="age"
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                required
                disabled={isLoading}
              />
              <Label htmlFor="age" className="text-sm font-normal">
                I confirm that I am 18 years or older
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleRegister} 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Create {role === "admin" ? "Admin" : ""} Account
              </>
            )}
          </Button>

          {/* Bonus Info */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">🎁 Welcome Bonus!</p>
                <p className="text-xs text-muted-foreground">Get 50 Birr bonus on registration</p>
              </div>
              <Badge variant="secondary" className="font-bold">
                50 BIRR
              </Badge>
            </div>
          </div>

          {/* Switch to Login */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <button 
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
              disabled={isLoading}
            >
              Login here
            </button>
          </div>

          {/* Telegram Auth Option (if from Telegram) */}
          {typeof window !== 'undefined' && isOpenedFromTelegramBot() && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Button 
                onClick={onTelegramRetry} 
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                <Bot className="mr-2 h-4 w-4" />
                Register with Telegram
              </Button>
            </>
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