"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/game-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Users, 
  Check, 
  Copy, 
  Trophy, 
  Gift, 
  Calendar,
  TrendingUp,
  Award,
  Share2,
  Edit3,
  ChevronRight,
  Star
} from "lucide-react"
import { cn } from "@/lib/utils"

export function ProfileView() {
  const { user, getReferralLink, gameHistory } = useGameStore()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const referralLink = getReferralLink()
  const userWins = gameHistory.filter((g: any) => g.odoo === user?.id && g.result === "win")
  const totalWon = userWins.reduce((sum: number, g: any) => sum + g.amount, 0)
  
  // Calculate win rate
  const totalGames = gameHistory.filter((g: any) => g.odoo === user?.id).length
  const winRate = totalGames > 0 ? Math.round((userWins.length / totalGames) * 100) : 0

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      {/* Cover Image with Gradient */}
      <div className="relative h-32 rounded-t-xl bg-gradient-to-r from-primary/20 to-primary/5 -mb-12" />
      
      {/* Profile Header Card - Enhanced */}
      <Card className="relative overflow-hidden border-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-8 -mt-8" />
        
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar with Edit Option */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ring-4 ring-background shadow-xl">
                <User className="h-12 w-12 text-white" />
              </div>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div>
                  <h2 className="text-2xl font-bold truncate">{user?.firstName}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>@{user?.username}</span>
                    <span>•</span>
                    <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="capitalize">
                      {user?.role === "admin" ? <Star className="h-3 w-3 mr-1" /> : null}
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-primary">{totalGames}</div>
                    <div className="text-xs text-muted-foreground">Games</div>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="text-center">
                    <div className="font-bold text-green-600">{winRate}%</div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Wins</p>
                    <p className="text-2xl font-bold">{userWins.length}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Birr Won</p>
                    <p className="text-2xl font-bold">{totalWon.toLocaleString()}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Bonus Birr</p>
                    <p className="text-2xl font-bold">{user?.bonusBalance.toFixed(0)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Gift className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Preview */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setActiveTab("stats")}>
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {gameHistory.slice(0, 3).map((game: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Game #{game.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={game.result === "win" ? "default" : "destructive"}>
                    {game.result === "win" ? `+${game.amount}` : `-${game.amount}`}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Win Rate</span>
                  <span className="font-bold">{winRate}%</span>
                </div>
                <Progress value={winRate} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Total Games</p>
                  <p className="text-xl font-bold">{totalGames}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Win Streak</p>
                  <p className="text-xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4 mt-4">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Refer & Earn
              </CardTitle>
              <CardDescription className="text-base">
                Share your referral link and earn <span className="font-bold text-primary">10 Birr</span> for each friend who joins!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Referral Code Card */}
              <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Your Referral Code
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 font-mono font-bold text-lg bg-background px-3 py-2 rounded-lg border">
                    {user?.referralCode}
                  </code>
                  <Button 
                    onClick={copyReferralLink} 
                    variant="outline" 
                    className={cn(
                      "gap-2 transition-all",
                      copied && "bg-green-500/10 border-green-500 text-green-600"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="w-full gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.971 1.172-4.971s-.299-.599-.299-1.484c0-1.391.806-2.428 1.809-2.428.852 0 1.264.639 1.264 1.407 0 .857-.546 2.139-.828 3.328-.236.995.5 1.807 1.48 1.807 1.777 0 3.143-1.874 3.143-4.579 0-2.394-1.72-4.068-4.177-4.068-2.845 0-4.515 2.134-4.515 4.34 0 .858.33 1.779.744 2.281.083.1.095.188.07.29-.076.316-.245.994-.28 1.133-.043.183-.143.222-.334.134-1.249-.582-2.03-2.408-2.03-3.874 0-3.154 2.292-6.052 6.609-6.052 3.469 0 6.165 2.472 6.165 5.777 0 3.447-2.173 6.222-5.19 6.222-1.013 0-1.966-.527-2.291-1.148 0 0-.502 1.909-.623 2.378-.226.868-.835 1.956-1.242 2.62.936.29 1.931.446 2.956.446 5.522 0 10-4.478 10-10S17.523 2 12 2z"/>
                  </svg>
                  Tweet
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z"/>
                  </svg>
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Info - Always Visible at Bottom */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Telegram ID</p>
              <p className="font-mono bg-muted px-2 py-1 rounded text-xs truncate">
                {user?.telegramId}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}