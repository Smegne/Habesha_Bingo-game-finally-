#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Telegraf, Markup } = require('telegraf')
const mysql = require('mysql2/promise')

console.log('🤖 Starting Habesha Bingo Bot (Debug Mode)...\n')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://unrivalling-damien-overliterary.ngrok-free.dev'

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local')
  process.exit(1)
}

console.log('📱 Configuration:')
console.log(`   Bot Token: ${BOT_TOKEN.substring(0, 10)}...`)
console.log(`   DB Host: ${process.env.DB_HOST}`)
console.log(`   DB Name: ${process.env.DB_NAME}`)
console.log(`   Web App: ${WEBAPP_URL}`)
console.log()

// Database connection with better error handling
let db
try {
  db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3309'),
    database: process.env.DB_NAME || 'habesha_bingo',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  
  // Test connection
  const [rows] = await db.execute('SELECT 1 as test')
  console.log('✅ Database connection successful')
} catch (dbError) {
  console.error('❌ Database connection failed:', dbError.message)
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// Helper function to check if user is registered
async function isUserRegistered(telegramId) {
  try {
    console.log(`📊 Checking registration for telegram_id: ${telegramId}`)
    const [rows] = await db.execute(
      'SELECT id, username FROM users WHERE telegram_id = ?',
      [telegramId.toString()]
    )
    console.log(`📊 Found ${rows.length} users with this telegram_id`)
    return rows.length > 0
  } catch (error) {
    console.error('❌ Error checking user registration:', error.message)
    return false
  }
}

// Set bot commands
bot.telegram.setMyCommands([
  { command: 'start', description: 'Start the bot' },
  { command: 'register', description: 'Register with phone number' },
  { command: 'play', description: 'Play Bingo' },
  { command: 'deposit', description: 'Deposit funds' },
])

// Start command
bot.start(async (ctx) => {
  console.log(`🚀 /start command from ${ctx.from.id} - ${ctx.from.first_name}`)
  
  await ctx.reply(
    `🎉 Welcome to Habesha Bingo, ${ctx.from.first_name}!\n\n` +
    `Use /register to create your account and get started!`
  )
})

// REGISTER command
bot.command('register', async (ctx) => {
  const user = ctx.from
  console.log(`📝 /register command from ${user.id} - ${user.first_name}`)
  
  const isRegistered = await isUserRegistered(user.id)
  
  if (isRegistered) {
    await ctx.reply(`✅ You're already registered, ${user.first_name}!`)
    return
  }
  
  await ctx.reply(
    `📱 Registration\n\n` +
    `Please share your contact to create your account.\n\n` +
    `You'll receive:\n` +
    `• 50 Birr welcome bonus\n` +
    `• 10 Birr bonus balance\n` +
    `• Access to all games`,
    Markup.keyboard([
      [Markup.button.contactRequest('📱 Share My Contact')]
    ]).resize().oneTime()
  )
})

// Handle contact sharing
bot.on('contact', async (ctx) => {
  const user = ctx.from
  const contact = ctx.message.contact
  
  console.log(`📱 Contact received from ${user.id}:`)
  console.log(`   Phone: ${contact.phone_number}`)
  console.log(`   User ID match: ${contact.user_id === user.id}`)
  
  // Verify it's the user's own contact
  if (contact.user_id !== user.id) {
    await ctx.reply('❌ Please share your own contact information.')
    return
  }
  
  try {
    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    )
    
    if (existingUsers.length > 0) {
      await ctx.reply(`✅ Welcome back, ${user.first_name}!`)
      return
    }
    
    // Generate unique referral code
    let referralCode
    let isUnique = false
    let attempts = 0
    
    while (!isUnique && attempts < 10) {
      referralCode = `HAB${user.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`
      const [checkCode] = await db.execute(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      )
      isUnique = checkCode.length === 0
      attempts++
    }
    
    console.log(`🔑 Generated referral code: ${referralCode}`)
    
    // Create new user
    const [result] = await db.execute(
      `INSERT INTO users 
      (telegram_id, username, first_name, phone, referral_code, 
       balance, bonus_balance, is_online, last_active)
      VALUES (?, ?, ?, ?, ?, 50.00, 10.00, TRUE, NOW())`,
      [
        user.id.toString(),
        user.username || `user_${user.id}`,
        user.first_name || 'User',
        contact.phone_number,
        referralCode
      ]
    )
    
    console.log(`✅ User inserted. Insert ID: ${result.insertId}`)
    
    // Get the new user's ID
    const [newUser] = await db.execute(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    )
    
    const userId = newUser[0].id
    console.log(`📋 User ID in database: ${userId}`)
    
    // Add welcome bonus transaction
    await db.execute(
      `INSERT INTO transactions 
      (user_id, type, amount, description)
      VALUES (?, 'referral_bonus', 50.00, 'Welcome bonus')`,
      [userId]
    )
    
    // Add referral bonus transaction
    await db.execute(
      `INSERT INTO transactions 
      (user_id, type, amount, description)
      VALUES (?, 'referral_bonus', 10.00, 'Registration bonus')`,
      [userId]
    )
    
    // Success message
    await ctx.reply(
      `✅ Registration Successful!\n\n` +
      `🎉 Welcome ${user.first_name} to Habesha Bingo!\n\n` +
      `💰 You received:\n` +
      `• 50 Birr welcome bonus\n` +
      `• 10 Birr bonus balance\n\n` +
      `🔑 Your Referral Code: ${referralCode}\n\n` +
      `🎮 Now you can use /play to start gaming!`
    )
    
    // Show success in console
    console.log(`🎉 SUCCESS: User ${user.id} (${user.first_name}) registered successfully!`)
    
  } catch (error) {
    console.error('❌ Registration error:', error)
    console.error('Error details:', error.message)
    console.error('SQL Error code:', error.code)
    
    await ctx.reply(
      '❌ Registration failed. Please try again or contact support.\n' +
      `Error: ${error.message}`
    )
  }
})

// Error handling
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err)
  ctx.reply('❌ An error occurred. Please try again.')
})

// Launch bot
bot.launch().then(() => {
  console.log('✅ Bot is running in polling mode!')
  console.log(`📱 Test your bot: https://t.me/habeshabingo1_bot`)
  console.log('\n💡 Commands to test:')
  console.log('   /start - Welcome message')
  console.log('   /register - Register with phone')
})

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...')
  bot.stop('SIGINT')
  if (db) db.end()
  process.exit(0)
})

process.once('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...')
  bot.stop('SIGTERM')
  if (db) db.end()
  process.exit(0)
})