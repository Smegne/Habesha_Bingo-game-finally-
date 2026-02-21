// C:\Users\hp\Desktop\finishinggbingo\HB\Habesha_Bingo-game-finally-\lib\telegram\bot.ts
// Server-side only Telegram bot
import 'server-only'
import { Telegraf, Markup, Context } from 'telegraf'
import { message } from 'telegraf/filters'

// Import your existing database connection
import { db } from '@/lib/mysql-db'

// We'll use dynamic import for ngrok
let ngrok: any = null;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const NGROK_AUTH_TOKEN = process.env.NGROK_AUTH_TOKEN

let ngrokUrl: string | null = null
let botWebhookUrl: string | null = null
export const bot = new Telegraf(BOT_TOKEN)

// Simple in-memory session store (works for single instance)
// For multiple instances, use Redis or database
const sessionStore = new Map<string, {
  depositMethod?: 'telebirr' | 'cbe';
  depositAmount?: number;
  transactionRef?: string;
  depositStep?: string;
  timestamp: number;
}>();

// Clean up old sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessionStore.entries()) {
    if (now - value.timestamp > 30 * 60 * 1000) { // 30 minutes timeout
      sessionStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Helper to get session key
function getSessionKey(ctx: Context): string {
  return `${ctx.from?.id}:${ctx.chat?.id}`;
}

// Helper to get or create session
function getSession(ctx: Context) {
  const key = getSessionKey(ctx);
  if (!sessionStore.has(key)) {
    sessionStore.set(key, { timestamp: Date.now() });
  }
  return sessionStore.get(key)!;
}

// Helper to update session
function updateSession(ctx: Context, data: Partial<any>) {
  const key = getSessionKey(ctx);
  const session = sessionStore.get(key) || { timestamp: Date.now() };
  sessionStore.set(key, { ...session, ...data, timestamp: Date.now() });
}

// Helper to clear session
function clearSession(ctx: Context) {
  const key = getSessionKey(ctx);
  sessionStore.delete(key);
}

// Set bot commands
const commands = [
  { command: 'start', description: 'Start' },
  { command: 'register', description: 'Register' },
  { command: 'play', description: 'Play' },
  { command: 'deposit', description: 'Deposit' },
  { command: 'balance', description: 'Balance' },
  { command: 'withdraw', description: 'Withdrawal' },
  { command: 'invite', description: 'Referral' },
  { command: 'instructions', description: 'Instructions' },
  { command: 'support', description: 'Support' },
  { command: 'about', description: 'About' },
  { command: 'debug', description: 'Debug deposit issues' },
  { command: 'cancel', description: 'Cancel current operation' },
]

// Initialize commands
bot.telegram.setMyCommands(commands)

// Ngrok functions - Only used in development
export async function startNgrokTunnel(port: number = 3000): Promise<string> {
  // Skip ngrok in production
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Ngrok tunnel skipped in production mode')
    return process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'
  }

  if (!NGROK_AUTH_TOKEN) {
    throw new Error('NGROK_AUTH_TOKEN is required for development tunneling')
  }

  try {
    // Dynamically import ngrok only in development
    if (!ngrok) {
      ngrok = await import('@ngrok/ngrok')
    }

    // Check for existing tunnels
    try {
      const tunnels = await ngrok.tunnels()
      if (tunnels.length > 0) {
        ngrokUrl = tunnels[0].public_url
        console.log(`✅ Using existing Ngrok tunnel: ${ngrokUrl}`)
        return ngrokUrl
      }
    } catch (e) {
      console.log('No existing tunnels found, creating new one...')
    }

    // Create new tunnel
    const listener = await ngrok.connect({
      addr: port,
      authtoken: NGROK_AUTH_TOKEN,
    })
    
    ngrokUrl = listener.url()
    console.log(`✅ Ngrok tunnel started: ${ngrokUrl}`)
    
    // Set webhook
    botWebhookUrl = `${ngrokUrl}/api/webhook`
    await bot.telegram.setWebhook(botWebhookUrl)
    console.log(`✅ Webhook set to: ${botWebhookUrl}`)
    
    return ngrokUrl
  } catch (error) {
    console.error('❌ Ngrok tunnel failed:', error)
    // Return webhook URL from env if ngrok fails
    return process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'
  }
}

