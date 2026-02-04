#!/usr/bin/env node

const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const execAsync = promisify(exec)

dotenv.config({ path: '.env.local' })

async function deployBot() {
  console.log('🚀 Deploying Habesha Bingo Bot...\n')
  
  const steps = [
    { name: 'Check environment', cmd: 'node -v && npm -v' },
    { name: 'Install dependencies', cmd: 'npm install' },
    { name: 'Build application', cmd: 'npm run build' },
    { name: 'Set bot commands', cmd: 'npm run bot:set-commands' },
    { name: 'Start bot with ngrok', cmd: 'npm run bot:dev' },
  ]
  
  for (const step of steps) {
    console.log(`📦 ${step.name}...`)
    
    try {
      if (step.cmd) {
        const { stdout, stderr } = await execAsync(step.cmd)
        if (stderr) console.warn('Warning:', stderr)
      }
      console.log(`   ✅ Success\n`)
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`)
      process.exit(1)
    }
  }
  
  console.log('🎉 Deployment Complete!')
  console.log('\n🔗 Your bot is now accessible via:')
  console.log(`   Ngrok Tunnel: Check console output`)
  console.log(`   Telegram: https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}`)
  console.log('\n📋 Available commands:')
  console.log('   /start - Start the bot')
  console.log('   /register - Register account')
  console.log('   /play - Open mini app')
  console.log('   /deposit - Deposit funds')
  console.log('   /balance - Check balance')
  console.log('   /withdraw - Withdraw funds')
  console.log('   /invite - Get referral link')
}

deployBot()