"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/game-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react"

export function WalletView() {
  const {
    user,
    deposits,
    withdrawals,
    transactions,
    requestDeposit,
    requestWithdrawal,
    convertBonus,
  } = useGameStore()

  const [depositAmount, setDepositAmount] = useState("")
  const [depositMethod, setDepositMethod] = useState<"telebirr" | "cbe">("telebirr")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawMethod, setWithdrawMethod] = useState<"telebirr" | "cbe">("telebirr")
  const [accountNumber, setAccountNumber] = useState("")
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (amount >= 10) {
      setProcessing(true)
      const success = await requestDeposit(amount, depositMethod)
      setProcessing(false)

      if (success) {
        setDepositAmount("")
        setShowDepositDialog(false)
      }
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (amount >= 10 && accountNumber) {
      setProcessing(true)
      const success = await requestWithdrawal(amount, withdrawMethod, accountNumber)
      setProcessing(false)

      if (success) {
        setWithdrawAmount("")
        setAccountNumber("")
        setShowWithdrawDialog(false)
      }
    }
  }

  const userDeposits = deposits.filter((d: any) => d.odoo === user?.id)
  const userWithdrawals = withdrawals.filter((w: any) => w.odoo === user?.id)
  const userTransactions = transactions.filter((t: any) => t.odoo === user?.id)

  return (
    <div className="space-y-4 pb-24">

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary text-primary-foreground rounded-2xl shadow-md">
          <CardContent className="p-4">
            <div className="text-sm opacity-80">Main Balance</div>
            <div className="text-2xl font-bold">
              {(user?.balance ?? 0).toFixed(2)} Birr
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary rounded-2xl shadow-md">
          <CardContent className="p-4">
            <div className="text-sm text-secondary-foreground/80">
              Bonus Balance
            </div>
            <div className="text-2xl font-bold text-secondary-foreground">
              {(user?.bonusBalance ?? 0).toFixed(2)} Birr
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {/* Deposit */}
        <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
          <DialogTrigger asChild>
            <Button className="flex flex-col items-center justify-center h-20 rounded-xl shadow-sm">
              <ArrowDownLeft className="h-5 w-5 mb-1" />
              <span className="text-xs">Deposit</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Deposit</DialogTitle>
              <DialogDescription>
                Send money via TeleBirr or CBE Birr, then submit your request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (Birr)</Label>
                <Input
                  type="number"
                  min={10}
                  placeholder="Minimum 10 Birr"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={depositMethod}
                  onValueChange={(v) =>
                    setDepositMethod(v as "telebirr" | "cbe")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telebirr">TeleBirr</SelectItem>
                    <SelectItem value="cbe">CBE Birr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/60 rounded-xl border">
                <p className="text-sm font-medium">Send to:</p>
                <p className="text-xl font-bold tracking-wide">
                  0911-123-456
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Include your username in the message
                </p>
              </div>

              <Button
                onClick={handleDeposit}
                className="w-full"
                disabled={processing}
              >
                {processing ? "Processing..." : "Submit Deposit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdraw */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="flex flex-col items-center justify-center h-20 rounded-xl shadow-sm"
            >
              <ArrowUpRight className="h-5 w-5 mb-1" />
              <span className="text-xs">Withdraw</span>
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
              <DialogDescription>
                Withdraw your winnings to your mobile wallet
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (Birr)</Label>
                <Input
                  type="number"
                  min={10}
                  max={user?.balance}
                  placeholder="Minimum 10 Birr"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Withdrawal Method</Label>
                <Select
                  value={withdrawMethod}
                  onValueChange={(v) =>
                    setWithdrawMethod(v as "telebirr" | "cbe")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telebirr">TeleBirr</SelectItem>
                    <SelectItem value="cbe">CBE Birr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  placeholder="Enter your phone number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <Button
                onClick={handleWithdraw}
                className="w-full"
                disabled={processing}
              >
                {processing ? "Processing..." : "Submit Withdrawal Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Convert Bonus */}
        <Button
          variant="outline"
          className="flex flex-col items-center justify-center h-20 rounded-xl"
          onClick={convertBonus}
          disabled={!user?.bonusBalance || user.bonusBalance <= 0}
        >
          <RefreshCw className="h-5 w-5 mb-1" />
          <span className="text-xs">Convert</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">All</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              {userTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4 text-center">
                  No transactions yet
                </p>
              ) : (
                <div className="divide-y max-h-72 overflow-y-auto pr-1">
                  {userTransactions.slice().reverse().map((tx: any) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {tx.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <span
                        className={`font-semibold ${
                          tx.amount > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount} Birr
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposits */}
        <TabsContent value="deposits">
          <Card>
            <CardContent className="p-0">
              {userDeposits.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4 text-center">
                  No deposits yet
                </p>
              ) : (
                <div className="divide-y max-h-72 overflow-y-auto pr-1">
                  {userDeposits.slice().reverse().map((deposit: any) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {deposit.amount} Birr
                        </div>
                        <div className="text-xs text-muted-foreground">
                          via {deposit.method} —{" "}
                          {new Date(deposit.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <Badge
                        variant={
                          deposit.status === "approved"
                            ? "default"
                            : deposit.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {deposit.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals */}
        <TabsContent value="withdrawals">
          <Card>
            <CardContent className="p-0">
              {userWithdrawals.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4 text-center">
                  No withdrawals yet
                </p>
              ) : (
                <div className="divide-y max-h-72 overflow-y-auto pr-1">
                  {userWithdrawals.slice().reverse().map((withdrawal: any) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {withdrawal.amount} Birr
                        </div>
                        <div className="text-xs text-muted-foreground">
                          to {withdrawal.accountNumber} —{" "}
                          {new Date(withdrawal.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <Badge
                        variant={
                          withdrawal.status === "approved"
                            ? "default"
                            : withdrawal.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {withdrawal.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}