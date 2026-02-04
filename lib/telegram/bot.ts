// Server-side only Telegram bot
import 'server-only'
import { Telegraf, Markup, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import ngrok from '@ngrok/ngrok'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const NGROK_AUTH_TOKEN = process.env.NGROK_AUTH_TOKEN

let ngrokUrl: string | null = null
let botWebhookUrl: string | null = null
export const bot = new Telegraf(BOT_TOKEN)

// Set bot commands
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

// Initialize commands
bot.telegram.setMyCommands(commands)

// Ngrok functions
export async function startNgrokTunnel(port: number = 3000): Promise<string> {
  if (!NGROK_AUTH_TOKEN) {
    throw new Error('NGROK_AUTH_TOKEN is required')
  }

  try {
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
    throw error
  }
}

export async function stopNgrokTunnel(): Promise<void> {
  await ngrok.disconnect()
  ngrokUrl = null
  botWebhookUrl = null
  console.log('✅ Ngrok tunnel stopped')
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
  
  await ctx.reply(
    `🎉 Welcome to Habesha Bingo, ${user.first_name}!\n\n` +
    `🎮 Play exciting bingo games\n` +
    `💰 Win real money prizes\n` +
    `🎁 Get 50 Birr welcome bonus!\n\n` +
    `Use /register to create your account`,
    Markup.keyboard([
      ['📋 Register', '🎮 Play'],
      ['💰 Deposit', '🏧 Withdraw'],
      ['👥 Invite', '📞 Support']
    ]).resize()
  )
})

// Register command
// In the /register command section, replace with:
bot.command('register', async (ctx) => {
  const user = ctx.from
  
  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[]
    
    if (existingUser.length > 0) {
      await ctx.reply('✅ You are already registered! Use /play to start gaming.')
      return
    }
    
    // Generate unique referral code
    let referralCode = ''
    let isUnique = false
    
    while (!isUnique) {
      referralCode = `HAB${user.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`
      const [checkCode] = await db.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      ) as any[]
      isUnique = checkCode.length === 0
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
        Markup.button.webApp('🎮 Play Now', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev')
      ])
    )
    
  } catch (error) {
    console.error('Registration error:', error)
    await ctx.reply('❌ Registration failed. Please try again or contact support.')
  }
})

// 🔥 PLAY COMMAND - Opens Mini App
// In the /play command section, REPLACE with this:
bot.command('play', async (ctx) => {
  const user = ctx.from;
  const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev';
  
  // Get the user's Telegram data to pass to Mini App
  const initData = ctx.update.message?.from 
    ? `user=${JSON.stringify({
        id: ctx.update.message.from.id,
        first_name: ctx.update.message.from.first_name,
        username: ctx.update.message.from.username,
      })}`
    : '';
  
  // Create Mini App URL with Telegram start parameter
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
    '• 0911-111-1111 (Habesha Bingo)\n' +
    '• 0911-222-2222 (Habesha Bingo)\n\n' +
    '🏦 CBE Birr:\n' +
    '• Account: 1000-1234-5678\n' +
    '• Name: Habesha Bingo\n\n' +
    '📌 Instructions:\n' +
    '1. Send money to any number above\n' +
    '2. Take screenshot of payment\n' +
    '3. Send the screenshot here\n\n' +
    '⚠️ Minimum deposit: 10 Birr\n' +
    '⏱️ Approval: Within 1-24 hours',
    Markup.inlineKeyboard([
      Markup.button.callback('📸 Submit Screenshot', 'submit_deposit'),
      Markup.button.webApp('💰 Quick Deposit', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev')
    ])
  )
})

// Balance command
bot.command('balance', async (ctx) => {
  await ctx.reply(
    '💰 Your Wallet\n\n' +
    '💳 Main Balance: 50 Birr\n' +
    '🎁 Bonus Balance: 10 Birr\n' +
    '🎯 Total Balance: 60 Birr\n\n' +
    '💸 Use /deposit to add funds\n' +
    '🏧 Use /withdraw to cash out',
    Markup.inlineKeyboard([
      Markup.button.webApp('💸 Quick Deposit', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev'),
      Markup.button.webApp('🏧 Quick Withdraw', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev')
    ])
  )
})

// Withdraw command
bot.command('withdraw', async (ctx) => {
  await ctx.reply(
    '🏧 Withdraw Funds\n\n' +
    '💰 Available Balance: 50 Birr\n' +
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
  const referralCode = `HAB${ctx.from.id.toString().slice(-6)}REF`
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
})

// Callback handlers
bot.action('submit_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply('📸 Please send the payment screenshot')
})

bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply('📊 Referral Statistics:\n\n👥 Total Referrals: 0\n💰 Total Earned: 0 Birr')
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
    
    await ctx.reply(
      `✅ Deposit Request Submitted!\n\n` +
      `💰 Amount: ${amount} Birr\n` +
      `⏱️ Status: Pending approval\n\n` +
      `Admin will review within 1-24 hours.`
    )
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
    
    await ctx.reply(
      `✅ Withdrawal Request Submitted!\n\n` +
      `💰 Amount: ${amount} Birr\n` +
      `📱 Account: ${accountNumber}\n` +
      `⏱️ Status: Pending approval\n\n` +
      `You'll be notified once approved.`
    )
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
    
    // Start ngrok tunnel
    const tunnelUrl = await startNgrokTunnel(3000)
    console.log(`✅ Ngrok URL: ${tunnelUrl}`)
    
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
  await stopNgrokTunnel()
  console.log('✅ Bot stopped')
}

// Export bot for server-side use
export { bot }