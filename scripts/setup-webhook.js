#!/usr/bin/env node
require('dotenv').config()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/bot`

async function setup() {
  console.log('🔧 Setting up Telegram webhook...')
  
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`
  )
  
  const result = await response.json()
  
  if (result.ok) {
    console.log('✅ Webhook set successfully!')
    console.log(`📱 URL: ${WEBHOOK_URL}`)
  } else {
    console.error('❌ Failed:', result.description)
  }
}

setup()