export async function stopNgrokTunnel(): Promise<void> {
  // Only try to stop ngrok in development
  if (process.env.NODE_ENV === 'development' && ngrok) {
    try {
      await ngrok.disconnect()
      console.log('✅ Ngrok tunnel stopped')
    } catch (error) {
      console.error('Failed to stop ngrok tunnel:', error)
    }
  }
  ngrokUrl = null
  botWebhookUrl = null
}

export function getNgrokUrl(): string | null {
  return ngrokUrl
}

export function getBotWebhookUrl(): string | null {
  return botWebhookUrl
}

// Cancel command
bot.command('cancel', async (ctx) => {
  clearSession(ctx);
  await ctx.reply('✅ Current operation cancelled. Use /deposit to start over.');
})

// Debug command to check deposit flow
bot.command('debug', async (ctx) => {
  const user = ctx.from
  const session = getSession(ctx);
  
  await ctx.reply(
    `🔍 **Debug Information**\n\n` +
    `Environment: ${process.env.NODE_ENV}\n` +
    `User ID: ${user.id}\n` +
    `Username: ${user.username || 'N/A'}\n` +
    `Chat ID: ${ctx.chat?.id}\n` +
    `WebApp URL: ${process.env.NEXT_PUBLIC_WEBAPP_URL || 'Not set'}\n\n` +
    `**Current Session:**\n` +
    `• Has active session: ${session ? 'Yes' : 'No'}\n` +
    `• Deposit Step: ${session?.depositStep || 'None'}\n` +
    `• Amount: ${session?.depositAmount || 'Not set'}\n` +
    `• Method: ${session?.depositMethod || 'Not set'}\n` +
    `• Transaction Ref: ${session?.transactionRef || 'Not set'}\n\n` +
    `**Deposit Flow Status:**\n` +
    `• Screenshot: OPTIONAL (Vercel compatible)\n` +
    `• Transaction Ref: REQUIRED\n` +
    `• Works without file upload ✅\n\n` +
    `If deposit fails, check:\n` +
    `1. You're registered (/register)\n` +
    `2. You have transaction reference\n` +
    `3. Amount is at least 10 Birr`,
    { parse_mode: 'Markdown' }
  )
})

// Start command
bot.start(async (ctx) => {
  const user = ctx.from
  const referralCode = ctx.payload // Get referral code from start parameter
  
  await ctx.reply(
    `🎉 Welcome to Habesha Bingo, ${user.first_name}!\n\n` +
    `🎮 Play exciting bingo games\n` +
    `💰 Win real money prizes\n` +
    `🎁 Get 50 Birr welcome bonus!\n\n` +
    `Use /register to create your account${referralCode ? `\n\n🔑 Referral code detected: ${referralCode}` : ''}`,
    // Markup.keyboard([
    //   ['📋 Register', '🎮 Play'],
    //   ['💰 Deposit', '🏧 Withdraw'],
    //   ['👥 Invite', '📞 Support']
    // ]).resize()
  )
})

// Register command
bot.command('register', async (ctx) => {
  const user = ctx.from
  
  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[]
    
    if (existingUser && existingUser.length > 0) {
      await ctx.reply('✅ You are already registered! Use /play to start gaming.')
      return
    }
    
    // Generate unique referral code
    let referralCode = ''
    let isUnique = false
    
    while (!isUnique) {
      referralCode = `HAB${user.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`
      const checkCode = await db.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      ) as any[]
      isUnique = !checkCode || checkCode.length === 0
    }
    
    // Insert user into database
    await db.query(
      `INSERT INTO users 
      (telegram_id, username, first_name, referral_code, is_online, last_active, balance, bonus_balance, role)
      VALUES (?, ?, ?, ?, TRUE, NOW(), 50, 10, 'user')`,
      [user.id.toString(), user.username || `user_${user.id}`, user.first_name, referralCode]
    )
    
    // Success message
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
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${ctx.botInfo.username}?start=${referralCode}`)}&text=${encodeURIComponent('Join Habesha Bingo and win real money! Use my referral code: ' + referralCode)}`),
        Markup.button.webApp('🎮 Play Now', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/')
      ])
    )
    
  } catch (error) {
    console.error('Registration error:', error)
    await ctx.reply('❌ Registration failed. Please try again or contact support.')
  }
})

