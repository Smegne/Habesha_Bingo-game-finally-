import { NextRequest, NextResponse } from 'next/server'
import { Telegraf } from 'telegraf'
import { Markup } from 'telegraf'
import { db } from '@/lib/mysql-db'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL!
const bot = new Telegraf(BOT_TOKEN)

// ============ HELPER FUNCTIONS ============
async function isRegistered(telegramId: string): Promise<boolean> {
  try {
    const rows = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[]
    return rows && rows.length > 0
  } catch (error) {
    console.error('DB check error:', error)
    return false
  }
}

// ✅ FIXED: getUserData function
async function getUserData(telegramId: string): Promise<any> {
  try {
    const rows = await db.query(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[]
    
    console.log(`📊 getUserData for ${telegramId}:`, rows[0] ? 'Found' : 'Not found')
    return rows[0] || null
  } catch (error) {
    console.error('Get user data error:', error)
    return null
  }
}

// ✅ FIXED: Get user by ID
async function getUserById(userId: string): Promise<any> {
  try {
    const rows = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as any[]
    return rows[0] || null
  } catch (error) {
    console.error('Get user by ID error:', error)
    return null
  }
}

// ============ COMMAND HANDLERS ============

// ✅ START COMMAND
bot.start(async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`🚀 /start from ${telegramId}`)
  
  await ctx.reply(
    `🎉 Welcome to Habesha Bingo, ${ctx.from.first_name}!\n\n` +
    `🎮 Play exciting bingo games\n` +
    `💰 Win real money prizes\n` +
    `🎁 Get 50 Birr welcome bonus!\n\n` +
    `📋 Available Commands:\n` +
    `/register - Create account\n` +
    `/play - Open game\n` +
    `/deposit - Add funds\n` +
    `/balance - Check wallet\n` +
    `/withdraw - Cash out\n` +
    `/invite - Refer friends\n` +
    `/instructions - How to play\n` +
    `/support - Contact us\n` +
    `/about - About us`
  )
})

// ✅ REGISTER COMMAND
bot.command('register', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`📝 /register from ${telegramId}`)
  
  if (await isRegistered(telegramId)) {
    await ctx.reply(`✅ You're already registered!\nUse /play to start.`)
    return
  }

  await ctx.reply(
    `📱 Registration Required\n\n` +
    `Click the button below to share your contact:\n\n` +
    `✅ You'll receive:\n` +
    `• 50 Birr welcome bonus\n` +
    `• 10 Birr bonus balance\n` +
    `• Access to all games`,
    Markup.keyboard([
      [Markup.button.contactRequest('📱 Share Contact')]
    ]).resize().oneTime()
  )
})

// ✅ HANDLE CONTACT SHARING
bot.on('contact', async (ctx) => {
  const user = ctx.from
  const contact = ctx.message.contact
  const telegramId = user.id.toString()
  
  console.log(`📞 Contact from ${telegramId}`)
  
  if (contact.user_id !== user.id) {
    await ctx.reply('❌ Please share your own contact.')
    return
  }

  try {
    if (await isRegistered(telegramId)) {
      await ctx.reply(`✅ Welcome back! You're already registered.`)
      return
    }

    const referralCode = `HAB${Date.now().toString(36).toUpperCase()}`
    
    console.log(`📝 Registering user ${telegramId} with code ${referralCode}`)
    
    await db.query(
      `INSERT INTO users 
      (telegram_id, username, first_name, phone, referral_code, balance, bonus_balance, is_online, last_active)
      VALUES (?, ?, ?, ?, ?, 50.00, 10.00, TRUE, NOW())`,
      [
        telegramId,
        user.username || null,
        user.first_name || 'User',
        contact.phone_number,
        referralCode
      ]
    )

    console.log(`✅ User ${telegramId} registered successfully`)

    await ctx.reply(
      `✅ Registration Successful!\n\n` +
      `🎉 Welcome ${user.first_name}!\n\n` +
      `💰 You received:\n` +
      `• 50 Birr welcome bonus\n` +
      `• 10 Birr bonus balance\n\n` +
      `🔑 Your Referral Code: ${referralCode}\n` +
      `Share it to earn 10 Birr per friend!\n\n` +
      `Now use /play to start gaming!`,
      Markup.removeKeyboard()
    )
    
  } catch (error: any) {
    console.error('❌ Registration error:', error)
    await ctx.reply('❌ Registration failed. Please try /register again.')
  }
})

