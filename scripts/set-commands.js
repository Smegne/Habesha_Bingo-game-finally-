#!/usr/bin/env node

const { Telegraf } = require('telegraf')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function setCommands() {
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local')
    process.exit(1)
  }
  
  const bot = new Telegraf(BOT_TOKEN)
  
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
  
  try {
    await bot.telegram.setMyCommands(commands)
    console.log('✅ Bot commands set successfully!')
    
    // Get bot info
    const botInfo = await bot.telegram.getMe()
    console.log('\n🤖 Bot Information:')
    console.log(`   Name: ${botInfo.first_name}`)
    console.log(`   Username: @${botInfo.username}`)
    console.log(`   ID: ${botInfo.id}`)
    
    console.log('\n📋 Available Commands:')
    commands.forEach(cmd => {
      console.log(`   /${cmd.command.padEnd(12)} - ${cmd.description}`)
    })
    
    console.log('\n🔗 Bot Link:')
    console.log(`   https://t.me/${botInfo.username}`)
    
  } catch (error) {
    console.error('❌ Failed to set commands:', error.message)
    process.exit(1)
  }
}

setCommands()