// Play command - Opens Mini App
bot.command('play', async (ctx) => {
  const user = ctx.from;
  const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/';
  
  // Create Mini App URL
  const miniAppUrl = `${webAppUrl}?tgWebAppStartParam=play`;
  
  await ctx.reply(
    '🎮 Opening Habesha Bingo Mini App...\n\n' +
    'Get ready to play and win! 🏆',
    Markup.inlineKeyboard([
      Markup.button.webApp('🎮 Play Habesha Bingo', miniAppUrl)
    ])
  );
});

// DEPOSIT COMMAND - UPDATED FOR VERCEL
bot.command('deposit', async (ctx) => {
  // Clear any existing session
  clearSession(ctx);
  
  await ctx.reply(
    '💵 **Deposit Funds**\n\n' +
    '**Payment Methods:**\n\n' +
    '📱 **TeleBirr:**\n' +
    '• 0962935163 (Melsew Abebei)\n' +
    '• 0940192676 (Habesha Bingo)\n\n' +
    '🏦 **CBE Birr:**\n' +
    '• Account: 1000433547741\n' +
    '• Name: Simegnew Destaw\n\n' +
    '**📝 NEW PROCESS (Vercel Compatible):**\n' +
    '1️⃣ Send money to any number above\n' +
    '2️⃣ **COPY the Transaction Reference/ID** from your payment app\n' +
    '3️⃣ Click the button below to submit\n\n' +
    '⚠️ **Minimum deposit:** 10 Birr\n' +
    '⏱️ **Approval:** Within 1-24 hours\n\n' +
    '✅ **Screenshot is OPTIONAL - Transaction Reference is REQUIRED!**\n' +
    '✅ Works even if screenshot upload fails',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Submit Deposit with Reference', callback_data: 'start_deposit' }],
          [{ text: '💰 Quick Deposit via Web', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }],
          [{ text: '❓ How to get Transaction Ref?', callback_data: 'how_to_get_ref' }],
          [{ text: '🔍 Check Session', callback_data: 'check_session' }]
        ]
      }
    }
  )
})

// Check session
bot.action('check_session', async (ctx) => {
  await ctx.answerCbQuery()
  const session = getSession(ctx);
  
  await ctx.reply(
    `🔍 **Session Status**\n\n` +
    `Has session: ${session ? '✅ Yes' : '❌ No'}\n` +
    `Step: ${session?.depositStep || 'None'}\n` +
    `Amount: ${session?.depositAmount || 'Not set'}\n` +
    `Method: ${session?.depositMethod || 'Not set'}\n` +
    `Transaction Ref: ${session?.transactionRef || 'Not set'}\n\n` +
    `Use /cancel to clear session if stuck.`,
    { parse_mode: 'Markdown' }
  )
})

// How to get transaction reference
bot.action('how_to_get_ref', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply(
    '🔑 **How to find Transaction Reference:**\n\n' +
    '📱 **TeleBirr:**\n' +
    '• After payment, you\'ll get an SMS\n' +
    '• Look for "Transaction ID" or "Trx ID"\n' +
    '• It looks like: *TB23894723*\n\n' +
    '🏦 **CBE Birr:**\n' +
    '• Check your SMS confirmation\n' +
    '• Look for "Reference Number" or "Journal Number"\n' +
    '• It looks like: *CBE12345678*\n\n' +
    '📸 **If you can\'t find it:**\n' +
    '• Take a screenshot of the payment\n' +
    '• Send it and we\'ll extract the reference',
    { parse_mode: 'Markdown' }
  )
})

// Start deposit flow
bot.action('start_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  
  // Initialize session
  updateSession(ctx, {
    depositStep: 'method_selection',
    timestamp: Date.now()
  });
  
  await ctx.reply(
    '📝 **Step 1: Select Payment Method**\n\n' +
    'Which method did you use to send money?',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 TeleBirr', callback_data: 'deposit_method_telebirr' }],
          [{ text: '🏦 CBE Birr', callback_data: 'deposit_method_cbe' }],
          [{ text: '🔙 Cancel', callback_data: 'cancel_deposit' }]
        ]
      }
    }
  )
})

// Cancel deposit
bot.action('cancel_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  clearSession(ctx)
  await ctx.reply('❌ Deposit cancelled. Use /deposit to start over.')
})

