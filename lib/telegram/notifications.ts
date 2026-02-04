import { bot } from './bot'
import { db } from '@/lib/mysql-db'

export async function notifyAdmins(message: string, options: any = {}) {
  try {
    const [admins] = await db.query(
      'SELECT telegram_id FROM users WHERE role = "admin"',
      []
    ) as any[]
    
    for (const admin of admins) {
      try {
        await bot.telegram.sendMessage(admin.telegram_id, message, options)
      } catch (error) {
        console.error(`Failed to notify admin ${admin.telegram_id}:`, error)
      }
    }
    
    return true
  } catch (error) {
    console.error('Notify admins error:', error)
    return false
  }
}

export async function notifyUser(telegramId: string, message: string, options: any = {}) {
  try {
    await bot.telegram.sendMessage(telegramId, message, options)
    return true
  } catch (error) {
    console.error(`Failed to notify user ${telegramId}:`, error)
    return false
  }
}

// Specific notification functions
export async function notifyDepositApproval(userTelegramId: string, amount: number) {
  const message = `✅ Deposit Approved!\n\n` +
    `💰 Amount: ${amount} Birr\n` +
    `💳 Added to your balance\n` +
    `🎮 Play now with /play`
  
  return notifyUser(userTelegramId, message)
}

export async function notifyWithdrawalApproval(userTelegramId: string, amount: number) {
  const message = `✅ Withdrawal Approved!\n\n` +
    `💰 Amount: ${amount} Birr\n` +
    `📱 Sent to your account\n` +
    `Thank you for playing! 🎮`
  
  return notifyUser(userTelegramId, message)
}

export async function notifyNewUser(userTelegramId: string, username: string) {
  const message = `🆕 New User Registered\n\n` +
    `👤 @${username}\n` +
    `🆔 ${userTelegramId}\n` +
    `⏰ ${new Date().toLocaleString()}`
  
  return notifyAdmins(message)
}

export async function notifyGameResult(userTelegramId: string, amount: number, pattern: string) {
  const message = `🎉 BINGO! You Won!\n\n` +
    `💰 Prize: ${amount} Birr\n` +
    `🎯 Pattern: ${pattern}\n` +
    `🎮 Keep playing to win more!`
  
  return notifyUser(userTelegramId, message)
}