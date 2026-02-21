// Server-side only Telegram bot
import 'server-only'
import { Telegraf, Markup, Context } from 'telegraf'
import { message } from 'telegraf/filters'
// Remove the direct ngrok import
// import ngrok from '@ngrok/ngrok'

// Import your existing database connection
import { db } from '@/lib/mysql-db'

// We'll use dynamic import for ngrok
let ngrok: any = null;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const NGROK_AUTH_TOKEN = process.env.NGROK_AUTH_TOKEN

let ngrokUrl: string | null = null
let botWebhookUrl: string | null = null
export const bot = new Telegraf(BOT_TOKEN)

// Set bot commands
const commands = [
  { command: 'start', description: 'Start' },
  { command: 'register', description: 'Register' },
  { command: 'play', description: 'Play' },
  { command: 'deposit', description: 'Deposit' },
  { command: 'balance', description: 'Balance' },
  { command: 'withdraw', description: 'Withdrawal' },
  { command: 'invite', description: 'Referral' },
  { command: 'instructions', description: 'Instructions' },
  { command: 'support', description: 'Support' },
  { command: 'about', description: 'About' },
]

// Initialize commands
bot.telegram.setMyCommands(commands)

// Ngrok functions - Only used in development
export async function startNgrokTunnel(port: number = 3000): Promise<string> {
  // Skip ngrok in production
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Ngrok tunnel skipped in production mode')
    return process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'
  }

  if (!NGROK_AUTH_TOKEN) {
    throw new Error('NGROK_AUTH_TOKEN is required for development tunneling')
  }

  try {
    // Dynamically import ngrok only in development
    if (!ngrok) {
      ngrok = await import('@ngrok/ngrok')
    }

    // Check for existing tunnels
    try {
      const tunnels = await ngrok.tunnels()
      if (tunnels.length > 0) {
        ngrokUrl = tunnels[0].public_url
        console.log(`✅ Using existing Ngrok tunnel: ${ngrokUrl}`)
        return ngrokUrl
      }
    } catch (e) {
      console.log('No existing tunnels found, creating new one...')
    }

    // Create new tunnel
    const listener = await ngrok.connect({
      addr: port,
      authtoken: NGROK_AUTH_TOKEN,
    })
    
    ngrokUrl = listener.url()
    console.log(`✅ Ngrok tunnel started: ${ngrokUrl}`)
    
    // Set webhook
    botWebhookUrl = `${ngrokUrl}/api/webhook`
    await bot.telegram.setWebhook(botWebhookUrl)
    console.log(`✅ Webhook set to: ${botWebhookUrl}`)
    
    return ngrokUrl
  } catch (error) {
    console.error('❌ Ngrok tunnel failed:', error)
    // Return webhook URL from env if ngrok fails
    return process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'
  }
}

export async function stopNgrokTunnel(): Promise<void> {
  // Only try to stop ngrok in development
  if (process.env.NODE_ENV === 'development' && ngrok) {
    try {
      await ngrok.disconnect()
      console.log('✅ Ngrok tunnel stopped')
    } catch (error) {
      console.error('Failed to stop ngrok tunnel:', error)
    }
  }
  ngrokUrl = null
  botWebhookUrl = null
}

export function getNgrokUrl(): string | null {
  return ngrokUrl
}

export function getBotWebhookUrl(): string | null {
  return botWebhookUrl
}

// Start command
bot.start(async (ctx) => {
  const user = ctx.from
  const referralCode = ctx.payload // Get referral code from start parameter
  
  await ctx.reply(
    `🎉 Welcome to Habesha Bingo, ${user.first_name}!\n\n` +
    `🎮 Play exciting bingo games\n` +
    `💰 Win real money prizes\n` +
    `🎁 Get 50 Birr welcome bonus!\n\n` +
    `Use /register to create your account${referralCode ? `\n\n🔑 Referral code detected: ${referralCode}` : ''}`,
    // Markup.keyboard([
    //   ['📋 Register', '🎮 Play'],
    //   ['💰 Deposit', '🏧 Withdraw'],
    //   ['👥 Invite', '📞 Support']
    // ]).resize()
  )
})