// Handle payment method selection
bot.action(/deposit_method_(.+)/, async (ctx) => {
  await ctx.answerCbQuery()
  const method = ctx.match[1] as 'telebirr' | 'cbe'
  
  // Store method in session
  updateSession(ctx, {
    depositMethod: method,
    depositStep: 'amount_input'
  });
  
  await ctx.reply(
    `💰 **Step 2: Enter Amount**\n\n` +
    `Payment Method: *${method === 'telebirr' ? '📱 TeleBirr' : '🏦 CBE Birr'}*\n\n` +
    `Please enter the amount you sent (minimum 10 Birr):\n\n` +
    `*Example: 100*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Enter amount in Birr'
      }
    }
  )
})

// Handle text responses for deposit
bot.on('text', async (ctx) => {
  const text = ctx.message.text
  const session = getSession(ctx);
  
  // DEBUG: Log what's happening
  console.log('📝 Text received:', text)
  console.log('📝 Session state:', session)
  console.log('📝 Reply to:', ctx.message.reply_to_message?.text)
  
  // Handle amount input (when replying to amount prompt)
  if (ctx.message.reply_to_message?.text?.includes('Step 2: Enter Amount')) {
    const amount = parseFloat(text)
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply(
        '❌ **Invalid amount**\n\n' +
        'Minimum deposit is 10 Birr.\n' +
        'Please enter a valid number:',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      )
      return
    }
    
    // Store amount in session
    updateSession(ctx, {
      depositAmount: amount,
      depositStep: 'ref_input'
    });
    
    // Ask for transaction reference
    await ctx.reply(
      `🔑 **Step 3: Enter Transaction Reference**\n\n` +
      `Amount: *${amount} Birr*\n\n` +
      `Please enter the **Transaction Reference/ID** from your payment app:\n\n` +
      `📱 *For TeleBirr:* Look for "Transaction ID" in payment receipt\n` +
      `🏦 *For CBE:* Look for "Reference Number"\n\n` +
      `*Example: TB23894723 or CBE12345678*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter transaction reference'
        }
      }
    )
  }
  
  // Handle transaction reference input
  else if (ctx.message.reply_to_message?.text?.includes('Step 3: Enter Transaction Reference')) {
    const transactionRef = text.trim()
    
    if (!transactionRef || transactionRef.length < 3) {
      await ctx.reply(
        '❌ **Invalid transaction reference**\n\n' +
        'Please enter a valid reference (at least 3 characters):',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      )
      return
    }
    
    // Get stored data from session
    const amount = session?.depositAmount
    const method = session?.depositMethod
    
    if (!amount || !method) {
      await ctx.reply(
        '❌ **Session expired**\n\n' +
        'Your deposit session has expired. This happens on Vercel because sessions don\'t persist.\n\n' +
        '**Please use the web app instead:**\n' +
        'Click the button below for quick deposit that works every time!',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💰 Quick Deposit via Web', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }],
              [{ text: '🔄 Try Bot Again', callback_data: 'start_deposit' }]
            ]
          }
        }
      )
      return
    }
    
    // Store transaction ref in session
    updateSession(ctx, {
      transactionRef: transactionRef,
      depositStep: 'screenshot_option'
    });
    
    // Ask if they want to upload screenshot (optional)
    await ctx.reply(
      `📸 **Step 4: Screenshot (Optional)**\n\n` +
      `**Deposit Summary:**\n` +
      `• Amount: *${amount} Birr*\n` +
      `• Method: *${method === 'telebirr' ? '📱 TeleBirr' : '🏦 CBE Birr'}*\n` +
      `• Transaction Ref: *${transactionRef}*\n\n` +
      `📸 **Screenshot is OPTIONAL**\n\n` +
      `*Since we're on Vercel, screenshot upload might fail sometimes.*\n` +
      `*Your deposit will be saved even without screenshot!*\n\n` +
      `Choose an option:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📸 Upload Screenshot (Optional)', callback_data: 'deposit_upload_screenshot' }],
            [{ text: '✅ Submit with Reference Only', callback_data: 'deposit_submit_without_screenshot' }],
            [{ text: '🔙 Cancel', callback_data: 'cancel_deposit' }]
          ]
        }
      }
    )
  }
})

// Handle screenshot upload option
bot.action('deposit_upload_screenshot', async (ctx) => {
  await ctx.answerCbQuery()
  const session = getSession(ctx);
  
  updateSession(ctx, {
    depositStep: 'waiting_screenshot'
  });
  
  await ctx.reply(
    '📸 **Upload Screenshot (Optional)**\n\n' +
    'Send the payment screenshot now.\n\n' +
    '⚠️ **If upload fails, your deposit will still be saved!**\n\n' +
    '👉 To skip screenshot, type /skip',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true
      }
    }
  )
  
  // Set a timeout to auto-submit after 2 minutes
  setTimeout(async () => {
    const currentSession = sessionStore.get(getSessionKey(ctx));
    if (currentSession?.depositStep === 'waiting_screenshot' && 
        currentSession?.depositAmount && 
        currentSession?.transactionRef) {
      await submitDeposit(ctx, null, '⏱️ Auto-submitted (timeout)')
    }
  }, 120000) // 2 minutes
})

// Handle skip command
bot.command('skip', async (ctx) => {
  const session = getSession(ctx);
  
  // Check if we're in deposit flow
  if (session?.depositAmount && session?.transactionRef) {
    await submitDeposit(ctx, null, '⏭️ Skipped screenshot')
  } else {
    await ctx.reply('No pending deposit to skip.')
  }
})

// Submit without screenshot
bot.action('deposit_submit_without_screenshot', async (ctx) => {
  await ctx.answerCbQuery()
  await submitDeposit(ctx, null, '✅ Submitted with reference only')
})

// Handle photo upload (screenshot)
bot.on('photo', async (ctx) => {
  console.log('📸 Photo received from user:', ctx.from.id)
  const session = getSession(ctx);
  
  // Check if we're in deposit flow
  if (!session?.depositAmount || !session?.transactionRef) {
    await ctx.reply(
      '⚠️ No pending deposit found.\n\n' +
      'Please start a deposit first with /deposit',
      Markup.inlineKeyboard([
        [{ text: '📤 Start Deposit', callback_data: 'start_deposit' }]
      ])
    )
    return
  }
  
  // Send typing indicator (user sees bot is processing)
  await ctx.sendChatAction('typing')
  
  try {
    // Get the largest photo (best quality)
    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    const fileId = photo.file_id
    
    console.log('📸 Processing photo, file_id:', fileId)
    
    // Get file URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId)
    const screenshotUrl = fileLink.href
    
    console.log('📸 Got file link:', screenshotUrl)
    
    // Submit deposit with screenshot
    await submitDeposit(ctx, screenshotUrl, '📸 With screenshot')
    
  } catch (error) {
    console.error('❌ Screenshot upload error:', error)
    
    // Even if screenshot fails, still submit with reference only
    await ctx.reply(
      '⚠️ **Screenshot upload failed**\n\n' +
      `Error: ${error.message || 'Unknown error'}\n\n` +
      'But don\'t worry! Your deposit will still be processed using the transaction reference.',
      { parse_mode: 'Markdown' }
    )
    
    await submitDeposit(ctx, null, '⚠️ Screenshot failed - using ref only')
  }
})

// Helper function to submit deposit
async function submitDeposit(ctx: any, screenshotUrl: string | null, sourceNote: string = '') {
  try {
    // Send typing indicator
    await ctx.sendChatAction('typing')
    
    const session = getSession(ctx);
    const telegramId = ctx.from.id.toString()
    const amount = session?.depositAmount
    const method = session?.depositMethod
    const transactionRef = session?.transactionRef
    
    console.log('💾 Submitting deposit:', { telegramId, amount, method, transactionRef, screenshotUrl, sourceNote })
    
    if (!amount || !method || !transactionRef) {
      console.log('❌ Missing deposit info:', { amount, method, transactionRef })
      await ctx.reply(
        '❌ **Missing deposit information**\n\n' +
        'Please start over with /deposit',
        Markup.inlineKeyboard([
          [{ text: '📤 Start New Deposit', callback_data: 'start_deposit' }],
          [{ text: '💰 Use Web App Instead', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }]
        ])
      )
      return
    }
    
    // Get user's UUID from database
    console.log('🔍 Looking up user by telegram_id:', telegramId)
    const users = await db.query(
      'SELECT id, username, balance FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[]
    
    console.log('📊 User lookup result:', users)
    
    if (!users || users.length === 0) {
      await ctx.reply(
        '❌ **You are not registered**\n\n' +
        'Please use /register first to create an account.',
        Markup.inlineKeyboard([
          [{ text: '📝 Register Now', callback_data: 'start_register' }]
        ])
      )
      return
    }
    
    const userUuid = users[0].id
    
    // Insert deposit record - screenshot_url can be NULL
    console.log('💾 Inserting deposit record...')
    const insertResult = await db.query(
      `INSERT INTO deposits 
      (user_id, amount, method, transaction_ref, screenshot_url, status) 
      VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userUuid, amount, method, transactionRef, screenshotUrl]
    )
    
    console.log('✅ Deposit inserted successfully:', insertResult)
    
    // Clear session after successful submission
    clearSession(ctx);
    
    // Success message
    let successMessage = 
      `✅ **Deposit Request Submitted!**\n\n` +
      `💰 **Amount:** ${amount} Birr\n` +
      `🔑 **Transaction Ref:** \`${transactionRef}\`\n` +
      `📱 **Method:** ${method === 'telebirr' ? 'TeleBirr' : 'CBE Birr'}\n` +
      `⏱️ **Status:** Pending Approval\n\n`
    
    if (screenshotUrl) {
      successMessage += `📸 Screenshot received ✅\n`
    } else {
      successMessage += `📝 *Submitted with transaction reference only*\n`
    }
    
    if (sourceNote) {
      successMessage += `${sourceNote}\n`
    }
    
    successMessage += `\n**What happens next?**\n` +
      `1️⃣ Admin will verify your transaction using the reference number\n` +
      `2️⃣ If approved, balance will be added within 1-24 hours\n` +
      `3️⃣ You'll receive a notification\n\n` +
      `📞 Need help? Contact @HabeshaBingoSupport`
    
    await ctx.reply(successMessage, { parse_mode: 'Markdown' })
    
    // Notify admins
    await notifyAdminsOfDeposit(ctx, userUuid, amount, method, transactionRef, screenshotUrl, users[0].username)
    
  } catch (error) {
    console.error('❌ Deposit submission error:', error)
    
    // Detailed error message for user
    let errorMessage = '❌ **Failed to submit deposit**\n\n'
    
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage += 'This transaction reference already exists in our system.\n\n'
    } else if (error.code === 'ER_NO_REFERENCE') {
      errorMessage += 'Database connection error.\n\n'
    } else {
      errorMessage += `Error: ${error.message || 'Unknown error'}\n\n`
    }
    
    errorMessage += 'Please try again or use the web app.\n' +
      'Save your transaction reference for manual verification.'
    
    await ctx.reply(
      errorMessage,
      Markup.inlineKeyboard([
        [{ text: '🔄 Try Again', callback_data: 'start_deposit' }],
        [{ text: '💰 Use Web App', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }],
        [{ text: '📞 Contact Support', url: 'https://t.me/HabeshaBingoSupport' }]
      ])
    )
  }
}

