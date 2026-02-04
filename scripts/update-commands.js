#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function updateCommands() {
  console.log('📱 Updating Telegram bot commands...')
  
  const commands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'register', description: 'Register with phone number' },
    { command: 'play', description: 'Play Habesha Bingo' },
    { command: 'deposit', description: 'Deposit funds' },
    { command: 'balance', description: 'Check wallet balance' },
    { command: 'withdraw', description: 'Withdraw funds' },
    { command: 'invite', description: 'Invite friends & earn' },
    { command: 'instructions', description: 'How to play guide' },
    { command: 'support', description: 'Contact customer support' },
    { command: 'about', description: 'About Habesha Bingo' }
  ]

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
      }
    )
    
    const result = await response.json()
    
    if (result.ok) {
      console.log('✅ Bot commands updated successfully!')
      console.log('\n📋 Available commands:')
      commands.forEach(cmd => {
        console.log(`   /${cmd.command} - ${cmd.description}`)
      })
    } else {
      console.error('❌ Failed to update commands:', result.description)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

updateCommands()