// Register command
bot.command('register', async (ctx) => {
  const user = ctx.from
  
  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[]
    
    if (existingUser && existingUser.length > 0) {
      await ctx.reply('✅ You are already registered! Use /play to start gaming.')
      return
    }
    
    // Generate unique referral code
    let referralCode = ''
    let isUnique = false
    
    while (!isUnique) {
      referralCode = `HAB${user.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`
      const checkCode = await db.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      ) as any[]
      isUnique = !checkCode || checkCode.length === 0
    }
    
    // Insert user into database
    await db.query(
      `INSERT INTO users 
      (telegram_id, username, first_name, referral_code, is_online, last_active, balance, bonus_balance, role)
      VALUES (?, ?, ?, ?, TRUE, NOW(), 50, 10, 'user')`,
      [user.id.toString(), user.username || `user_${user.id}`, user.first_name, referralCode]
    )
    
    // Success message
    await ctx.reply(
      `✅ Registration Successful!\n\n` +
      `🎉 Welcome ${user.first_name} to Habesha Bingo!\n\n` +
      `💰 You received 50 Birr welcome bonus!\n` +
      `🎁 Plus 10 Birr bonus balance!\n\n` +
      `🔑 Your Referral Code: ${referralCode}\n` +
      `Share it to earn 10 Birr per friend!\n\n` +
      `📱 Share: https://t.me/${ctx.botInfo.username}?start=${referralCode}\n\n` +
      `🎮 Use /play to start gaming!`,
      Markup.inlineKeyboard([
        Markup.button.url('📱 Share on Telegram', 
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${ctx.botInfo.username}?start=${referralCode}`)}&text=${encodeURIComponent('Join Habesha Bingo and win real money! Use my referral code: ' + referralCode)}`),
        Markup.button.webApp('🎮 Play Now', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/')
      ])
    )
    
  } catch (error) {
    console.error('Registration error:', error)
    await ctx.reply('❌ Registration failed. Please try again or contact support.')
  }
})

// Play command - Opens Mini App
bot.command('play', async (ctx) => {
  const user = ctx.from;
  const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/';
  
  // Create Mini App URL
  const miniAppUrl = `${webAppUrl}?tgWebAppStartParam=play`;
  
  await ctx.reply(
    '🎮 Opening Habesha Bingo Mini App...\n\n' +
    'Get ready to play and win! 🏆',
    Markup.inlineKeyboard([
      Markup.button.webApp('🎮 Play Habesha Bingo', miniAppUrl)
    ])
  );
});

// Deposit command
bot.command('deposit', async (ctx) => {
  await ctx.reply(
    '💵 Deposit Funds\n\n' +
    'Send money to:\n\n' +
    '📱 TeleBirr:\n' +
    '• 0962935163 (Melsew Abebei)\n' +
    '• 0940192676 (Habesha Bingo)\n\n' +
    '🏦 CBE Birr:\n' +
    '• Account: 1000433547741\n' +
    '• Name: Simegnew Destaw\n\n' +
    '📌 Instructions:\n' +
    '1. Send money to any number above\n' +
    '2. Take screenshot of payment\n' +
    '3. Send the screenshot here\n\n' +
    '⚠️ Minimum deposit: 10 Birr\n' +
    '⏱️ Approval: Within 1-24 hours',
    Markup.inlineKeyboard([
      Markup.button.callback('📸 Submit Screenshot', 'submit_deposit'),
      Markup.button.webApp('💰 Quick Deposit', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com')
    ])
  )
})

// Balance command
bot.command('balance', async (ctx) => {
  try {
    // Get user balance from database
    const users = await db.query(
      'SELECT balance, bonus_balance FROM users WHERE telegram_id = ?',
      [ctx.from.id.toString()]
    ) as any[]
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered. Use /register first.')
      return
    }
    
    const user = users[0]
    
    await ctx.reply(
      `💰 Your Wallet\n\n` +
      `💳 Main Balance: ${user.balance} Birr\n` +
      `🎁 Bonus Balance: ${user.bonus_balance} Birr\n` +
      `🎯 Total Balance: ${user.balance + user.bonus_balance} Birr\n\n` +
      `💸 Use /deposit to add funds\n` +
      `🏧 Use /withdraw to cash out`,
      Markup.inlineKeyboard([
        Markup.button.webApp('💸 Quick Deposit', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'),
        Markup.button.webApp('🏧 Quick Withdraw', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com')
      ])
    )
  } catch (error) {
    console.error('Balance error:', error)
    await ctx.reply('❌ Error fetching balance. Please try again.')
  }
})

// Withdraw command
bot.command('withdraw', async (ctx) => {
  await ctx.reply(
    '🏧 Withdraw Funds\n\n' +
    '💰 Available Balance: Check /balance\n' +
    '📝 Minimum Withdrawal: 10 Birr\n' +
    '⏱️ Processing Time: 1-24 hours\n\n' +
    'Please send:\n' +
    '1. Amount (Birr)\n' +
    '2. Account number\n\n' +
    'Example:\n' +
    '`50\n0911-123-4567`\n\n' +
    'Send in this format:',
    Markup.forceReply()
  )
})

// Invite command
bot.command('invite', async (ctx) => {
  try {
    // Get user's referral code from database
    const users = await db.query(
      'SELECT referral_code FROM users WHERE telegram_id = ?',
      [ctx.from.id.toString()]
    ) as any[]
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered. Use /register first.')
      return
    }
    
    const referralCode = users[0].referral_code
    const referralLink = `https://t.me/${ctx.botInfo.username}?start=${referralCode}`
    
    await ctx.reply(
      `👥 Refer & Earn\n\n` +
      `🎁 Earn 10 Birr for each friend who joins!\n\n` +
      `🔑 Your Referral Code: ${referralCode}\n\n` +
      `📱 Share this link:\n` +
      referralLink,
      Markup.inlineKeyboard([
        Markup.button.url('📱 Share on Telegram', 
          `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Habesha Bingo and win real money! Use my referral code: ' + referralCode)}`),
        Markup.button.callback('📊 My Referrals', 'view_referrals')
      ])
    )
  } catch (error) {
    console.error('Invite error:', error)
    await ctx.reply('❌ Error fetching referral info. Please try again.')
  }
})

// Callback handlers
bot.action('submit_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply('📸 Please send the payment screenshot')
})

bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery()
  try {
    // Get referral count from database
    const result = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE referred_by = (SELECT id FROM users WHERE telegram_id = ?)',
      [ctx.from.id.toString()]
    ) as any[]
    
    const referralCount = result && result[0]?.count || 0
    
    await ctx.reply(
      `📊 Referral Statistics:\n\n` +
      `👥 Total Referrals: ${referralCount}\n` +
      `💰 Total Earned: ${referralCount * 10} Birr\n` +
      `🏆 Keep referring to earn more!`
    )
  } catch (error) {
    console.error('Referral stats error:', error)
    await ctx.reply('❌ Error fetching referral statistics.')
  }
})

// Handle photo for deposit
bot.on('photo', async (ctx) => {
  await ctx.reply(
    '📸 Screenshot received!\n\n' +
    'Now please send the deposit amount (Birr):\n' +
    'Example: 100',
    Markup.forceReply()
  )
})

// Handle text responses
bot.on('text', async (ctx) => {
  const text = ctx.message.text
  
  // Handle deposit amount
  if (ctx.message.reply_to_message?.text?.includes('deposit amount')) {
    const amount = parseFloat(text)
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply('❌ Invalid amount. Minimum deposit is 10 Birr.')
      return
    }
    
    // Create deposit record in database
    try {
      await db.query(
        'INSERT INTO deposits (telegram_id, amount, status, created_at) VALUES (?, ?, "pending", NOW())',
        [ctx.from.id.toString(), amount]
      )
      
      await ctx.reply(
        `✅ Deposit Request Submitted!\n\n` +
        `💰 Amount: ${amount} Birr\n` +
        `⏱️ Status: Pending approval\n\n` +
        `Admin will review within 1-24 hours.`
      )
    } catch (error) {
      console.error('Deposit error:', error)
      await ctx.reply('❌ Failed to process deposit. Please try again.')
    }
  }
  
  // Handle withdrawal details
  if (ctx.message.reply_to_message?.text?.includes('Withdraw Funds')) {
    const lines = text.split('\n')
    
    if (lines.length < 2) {
      await ctx.reply('❌ Invalid format. Please send:\nAmount\\nAccountNumber')
      return
    }
    
    const amount = parseFloat(lines[0])
    const accountNumber = lines[1].trim()
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply('❌ Invalid amount. Minimum 10 Birr.')
      return
    }
    
    // Check if user has sufficient balance
    try {
      const users = await db.query(
        'SELECT balance FROM users WHERE telegram_id = ?',
        [ctx.from.id.toString()]
      ) as any[]
      
      if (!users || users.length === 0) {
        await ctx.reply('❌ You are not registered. Use /register first.')
        return
      }
      
      if (users[0].balance < amount) {
        await ctx.reply('❌ Insufficient balance. Please check /balance')
        return
      }
      
      // Create withdrawal record in database
      await db.query(
        'INSERT INTO withdrawals (telegram_id, amount, account_number, status, created_at) VALUES (?, ?, ?, "pending", NOW())',
        [ctx.from.id.toString(), amount, accountNumber]
      )
      
      await ctx.reply(
        `✅ Withdrawal Request Submitted!\n\n` +
        `💰 Amount: ${amount} Birr\n` +
        `📱 Account: ${accountNumber}\n` +
        `⏱️ Status: Pending approval\n\n` +
        `You'll be notified once approved.`
      )
    } catch (error) {
      console.error('Withdrawal error:', error)
      await ctx.reply('❌ Failed to process withdrawal. Please try again.')
    }
  }
})

// Error handling
bot.catch((err: any, ctx: Context) => {
  console.error(`Error for ${ctx.updateType}:`, err)
  ctx.reply('❌ An error occurred. Please try again.')
})

// Start bot
export async function startBot() {
  try {
    console.log('🤖 Starting Habesha Bingo Bot...')
    
    // Only try ngrok in development
    if (process.env.NODE_ENV === 'development') {
      const tunnelUrl = await startNgrokTunnel(3000)
      console.log(`✅ Ngrok URL: ${tunnelUrl}`)
    } else {
      // In production, use the production webhook URL
      const webhookUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'}/api/webhook`
      await bot.telegram.setWebhook(webhookUrl)
      console.log(`✅ Production webhook set to: ${webhookUrl}`)
    }
    
    // Launch bot
    await bot.launch()
    console.log('✅ Bot is running!')
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
    
    return bot
  } catch (error) {
    console.error('❌ Failed to start bot:', error)
    throw error
  }
}

export async function stopBot() {
  await bot.stop()
  if (process.env.NODE_ENV === 'development') {
    await stopNgrokTunnel()
  }
  console.log('✅ Bot stopped')
}

// Export bot for server-side use
export { bot }