// Notify admins
async function notifyAdminsOfDeposit(ctx: any, userId: string, amount: number, method: string, transactionRef: string, screenshotUrl: string | null, username: string) {
  try {
    console.log('🔔 Notifying admins...')
    
    // Get admin chat IDs from database
    const admins = await db.query(
      'SELECT telegram_id FROM users WHERE role IN ("admin", "superadmin") AND telegram_id IS NOT NULL'
    ) as any[]
    
    console.log(`👥 Found ${admins.length} admins to notify`)
    
    for (const admin of admins) {
      try {
        await ctx.telegram.sendMessage(
          admin.telegram_id,
          `🔔 **New Deposit Request**\n\n` +
          `👤 User: ${username || 'Unknown'} (${userId})\n` +
          `💰 Amount: ${amount} Birr\n` +
          `📱 Method: ${method}\n` +
          `🔑 Transaction Ref: \`${transactionRef}\`\n` +
          `📸 Screenshot: ${screenshotUrl ? '✅ Uploaded' : '❌ Not provided'}\n` +
          `🕐 Time: ${new Date().toLocaleString()}\n\n` +
          `Check admin panel to approve/reject.`,
          { parse_mode: 'Markdown' }
        )
        console.log(`✅ Notified admin: ${admin.telegram_id}`)
      } catch (e) {
        console.error(`❌ Failed to notify admin ${admin.telegram_id}:`, e)
      }
    }
  } catch (error) {
    console.error('Admin notification error:', error)
  }
}