// ✅ PLAY COMMAND (requires registration)
bot.command('play', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`🎮 /play from ${telegramId}`)
  
  if (!await isRegistered(telegramId)) {
    await ctx.reply(`⚠️ Please register first with /register`)
    return
  }

  // Update last active
  await db.query(
    'UPDATE users SET is_online = TRUE, last_active = NOW() WHERE telegram_id = ?',
    [telegramId]
  )

  await ctx.reply(
    '🎮 Opening Habesha Bingo...\n\n' +
    'Get ready to play and win! 🏆',
    Markup.inlineKeyboard([
      Markup.button.webApp('🎮 Play Now', WEBAPP_URL)
    ])
  )
})

// ✅ DEPOSIT COMMAND (requires registration)
bot.command('deposit', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`💰 /deposit from ${telegramId}`)
  
  if (!await isRegistered(telegramId)) {
    await ctx.reply(`⚠️ Please register first with /register`)
    return
  }

  await ctx.reply(
    '💵 **Deposit Funds**\n\n' +
    '**📱 TeleBirr:**\n' +
    '• 0911-111-1111 (Habesha Bingo)\n' +
    '• 0911-222-2222 (Habesha Bingo)\n\n' +
    '**🏦 CBE Birr:**\n' +
    '• Account: 1000-1234-5678\n' +
    '• Name: Habesha Bingo\n\n' +
    '**📌 Instructions:**\n' +
    '1. Send money to any number above\n' +
    '2. Take screenshot of payment\n' +
    '3. Send the screenshot here\n' +
    '4. We\'ll approve within 1-24 hours\n\n' +
    '⚠️ **Minimum deposit:** 10 Birr\n' +
    '✅ **No deposit fees**',
    Markup.inlineKeyboard([
      Markup.button.callback('📸 Submit Screenshot', 'submit_deposit'),
      Markup.button.webApp('💰 Quick Deposit', WEBAPP_URL)
    ])
  )
})

// ✅ BALANCE COMMAND (FIXED - requires registration)
bot.command('balance', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`💳 /balance from ${telegramId}`)
  
  if (!await isRegistered(telegramId)) {
    await ctx.reply(`⚠️ Please register first with /register`)
    return
  }

  const user = await getUserData(telegramId)
  console.log(`📊 Balance check user data:`, user)
  
  if (!user) {
    await ctx.reply('❌ User not found. Please register with /register')
    return
  }

  const balance = parseFloat(user.balance || 0)
  const bonusBalance = parseFloat(user.bonus_balance || 0)
  const totalBalance = balance + bonusBalance

  await ctx.reply(
    '💰 **Your Wallet**\n\n' +
    `💳 **Main Balance:** ${balance.toFixed(2)} Birr\n` +
    `🎁 **Bonus Balance:** ${bonusBalance.toFixed(2)} Birr\n` +
    `🎯 **Total Balance:** ${totalBalance.toFixed(2)} Birr\n\n` +
    '💸 Use /deposit to add funds\n' +
    '🏧 Use /withdraw to cash out',
    Markup.inlineKeyboard([
      Markup.button.webApp('💸 Quick Deposit', WEBAPP_URL),
      Markup.button.webApp('🏧 Quick Withdraw', WEBAPP_URL)
    ])
  )
})

// ✅ WITHDRAW COMMAND (requires registration)
bot.command('withdraw', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`🏧 /withdraw from ${telegramId}`)
  
  if (!await isRegistered(telegramId)) {
    await ctx.reply(`⚠️ Please register first with /register`)
    return
  }

  const user = await getUserData(telegramId)
  
  if (!user) {
    await ctx.reply('❌ User not found. Please register with /register')
    return
  }

  const balance = parseFloat(user.balance || 0)
  const bonusBalance = parseFloat(user.bonus_balance || 0)
  const totalBalance = balance + bonusBalance

  await ctx.reply(
    '🏧 **Withdraw Funds**\n\n' +
    `💰 **Available Balance:** ${totalBalance.toFixed(2)} Birr\n` +
    `💳 **Withdrawable:** ${balance.toFixed(2)} Birr (Main balance only)\n` +
    `🎁 **Bonus Balance:** ${bonusBalance.toFixed(2)} Birr (Play to convert)\n\n` +
    '**📝 Minimum Withdrawal:** 10 Birr\n' +
    '**⏱️ Processing Time:** 1-24 hours\n' +
    '**💸 Fees:** No withdrawal fees\n\n' +
    '**📋 To withdraw, please send:**\n' +
    '1. Amount (Birr)\n' +
    '2. Account number\n\n' +
    '**Example:**\n' +
    '```\n' +
    '100\n' +
    '0911-123-4567\n' +
    '```',
    Markup.forceReply()
  )
})

