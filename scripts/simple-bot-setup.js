#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Telegraf, Markup } = require('telegraf')
const ngrok = require('@ngrok/ngrok')
const axios = require('axios')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const NGROK_AUTH_TOKEN = process.env.NGROK_AUTH_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env.local')
  console.error('Get it from @BotFather on Telegram')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

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

bot.telegram.setMyCommands(commands)

// Start command
bot.start(async (ctx) => {
  const user = ctx.from
  
  await ctx.reply(
    `🎉 Welcome to Habesha Bingo, ${user.first_name}!\n\n` +
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
    `/support - Get help\n` +
    `/about - About us`,
    Markup.keyboard([
      ['📋 Register', '🎮 Play'],
      ['💰 Deposit', '🏧 Withdraw'],
      ['👥 Invite', '📞 Support']
    ]).resize()
  )
})

// Register command
bot.command('register', async (ctx) => {
  const user = ctx.from
  
  const referralCode = `HAB${user.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`
  
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
        `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${ctx.botInfo.username}?start=${referralCode}`)}&text=${encodeURIComponent('Join Habesha Bingo and win real money! Use my referral code: ' + referralCode)}`)
    ])
  )
})

// Play command
bot.command('play', async (ctx) => {
  try {
    // Try to get ngrok URL from API
    let webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || `https://t.me/${ctx.botInfo.username}/app`
    
    // If we have a custom web app URL from environment
    if (process.env.NGROK_URL) {
      webAppUrl = process.env.NGROK_URL
    }
    
    await ctx.reply(
      '🎮 Opening Habesha Bingo Mini App...',
      Markup.inlineKeyboard([
        Markup.button.webApp('🎮 Play Now', webAppUrl)
      ])
    )
  } catch (error) {
    await ctx.reply(
      '🎮 To play Habesha Bingo:\n\n' +
      '1. Open this link in browser:\n' +
      '   http://localhost:3000\n\n' +
      '2. Or set up Ngrok tunnel with:\n' +
      '   `npx ngrok http 3000`\n\n' +
      '3. Then use the ngrok URL here'
    )
  }
})

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
      Markup.button.callback('📸 Submit Screenshot', 'submit_deposit')
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
      Markup.button.callback('💸 Deposit', 'quick_deposit'),
      Markup.button.callback('🏧 Withdraw', 'quick_withdraw')
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

// Instructions command
bot.command('instructions', async (ctx) => {
  await ctx.reply(
    `🎮 How to Play Habesha Bingo\n\n` +
    `1. 📋 Register with /register\n` +
    `2. 💰 Deposit funds with /deposit\n` +
    `3. 🎮 Play with /play\n` +
    `4. 🏆 Win & withdraw with /withdraw\n\n` +
    `📊 Game Rules:\n` +
    `• Choose stake (10 or 20 Birr)\n` +
    `• Select bingo card\n` +
    `• Mark numbers as called\n` +
    `• Complete patterns to win\n` +
    `• 5x prize for winning\n\n` +
    `Need help? Use /support`,
    Markup.inlineKeyboard([
      Markup.button.callback('🎮 Play Now', 'play_action'),
      Markup.button.callback('💰 Deposit', 'deposit_action')
    ])
  )
})

// Support command
bot.command('support', async (ctx) => {
  await ctx.reply(
    `📞 Customer Support\n\n` +
    `We're here to help you!\n\n` +
    `📱 Contact:\n` +
    `• @HabeshaBingoSupport\n` +
    `• Email: support@habeshabingo.com\n\n` +
    `⏰ Hours:\n` +
    `• 24/7 Support\n` +
    `• Response time: < 1 hour\n\n` +
    `📋 Common Issues:\n` +
    `• Deposit/withdrawal delays\n` +
    `• Game issues\n` +
    `• Account problems`,
    Markup.inlineKeyboard([
      Markup.button.url('💬 Message Support', 'https://t.me/HabeshaBingoSupport'),
      Markup.button.callback('📋 View FAQ', 'view_faq')
    ])
  )
})

// About command
bot.command('about', async (ctx) => {
  await ctx.reply(
    `🏆 About Habesha Bingo\n\n` +
    `🎮 Ethiopian Bingo Gaming Platform\n\n` +
    `🎯 Features:\n` +
    `• Real-time multiplayer bingo\n` +
    `• Secure payment system\n` +
    `• Referral bonuses\n` +
    `• 24/7 customer support\n\n` +
    `🔒 Security:\n` +
    `• Telegram authentication\n` +
    `• Secure transactions\n` +
    `• Fair gameplay\n\n` +
    `📱 Play now with /play`,
    Markup.inlineKeyboard([
      Markup.button.url('🌐 Website', 'https://habeshabingo.com'),
      Markup.button.callback('📢 Channel', 'view_channel')
    ])
  )
})