// Balance command
bot.command('balance', async (ctx) => {
  try {
    // Get user balance from database
    const users = await db.query(
      'SELECT balance, bonus_balance FROM users WHERE telegram_id = ?',
      [ctx.from.id.toString()]
    ) as any[]
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered. Use /register first.')
      return
    }
    
    const user = users[0]
    
    await ctx.reply(
      `💰 **Your Wallet**\n\n` +
      `💳 Main Balance: *${user.balance} Birr*\n` +
      `🎁 Bonus Balance: *${user.bonus_balance} Birr*\n` +
      `🎯 Total Balance: *${user.balance + user.bonus_balance} Birr*\n\n` +
      `💸 Use /deposit to add funds\n` +
      `🏧 Use /withdraw to cash out`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💸 Quick Deposit', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }],
            [{ text: '🏧 Quick Withdraw', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/withdraw' } }]
          ]
        }
      }
    )
  } catch (error) {
    console.error('Balance error:', error)
    await ctx.reply('❌ Error fetching balance. Please try again.')
  }
})

// Withdraw command
bot.command('withdraw', async (ctx) => {
  await ctx.reply(
    '🏧 **Withdraw Funds**\n\n' +
    '💰 Available Balance: Check /balance\n' +
    '📝 Minimum Withdrawal: 10 Birr\n' +
    '⏱️ Processing Time: 1-24 hours\n\n' +
    'Please send:\n' +
    '1️⃣ Amount (Birr)\n' +
    '2️⃣ Account number\n\n' +
    '**Example:**\n' +
    '`50\n0911-123-4567`\n\n' +
    'Send in this format:',
    {
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true }
    }
  )
})