// ✅ INVITE COMMAND (FIXED - requires registration)
bot.command('invite', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  console.log(`👥 /invite from ${telegramId}`)
  
  if (!await isRegistered(telegramId)) {
    await ctx.reply(`⚠️ Please register first with /register`)
    return
  }

  const user = await getUserData(telegramId)
  console.log(`📊 Invite user data:`, user)
  
  if (!user) {
    await ctx.reply('❌ User not found. Please register with /register')
    return
  }

  const referralCode = user.referral_code
  const inviteLink = `https://t.me/habeshabingo1_bot?start=${referralCode}`
  
  await ctx.reply(
    '👥 **Invite Friends & Earn!**\n\n' +
    `🔗 **Your referral link:**\n${inviteLink}\n\n` +
    '**💰 How it works:**\n' +
    '1. Share your link with friends\n' +
    '2. Friend clicks link & registers\n' +
    '3. You get **10 Birr** instantly!\n' +
    '4. Friend gets **50 Birr** welcome bonus\n\n' +
    '**🎯 No limit!** Invite unlimited friends\n' +
    '**⚡ Instant payment** to your balance\n\n' +
    '**📱 Share now and start earning!**',
    Markup.inlineKeyboard([
      Markup.button.url(
        '📱 Share on Telegram', 
        `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join Habesha Bingo 🎮 and win real money 💰! Use my referral code: ' + referralCode)}`
      ),
      Markup.button.webApp('🎮 Play Now', WEBAPP_URL)
    ])
  )
})

// ✅ INSTRUCTIONS COMMAND (no registration needed)
bot.command('instructions', async (ctx) => {
  console.log(`📚 /instructions from ${ctx.from.id}`)
  await ctx.reply(
    '📚 **How to Play Habesha Bingo**\n\n' +
    '**🎮 Game Rules:**\n' +
    '1. Each game costs 5-100 Birr stake\n' +
    '2. You get a 5x5 bingo card\n' +
    '3. Numbers are called randomly\n' +
    '4. Mark numbers on your card\n' +
    '5. First to complete a line wins!\n\n' +
    '**🏆 Winning Patterns:**\n' +
    '• Horizontal line\n' +
    '• Vertical line\n' +
    '• Diagonal line\n' +
    '• Four corners\n' +
    '• Full house (all numbers)\n\n' +
    '**💰 Payouts:**\n' +
    '• Line win: 5x stake\n' +
    '• Full house: 50x stake\n\n' +
    '**⚡ Quick Start:**\n' +
    '1. /register - Create account\n' +
    '2. /deposit - Add funds\n' +
    '3. /play - Start gaming!\n\n' +
    'Need help? Use /support'
  )
})

// ✅ SUPPORT COMMAND (no registration needed)
bot.command('support', async (ctx) => {
  console.log(`📞 /support from ${ctx.from.id}`)
  await ctx.reply(
    '📞 **Customer Support**\n\n' +
    '**For assistance, contact:**\n' +
    '👨‍💼 **Admin:** @habeshabingo1_bot\n' +
    '📧 **Email:** support@habeshabingo.com\n' +
    '⏰ **Hours:** 24/7\n\n' +
    '**Common Issues:**\n' +
    '• Deposit not showing? Send screenshot\n' +
    '• Withdrawal delayed? Check processing time\n' +
    '• Game issues? Restart the app\n' +
    '• Account problems? Contact admin\n\n' +
    '**Response Time:**\n' +
    '• Usually within 1-2 hours\n' +
    '• Maximum 24 hours\n\n' +
    'We\'re here to help! 🎮'
  )
})

