"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/game-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Users, Check, Copy } from "lucide-react"

export function ProfileView() {
  const { user, getReferralLink, gameHistory } = useGameStore()
  const [copied, setCopied] = useState(false)

  const referralLink = getReferralLink()
  const userWins = gameHistory.filter((g: any) => g.odoo === user?.id && g.result === "win")
  const totalWon = userWins.reduce((sum: number, g: any) => sum + g.amount, 0)

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle>{user?.firstName}</CardTitle>
              <CardDescription>@{user?.username}</CardDescription>
              <Badge variant="secondary" className="mt-1">
                {user?.role === "admin" ? "Admin" : "Player"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{userWins.length}</div>
              <div className="text-xs text-muted-foreground">Total Wins</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalWon}</div>
              <div className="text-xs text-muted-foreground">Birr Won</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{user?.bonusBalance.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Bonus Birr</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Refer & Earn
          </CardTitle>
          <CardDescription>
            Share your referral link and earn 10 Birr for each friend who joins!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs">Your Referral Code</Label>
            <div className="font-mono font-bold text-primary">{user?.referralCode}</div>
          </div>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="text-xs" />
            <Button onClick={copyReferralLink} variant="outline" className="bg-transparent shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Telegram ID</span>
            <span className="font-mono">{user?.telegramId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member Since</span>
            <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Type</span>
            <Badge variant="outline">{user?.role}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}