#!/usr/bin/env node

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

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
    // Dynamically import the bot
    const { startBot: startTelegramBot } = await import('../lib/telegram/bot')
    
    await startTelegramBot()
    
    console.log('\n🎉 Bot Setup Complete!')
    console.log('✅ Telegram bot running')
    console.log('✅ Ngrok tunnel active')
    console.log('✅ Webhook configured')
    
    console.log('\n📱 Test your bot:')
    console.log(`   https://t.me/${process.env.TELEGRAM_BOT_USERNAME?.replace('@', '') || 'habeshabingo1_bot'}`)
    console.log('\n💡 Commands to test:')
    console.log('   /start - Welcome message')
    console.log('   /play - Open Mini App')
    console.log('   /register - Create account')
    
  } catch (error: any) {
    console.error('❌ Failed to start bot:', error.message)
    
    // Try simple polling mode as fallback
    console.log('\n🔄 Trying polling mode...')
    await startSimpleBot()
  }
}

// Simple bot fallback (polling mode)
async function startSimpleBot() {
  const { Telegraf, Markup } = await import('telegraf')
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)
  
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
  
  await bot.telegram.setMyCommands(commands)
  
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
  
  // Launch bot
  await bot.launch({ dropPendingUpdates: true })
  console.log('✅ Bot running in polling mode')
  
  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

// Run the bot
startBot()