// ✅ ABOUT COMMAND (no registration needed)
bot.command('about', async (ctx) => {
  console.log(`🎯 /about from ${ctx.from.id}`)
  await ctx.reply(
    '🎯 **About Habesha Bingo**\n\n' +
    '**🌟 Our Mission:**\n' +
    'To bring fun, fair, and exciting bingo games to Ethiopia with real money prizes!\n\n' +
    '**✅ Why Choose Us?**\n' +
    '• 🎮 Fun & engaging games\n' +
    '• 💰 Real money prizes\n' +
    '• 🔒 Secure & fair gameplay\n' +
    '• ⚡ Fast withdrawals\n' +
    '• 🎁 Generous bonuses\n' +
    '• 📱 Easy to play\n\n' +
    '**🏆 Features:**\n' +
    '• Multiple game rooms\n' +
    '• Daily bonuses\n' +
    '• Referral rewards\n' +
    '• Tournaments\n' +
    '• Leaderboards\n\n' +
    '**🔒 Security:**\n' +
    '• Encrypted transactions\n' +
    '• Fair random number generation\n' +
    '• Secure payment processing\n\n' +
    'Join thousands of happy players! 🎉\n\n' +
    'Start now with /register'
  )
})

// ============ CALLBACK HANDLERS ============

// Deposit screenshot callback
bot.action('submit_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply(
    '📸 **Send Payment Screenshot**\n\n' +
    'Please send the screenshot of your payment.\n' +
    'Make sure it shows:\n' +
    '• Amount sent\n' +
    '• Date & time\n' +
    '• Transaction ID\n' +
    '• Recipient number\n\n' +
    'We\'ll verify within 1-24 hours.'
  )
})

// Handle photo for deposit
bot.on('photo', async (ctx) => {
  const telegramId = ctx.from.id.toString()
  
  if (!await isRegistered(telegramId)) {
    await ctx.reply(`⚠️ Please register first with /register`)
    return
  }

  await ctx.reply(
    '✅ Screenshot received!\n\n' +
    'Now please send the **deposit amount** in Birr:\n' +
    'Example: `100`\n\n' +
    'Or type "cancel" to cancel.',
    Markup.forceReply()
  )
})

// Handle text responses for deposit amount
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim()
  const telegramId = ctx.from.id.toString()
  
  // Check if replying to deposit amount request
  if (ctx.message.reply_to_message?.text?.includes('deposit amount')) {
    if (text.toLowerCase() === 'cancel') {
      await ctx.reply('❌ Deposit cancelled.')
      return
    }
    
    const amount = parseFloat(text)
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply('❌ Invalid amount. Minimum deposit is 10 Birr.')
      return
    }
    
    try {
      const user = await getUserData(telegramId)
      
      if (!user) {
        await ctx.reply('❌ User not found. Please register first.')
        return
      }
      
      await db.query(
        `INSERT INTO deposits (user_id, amount, method, status, created_at)
         VALUES (?, ?, 'telebirr', 'pending', NOW())`,
        [user.id, amount]
      )
      
      await ctx.reply(
        `✅ **Deposit Request Submitted!**\n\n` +
        `💰 **Amount:** ${amount} Birr\n` +
        `📱 **Method:** TeleBirr\n` +
        `⏱️ **Status:** Pending approval\n\n` +
        `**Next steps:**\n` +
        `1. We'll verify your payment\n` +
        `2. You'll get notification when approved\n` +
        `3. Funds will be added to your balance\n\n` +
        `⏰ **Processing time:** 1-24 hours\n\n` +
        `Check /balance for updates!`
      )
      
    } catch (error) {
      console.error('❌ Deposit error:', error)
      await ctx.reply('❌ Failed to submit deposit. Please try again.')
    }
  }
})

// ============ WEBHOOK HANDLER ============
export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    console.log('📨 Update received:', update.message?.text || 'contact/other')
    await bot.handleUpdate(update)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Bot error:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Bot webhook active',
    commands: [
      '/start', '/register', '/play', '/deposit',
      '/balance', '/withdraw', '/invite', '/instructions',
      '/support', '/about'
    ],
    time: new Date().toISOString()
  })
}