#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Telegraf, Markup } = require('telegraf')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env.local')
  console.error('Get it from @BotFather on Telegram:')
  console.error('1. Open https://t.me/BotFather')
  console.error('2. Send /newbot')
  console.error('3. Choose name: Habesha Bingo Bot')
  console.error('4. Choose username: HabeshaBingoBot')
  console.error('5. Copy token and add to .env.local')
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

// Play command (simplified for polling mode)
bot.command('play', async (ctx) => {
  await ctx.reply(
    '🎮 Habesha Bingo Game\n\n' +
    'To play the full game:\n\n' +
    '1. Start the Next.js development server:\n' +
    '   `npm run dev`\n\n' +
    '2. Open in browser:\n' +
    '   http://localhost:3000\n\n' +
    '3. For Telegram Mini App:\n' +
    '   - Get ngrok URL: `npx ngrok http 3000`\n' +
    '   - Use that URL with BotFather\n\n' +
    '📱 Test commands work now!'
  )
})

// Other commands remain the same as above...

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err)
  ctx.reply('❌ An error occurred. Please try again.')
})

async function startBot() {
  try {
    console.log('🚀 Starting Habesha Bingo Bot (Polling Mode)...\n')
    
    // Get bot info
    const botInfo = await bot.telegram.getMe()
    console.log(`🤖 Bot Info:`)
    console.log(`   Name: ${botInfo.first_name}`)
    console.log(`   Username: @${botInfo.username}`)
    console.log(`   ID: ${botInfo.id}`)
    
    // Start bot in polling mode
    await bot.launch({ 
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query']
    })
    
    console.log('\n🎉 Bot is running in polling mode!')
    console.log(`📱 Test your bot: https://t.me/${botInfo.username}`)
    
    console.log('\n📋 Available Commands:')
    commands.forEach(cmd => {
      console.log(`   /${cmd.command.padEnd(15)} - ${cmd.description}`)
    })
    
    console.log('\n💡 Tips:')
    console.log('   • Send /start to test')
    console.log('   • Send /register to create account')
    console.log('   • Send /play to see game info')
    
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
    
    if (error.message.includes('ETELEGRAM: 401')) {
      console.error('\n🔑 Invalid bot token!')
      console.error('Get a valid token from @BotFather')
    } else if (error.message.includes('ETELEGRAM: 404')) {
      console.error('\n🤖 Bot not found!')
      console.error('Make sure the bot exists and token is correct')
    }
    
    process.exit(1)
  }
}

// Run the bot
startBot()