// Handle inline callbacks
bot.action('submit_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply('📸 Please send the payment screenshot')
})

bot.action('quick_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  ctx.reply('/deposit')
})

bot.action('quick_withdraw', async (ctx) => {
  await ctx.answerCbQuery()
  ctx.reply('/withdraw')
})

bot.action('play_action', async (ctx) => {
  await ctx.answerCbQuery()
  ctx.reply('/play')
})

bot.action('deposit_action', async (ctx) => {
  await ctx.answerCbQuery()
  ctx.reply('/deposit')
})

bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply('📊 Referral Statistics:\n\n👥 Total Referrals: 0\n💰 Total Earned: 0 Birr')
})

bot.action('view_faq', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply(
    `📋 Frequently Asked Questions\n\n` +
    `❓ How to register?\n` +
    `✅ Use /register command\n\n` +
    `❓ How to deposit?\n` +
    `✅ Use /deposit command\n\n` +
    `❓ How to play?\n` +
    `✅ Use /play command\n\n` +
    `❓ Minimum deposit/withdrawal?\n` +
    `✅ 10 Birr\n\n` +
    `Need more help? Use /support`
  )
})

bot.action('view_channel', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply('📢 Join our channel for updates: @HabeshaBingoUpdates')
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

// Handle deposit amount
bot.on('text', async (ctx) => {
  const text = ctx.message.text
  
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
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err)
  ctx.reply('❌ An error occurred. Please try again.')
})

async function startBot() {
  try {
    console.log('🚀 Starting Habesha Bingo Bot...\n')
    
    // Get bot info
    const botInfo = await bot.telegram.getMe()
    console.log(`🤖 Bot Info:`)
    console.log(`   Name: ${botInfo.first_name}`)
    console.log(`   Username: @${botInfo.username}`)
    console.log(`   ID: ${botInfo.id}`)
    
    // Try to start ngrok with error handling
    let ngrokUrl = null
    if (NGROK_AUTH_TOKEN) {
      try {
        console.log('\n🌐 Checking existing Ngrok tunnels...')
        
        // List existing tunnels first
        try {
          const tunnels = await ngrok.tunnels()
          if (tunnels.length > 0) {
            console.log('📡 Found existing tunnels:')
            tunnels.forEach(t => {
              console.log(`   - ${t.public_url} (${t.proto})`)
            })
            ngrokUrl = tunnels[0].public_url
            console.log(`\n✅ Using existing tunnel: ${ngrokUrl}`)
          }
        } catch (e) {
          // If listing fails, try to create new
          console.log('Creating new tunnel...')
        }
        
        if (!ngrokUrl) {
          console.log('\n🌐 Starting new Ngrok tunnel...')
          const listener = await ngrok.connect({
            addr: 3000,
            authtoken: NGROK_AUTH_TOKEN,
            // Add pooling to avoid conflicts
            metadata: 'habesha-bingo-bot'
          })
          
          ngrokUrl = listener.url()
          console.log(`✅ New tunnel started: ${ngrokUrl}`)
        }
        
        // Set webhook
        await bot.telegram.setWebhook(`${ngrokUrl}/api/webhook`)
        console.log('✅ Webhook configured')
        
      } catch (ngrokError) {
        console.log('⚠️  Ngrok warning:', ngrokError.message)
        console.log('📡 Running without webhook (using polling)')
        
        // Start without webhook
        await bot.launch({ dropPendingUpdates: true })
      }
    } else {
      console.log('⚠️  NGROK_AUTH_TOKEN not set, using polling mode')
      await bot.launch({ dropPendingUpdates: true })
    }
    
    console.log('\n🎉 Bot is running!')
    console.log(`📱 Test your bot: https://t.me/${botInfo.username}`)
    
    if (ngrokUrl) {
      console.log(`🔗 Ngrok URL: ${ngrokUrl}`)
      console.log(`🌐 Web App: ${ngrokUrl}`)
    }
    
    console.log('\n📋 Available Commands:')
    commands.forEach(cmd => {
      console.log(`   /${cmd.command.padEnd(15)} - ${cmd.description}`)
    })
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...')
      bot.stop('SIGINT')
      process.exit(0)
    })
    
    process.once('SIGTERM', () => {
      console.log('\n🛑 Shutting down bot...')
      bot.stop('SIGTERM')
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message)
    
    // Try polling mode as fallback
    try {
      console.log('\n🔄 Trying polling mode...')
      await bot.launch({ dropPendingUpdates: true })
      console.log('✅ Bot started in polling mode')
    } catch (pollError) {
      console.error('❌ Polling mode also failed:', pollError.message)
      process.exit(1)
    }
  }
}

// Run the bot
startBot()