// Invite command
bot.command('invite', async (ctx) => {
  try {
    // Get user's referral code from database
    const users = await db.query(
      'SELECT referral_code FROM users WHERE telegram_id = ?',
      [ctx.from.id.toString()]
    ) as any[]
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered. Use /register first.')
      return
    }
    
    const referralCode = users[0].referral_code
    const referralLink = `https://t.me/${ctx.botInfo.username}?start=${referralCode}`
    
    await ctx.reply(
      `👥 **Refer & Earn**\n\n` +
      `🎁 Earn 10 Birr for each friend who joins!\n\n` +
      `🔑 Your Referral Code: \`${referralCode}\`\n\n` +
      `📱 Share this link:\n` +
      `${referralLink}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Share on Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Habesha Bingo and win real money! Use my referral code: ' + referralCode)}` }],
            [{ text: '📊 My Referrals', callback_data: 'view_referrals' }]
          ]
        }
      }
    )
  } catch (error) {
    console.error('Invite error:', error)
    await ctx.reply('❌ Error fetching referral info. Please try again.')
  }
})

// Callback handlers
bot.action('submit_deposit', async (ctx) => {
  await ctx.answerCbQuery()
  await ctx.reply(
    '📸 **Please send the payment screenshot**\n\n' +
    'Or if you have transaction reference, use /deposit instead.',
    { parse_mode: 'Markdown' }
  )
})

bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery()
  try {
    // Get referral count from database
    const result = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE referred_by = (SELECT id FROM users WHERE telegram_id = ?)',
      [ctx.from.id.toString()]
    ) as any[]
    
    const referralCount = result && result[0]?.count || 0
    
    await ctx.reply(
      `📊 **Referral Statistics:**\n\n` +
      `👥 Total Referrals: *${referralCount}*\n` +
      `💰 Total Earned: *${referralCount * 10} Birr*\n` +
      `🏆 Keep referring to earn more!`,
      { parse_mode: 'Markdown' }
    )
  } catch (error) {
    console.error('Referral stats error:', error)
    await ctx.reply('❌ Error fetching referral statistics.')
  }
})

// Handle photo for deposit (legacy)
bot.on('photo', async (ctx) => {
  // This is handled above, but keeping as fallback
  const session = getSession(ctx);
  if (!session?.depositAmount) {
    await ctx.reply(
      '📸 Screenshot received!\n\n' +
      'To submit a deposit with this screenshot, please use /deposit command first.',
      Markup.inlineKeyboard([
        [{ text: '📤 Start Deposit', callback_data: 'start_deposit' }]
      ])
    )
  }
})

