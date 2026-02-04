// SERVER-SIDE ONLY - Do not import in client components
import 'server-only'
import { bot } from './bot'
import { db } from '@/lib/mysql-db'

// MySQL database functions for the bot
export async function registerUser(telegramId: string, username: string, firstName: string) {
  try {
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[]
    
    if (existingUser.length > 0) {
      return { success: false, message: 'User already registered' }
    }
    
    let referralCode = ''
    let isUnique = false
    
    while (!isUnique) {
      referralCode = `HAB${telegramId.slice(-6)}${Date.now().toString(36).toUpperCase()}`
      const [checkCode] = await db.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      ) as any[]
      isUnique = checkCode.length === 0
    }
    
    await db.query(
      `INSERT INTO users 
      (telegram_id, username, first_name, referral_code, is_online, last_active, balance, bonus_balance)
      VALUES (?, ?, ?, ?, TRUE, NOW(), 50, 10)`,
      [telegramId, username, firstName, referralCode]
    )
    
    return { success: true, referralCode }
  } catch (error) {
    console.error('Register user error:', error)
    return { success: false, message: 'Registration failed' }
  }
}

export async function getUserBalance(telegramId: string) {
  try {
    const [userData] = await db.query(
      'SELECT balance, bonus_balance FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[]
    
    if (userData.length === 0) {
      return null
    }
    
    return {
      balance: userData[0].balance,
      bonusBalance: userData[0].bonus_balance,
    }
  } catch (error) {
    console.error('Get user balance error:', error)
    return null
  }
}

export async function createDepositRequest(userId: string, amount: number, screenshotUrl: string) {
  try {
    await db.query(
      `INSERT INTO deposits 
      (user_id, amount, method, screenshot_url, status)
      VALUES (?, ?, 'telebirr', ?, 'pending')`,
      [userId, amount, screenshotUrl]
    )
    
    return { success: true }
  } catch (error) {
    console.error('Create deposit error:', error)
    return { success: false }
  }
}

// Bot setup for server
export async function setupBotCommands() {
  const commands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'register', description: 'Register user via Telegram' },
    { command: 'play', description: 'Open Telegram Mini App' },
    { command: 'deposit', description: 'Send money & upload screenshot' },
    { command: 'balance', description: 'View wallet balance' },
    { command: 'withdraw', description: 'Request withdrawal' },
    { command: 'invite', description: 'Get referral link' },
    { command: 'instructions', description: 'How to play guide' },
    { command: 'support', description: 'Contact support' },
    { command: 'about', description: 'About Habesha Bingo' },
  ]
  
  await bot.telegram.setMyCommands(commands)
  console.log('✅ Bot commands set')
}