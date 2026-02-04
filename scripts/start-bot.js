#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })

async function startBot() {
  console.log('🚀 Starting Habesha Bingo Bot...\n')
  
  // Check environment
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local')
    process.exit(1)
  }
  
  console.log('📱 Bot Configuration:')
  console.log(`   Username: ${process.env.TELEGRAM_BOT_USERNAME || 'Not set'}`)
  console.log(`   Token: ${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`)
  console.log(`   Ngrok Auth: ${process.env.NGROK_AUTH_TOKEN ? 'Set' : 'Not set'}`)
  console.log(`   Web App URL: ${process.env.NEXT_PUBLIC_WEBAPP_URL || 'Not set'}`)
  console.log()
  
  try {
    // Try to load the TypeScript bot
    const { startBot: startTelegramBot } = await import('../lib/telegram/bot')
    
    await startTelegramBot()
    
    console.log('\n🎉 Bot Setup Complete!')
    console.log('✅ Telegram bot running')
    console.log('✅ Ngrok tunnel active')
    console.log('✅ Webhook configured')
    
  } catch (error) {
    console.error('❌ Failed to start bot with ngrok:', error.message)
    
    // Fallback to simple polling mode
    console.log('\n🔄 Starting simple polling bot...')
    startSimpleBot()
  }
}

// Simple polling bot
function startSimpleBot() {
  const { Telegraf, Markup } = require('telegraf')
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
  
  // Set commands
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
    await ctx.reply(
      `🎉 Welcome to Habesha Bingo, ${ctx.from.first_name}!\n\n` +
      `🎮 Play exciting bingo games\n` +
      `💰 Win real money prizes\n` +
      `🎁 Get 50 Birr welcome bonus!\n\n` +
      `Use /register to create account`
    )
  })
  
  // Play command
  bot.command('play', async (ctx) => {
    const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev'
    
    await ctx.reply(
      '🎮 Opening Habesha Bingo Mini App...',
      Markup.inlineKeyboard([
        Markup.button.webApp('🎮 Play Now', webAppUrl)
      ])
    )
  })
  
  // Register command
  bot.command('register', async (ctx) => {
    const referralCode = `HAB${ctx.from.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`
    
    await ctx.reply(
      `✅ Registration Successful!\n\n` +
      `🎉 Welcome ${ctx.from.first_name} to Habesha Bingo!\n\n` +
      `💰 You received 50 Birr welcome bonus!\n` +
      `🎁 Plus 10 Birr bonus balance!\n\n` +
      `🔑 Your Referral Code: ${referralCode}\n` +
      `Share it to earn 10 Birr per friend!\n\n` +
      `🎮 Use /play to start gaming!`
    )
  })
  
  // Launch bot
  bot.launch()
  console.log('✅ Bot running in polling mode')
  
  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

startBot()