// Handle text responses (legacy deposit flow - kept for backward compatibility)
bot.on('text', async (ctx) => {
  const text = ctx.message.text
  
  // Handle deposit amount (legacy)
  if (ctx.message.reply_to_message?.text?.includes('deposit amount')) {
    const amount = parseFloat(text)
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply('❌ Invalid amount. Minimum deposit is 10 Birr.\nPlease use /deposit for the new flow.')
      return
    }
    
    await ctx.reply(
      '⚠️ **Legacy deposit flow detected**\n\n' +
      'Please use the new deposit flow with /deposit command.\n' +
      'It requires transaction reference and works better on Vercel.',
      Markup.inlineKeyboard([
        [{ text: '📤 Use New Deposit Flow', callback_data: 'start_deposit' }]
      ])
    )
  }
  
  // Handle withdrawal details
  if (ctx.message.reply_to_message?.text?.includes('Withdraw Funds')) {
    const lines = text.split('\n')
    
    if (lines.length < 2) {
      await ctx.reply('❌ Invalid format. Please send:\nAmount\nAccountNumber')
      return
    }
    
    const amount = parseFloat(lines[0])
    const accountNumber = lines[1].trim()
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply('❌ Invalid amount. Minimum 10 Birr.')
      return
    }
    
    // Check if user has sufficient balance
    try {
      const users = await db.query(
        'SELECT balance FROM users WHERE telegram_id = ?',
        [ctx.from.id.toString()]
      ) as any[]
      
      if (!users || users.length === 0) {
        await ctx.reply('❌ You are not registered. Use /register first.')
        return
      }
      
      if (users[0].balance < amount) {
        await ctx.reply('❌ Insufficient balance. Please check /balance')
        return
      }
      
      // Create withdrawal record in database
      await db.query(
        'INSERT INTO withdrawals (telegram_id, amount, account_number, status, created_at) VALUES (?, ?, ?, "pending", NOW())',
        [ctx.from.id.toString(), amount, accountNumber]
      )
      
      await ctx.reply(
        `✅ **Withdrawal Request Submitted!**\n\n` +
        `💰 Amount: *${amount} Birr*\n` +
        `📱 Account: \`${accountNumber}\`\n` +
        `⏱️ Status: Pending approval\n\n` +
        `You'll be notified once approved.`,
        { parse_mode: 'Markdown' }
      )
    } catch (error) {
      console.error('Withdrawal error:', error)
      await ctx.reply('❌ Failed to process withdrawal. Please try again.')
    }
  }
})

// Error handling
bot.catch((err: any, ctx: Context) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err)
  
  // Send user-friendly error message
  ctx.reply(
    '❌ **An error occurred**\n\n' +
    `Error: ${err.message || 'Unknown error'}\n\n` +
    'Please try again or contact support if the issue persists.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📞 Contact Support', url: 'https://t.me/HabeshaBingoSupport' }],
          [{ text: '💰 Use Web App', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }]
        ]
      }
    }
  ).catch(e => console.error('Failed to send error message:', e))
})

// Start bot
export async function startBot() {
  try {
    console.log('🤖 Starting Habesha Bingo Bot...')
    console.log('📝 Environment:', process.env.NODE_ENV)
    console.log('📝 WebApp URL:', process.env.NEXT_PUBLIC_WEBAPP_URL)
    
    // Only try ngrok in development
    if (process.env.NODE_ENV === 'development') {
      const tunnelUrl = await startNgrokTunnel(3000)
      console.log(`✅ Ngrok URL: ${tunnelUrl}`)
    } else {
      // In production, use the production webhook URL
      const webhookUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'}/api/webhook`
      await bot.telegram.setWebhook(webhookUrl)
      console.log(`✅ Production webhook set to: ${webhookUrl}`)
    }
    
    // Launch bot
    await bot.launch()
    console.log('✅ Bot is running!')
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
    
    return bot
  } catch (error) {
    console.error('❌ Failed to start bot:', error)
    throw error
  }
}

export async function stopBot() {
  await bot.stop()
  if (process.env.NODE_ENV === 'development') {
    await stopNgrokTunnel()
  }
  console.log('✅ Bot stopped')
}

// Export bot for server-side use
export { bot }