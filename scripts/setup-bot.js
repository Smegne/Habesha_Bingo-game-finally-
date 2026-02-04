#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function setupBot() {
  console.log('🤖 Habesha Bingo Bot Setup\n')
  
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local')
    console.log('Get it from @BotFather on Telegram')
    process.exit(1)
  }
  
  console.log('📊 Bot Configuration:')
  console.log(`   Token: ${BOT_TOKEN.substring(0, 10)}...`)
  console.log(`   API URL: ${API_URL}`)
  console.log()
  
  // Test bot token
  console.log('🔍 Testing bot token...')
  try {
    const testRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    const testData = await testRes.json()
    
    if (testData.ok) {
      console.log(`✅ Bot: @${testData.result.username}`)
      console.log(`   Name: ${testData.result.first_name}`)
    } else {
      console.error('❌ Invalid bot token')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Cannot connect to Telegram API')
    console.log('💡 Check your internet connection')
    process.exit(1)
  }
  
  // Set webhook
  console.log('\n🔧 Setting up webhook...')
  const webhookUrl = `${API_URL}/api/bot`
  console.log(`   Webhook URL: ${webhookUrl}`)
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: webhookUrl,
          drop_pending_updates: true
        })
      }
    )
    
    const result = await response.json()
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!')
      console.log('\n🎉 Setup complete!')
      console.log('\n📱 Test your bot:')
      console.log(`   1. Open Telegram`)
      console.log(`   2. Search for your bot`)
      console.log(`   3. Type /start`)
      console.log(`   4. Type /register`)
    } else {
      console.error('❌ Failed to set webhook:')
      console.error(`   Error: ${result.description}`)
      
      if (result.description.includes('webhook can be set')) {
        console.log('\n💡 Solution: Delete old webhook first:')
        console.log(`   curl -X POST https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`)
      }
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message)
    console.log('\n💡 Possible solutions:')
    console.log('   1. Make sure Next.js server is running (npm run dev)')
    console.log('   2. If using ngrok, start it: npx ngrok http 3000')
    console.log('   3. Update API_URL in .env.local with ngrok URL')
  }
}

// Get webhook info
async function getWebhookInfo() {
  console.log('\n📡 Checking current webhook...')
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
    const result = await response.json()
    
    if (result.ok) {
      console.log(`   URL: ${result.result.url || 'Not set'}`)
      console.log(`   Has custom certificate: ${result.result.has_custom_certificate}`)
      console.log(`   Pending updates: ${result.result.pending_update_count}`)
    }
  } catch (error) {
    console.error('   Cannot get webhook info')
  }
}

// Run setup
setupBot().then(() => getWebhookInfo())