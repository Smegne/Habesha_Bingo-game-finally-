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
const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [] // Comma-separated admin IDs

let ngrokUrl: string | null = null
let botWebhookUrl: string | null = null
export const bot = new Telegraf(BOT_TOKEN)

// Simple in-memory session store (works for single instance)
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

// Helper to check if user is admin
function isAdmin(telegramId: string): boolean {
  return ADMIN_IDS.includes(telegramId);
}

// Set bot commands
const commands = [
  { command: 'start', description: 'Start' },
  { command: 'register', description: 'register' },
  { command: 'play', description: ' Play bingo' },
  { command: 'deposit', description: ' Deposit' },
  { command: 'balance', description: 'balance' },
  { command: 'withdraw', description: 'Withdraw' },
  { command: 'invite', description: 'Invite ' },
  { command: 'instructions', description: 'How to play' },
  { command: 'support', description: 'support' },
  { command: 'about', description: ' About ' },
  { command: 'history', description: 'Transaction ' },
  { command: 'profile', description: 'profile' },
  { command: 'cancel', description: '❌ Cancel current operation' },
  { command: 'menu', description: 'main menu' },
]

// Admin commands (only visible to admins)
if (ADMIN_IDS.length > 0) {
  commands.push(
    { command: 'admin', description: '👑 Admin panel' },
    { command: 'pending_deposits', description: '⏳ View pending deposits' },
    { command: 'pending_withdrawals', description: '⏳ View pending withdrawals' }
  );
}

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
  await ctx.reply(
    '✅ Current operation cancelled.',
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Main Menu', 'show_menu')]
    ])
  );
})

// Menu command
bot.command('menu', async (ctx) => {
  await showMainMenu(ctx);
})

// Show main menu function
async function showMainMenu(ctx: any) {
  const user = ctx.from;
  const isRegistered = await checkUserRegistered(user.id.toString());
  
  let welcomeText = `📋 **Main Menu**\n\n`;
  
  if (isRegistered) {
    welcomeText += `Welcome back, ${user.first_name}! 👋\nChoose an option below:`;
  } else {
    welcomeText += `Welcome to Habesha Bingo, ${user.first_name}! 🎉\nPlease register first to start playing.`;
  }
  
  const keyboard = isRegistered ? {
    inline_keyboard: [
      [
        { text: '🎮 Play Game', callback_data: 'menu_play' },
        { text: '💰 Deposit', callback_data: 'menu_deposit' }
      ],
      [
        { text: '💳 Balance', callback_data: 'menu_balance' },
        { text: '🏧 Withdraw', callback_data: 'menu_withdraw' }
      ],
      [
        { text: '👥 Referrals', callback_data: 'menu_invite' },
        { text: '📖 Instructions', callback_data: 'menu_instructions' }
      ],
      [
        { text: '📜 History', callback_data: 'menu_history' },
        { text: '👤 Profile', callback_data: 'menu_profile' }
      ],
      [
        { text: '📞 Support', callback_data: 'menu_support' },
        { text: 'ℹ️ About', callback_data: 'menu_about' }
      ]
    ]
  } : {
    inline_keyboard: [
      [{ text: '📝 Register Now', callback_data: 'menu_register' }],
      [{ text: '📖 Instructions', callback_data: 'menu_instructions' }],
      [{ text: 'ℹ️ About', callback_data: 'menu_about' }]
    ]
  };
  
  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Menu callbacks
bot.action('show_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await showMainMenu(ctx);
});

bot.action('menu_play', async (ctx) => {
  await ctx.answerCbQuery();
  await executePlayCommand(ctx);
});

bot.action('menu_deposit', async (ctx) => {
  await ctx.answerCbQuery();
  await executeDepositCommand(ctx);
});

bot.action('menu_balance', async (ctx) => {
  await ctx.answerCbQuery();
  await executeBalanceCommand(ctx);
});

bot.action('menu_withdraw', async (ctx) => {
  await ctx.answerCbQuery();
  await executeWithdrawCommand(ctx);
});

bot.action('menu_invite', async (ctx) => {
  await ctx.answerCbQuery();
  await executeInviteCommand(ctx);
});

bot.action('menu_instructions', async (ctx) => {
  await ctx.answerCbQuery();
  await executeInstructionsCommand(ctx);
});

bot.action('menu_history', async (ctx) => {
  await ctx.answerCbQuery();
  await executeHistoryCommand(ctx);
});

bot.action('menu_profile', async (ctx) => {
  await ctx.answerCbQuery();
  await executeProfileCommand(ctx);
});

bot.action('menu_support', async (ctx) => {
  await ctx.answerCbQuery();
  await executeSupportCommand(ctx);
});

bot.action('menu_about', async (ctx) => {
  await ctx.answerCbQuery();
  await executeAboutCommand(ctx);
});

bot.action('menu_register', async (ctx) => {
  await ctx.answerCbQuery();
  await executeRegisterCommand(ctx);
});

// Helper function to check if user is registered
async function checkUserRegistered(telegramId: string): Promise<boolean> {
  try {
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[];
    return users && users.length > 0;
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false;
  }
}

// Helper function to get user data
async function getUserData(telegramId: string) {
  try {
    const users = await db.query(
      'SELECT id, username, first_name, balance, bonus_balance, referral_code, role, created_at FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[];
    return users && users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Start command
bot.start(async (ctx) => {
  const user = ctx.from;
  const referralCode = ctx.payload;
  
  // Check if user is already registered
  const isRegistered = await checkUserRegistered(user.id.toString());
  
  if (isRegistered) {
    await ctx.reply(
      `🎉 Welcome back to Habesha Bingo, ${user.first_name}!\n\n` +
      `Use /menu to see all options or /play to start gaming!`,
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Show Menu', 'show_menu')],
        [Markup.button.webApp('🎮 Play Now', process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/')]
      ])
    );
  } else {
    await ctx.reply(
      `🎉 Welcome to Habesha Bingo, ${user.first_name}!\n\n` +
      `🎮 Play exciting bingo games\n` +
      `💰 Win real money prizes\n` +
      `🎁 Get 50 Birr welcome bonus!\n\n` +
      `Use /register to create your account${referralCode ? `\n\n🔑 Referral code detected: ${referralCode}` : ''}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('📝 Register Now', 'menu_register')],
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
})

// Register command execution
async function executeRegisterCommand(ctx: any) {
  const user = ctx.from;
  
  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (existingUser && existingUser.length > 0) {
      await ctx.reply(
        '✅ You are already registered!',
        Markup.inlineKeyboard([
          [Markup.button.callback('🎮 Play Game', 'menu_play')],
          [Markup.button.callback('📋 Main Menu', 'show_menu')]
        ])
      );
      return;
    }
    
    // Generate unique referral code
    let referralCode = '';
    let isUnique = false;
    
    while (!isUnique) {
      referralCode = `HAB${user.id.toString().slice(-6)}${Date.now().toString(36).toUpperCase()}`;
      const checkCode = await db.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [referralCode]
      ) as any[];
      isUnique = !checkCode || checkCode.length === 0;
    }
    
    // Insert user into database
    await db.query(
      `INSERT INTO users 
      (telegram_id, username, first_name, referral_code, is_online, last_active, balance, bonus_balance, role)
      VALUES (?, ?, ?, ?, TRUE, NOW(), 50, 10, 'user')`,
      [user.id.toString(), user.username || `user_${user.id}`, user.first_name, referralCode]
    );
    
    // Success message
    await ctx.reply(
      `✅ **Registration Successful!**\n\n` +
      `🎉 Welcome ${user.first_name} to Habesha Bingo!\n\n` +
      `💰 You received **50 Birr** welcome bonus!\n` +
      `🎁 Plus **10 Birr** bonus balance!\n\n` +
      `🔑 Your Referral Code: \`${referralCode}\`\n` +
      `Share it to earn 10 Birr per friend!\n\n` +
      `📱 Share: https://t.me/${ctx.botInfo.username}?start=${referralCode}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Share on Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${ctx.botInfo.username}?start=${referralCode}`)}&text=${encodeURIComponent('Join Habesha Bingo and win real money! Use my referral code: ' + referralCode)}` }],
            [{ text: '🎮 Play Now', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/' } }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply(
      '❌ Registration failed. Please try again or contact support.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Try Again', 'menu_register')],
        [Markup.button.callback('📞 Contact Support', 'menu_support')]
      ])
    );
  }
}

// Register command
bot.command('register', async (ctx) => {
  await executeRegisterCommand(ctx);
});

// Play command execution
async function executePlayCommand(ctx: any) {
  const user = ctx.from;
  const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/';
  
  // Check if user is registered
  const isRegistered = await checkUserRegistered(user.id.toString());
  
  if (!isRegistered) {
    await ctx.reply(
      '❌ You need to register first!',
      Markup.inlineKeyboard([
        [Markup.button.callback('📝 Register Now', 'menu_register')]
      ])
    );
    return;
  }
  
  const miniAppUrl = `${webAppUrl}?tgWebAppStartParam=play`;
  
  await ctx.reply(
    '🎮 **Opening Habesha Bingo Mini App...**\n\n' +
    'Get ready to play and win! 🏆',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play Habesha Bingo', web_app: { url: miniAppUrl } }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// Play command
bot.command('play', async (ctx) => {
  await executePlayCommand(ctx);
});

// Balance command execution
async function executeBalanceCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    // Check if user is registered
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply(
        '❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register Now', 'menu_register')]
        ])
      );
      return;
    }
    
    // Get user balance from database
    const userData = await getUserData(user.id.toString());
    
    if (!userData) {
      await ctx.reply('❌ Error fetching user data. Please try again.');
      return;
    }
    
    // Get pending deposits
    const pendingDeposits = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = "pending"',
      [userData.id]
    ) as any[];
    
    // Get pending withdrawals
    const pendingWithdrawals = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status = "pending"',
      [userData.id]
    ) as any[];
    
    const pendingDepositTotal = pendingDeposits[0]?.total || 0;
    const pendingWithdrawalTotal = pendingWithdrawals[0]?.total || 0;
    
    // Get approved deposits total
    const approvedDeposits = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = "approved"',
      [userData.id]
    ) as any[];
    
    // Get approved withdrawals total
    const approvedWithdrawals = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status = "approved"',
      [userData.id]
    ) as any[];
    
    await ctx.reply(
      `💰 **Your Wallet**\n\n` +
      `💳 **Main Balance:** *${userData.balance + approvedDeposits[0]?.total} Birr*\n` +
      `🎁 **Bonus Balance:** *${userData.bonus_balance} Birr*\n` +
      `🎯 **Total Balance:** *${userData.balance + userData.bonus_balance} Birr*\n\n` +
      `⏳ **Pending Deposits:** *${pendingDepositTotal} Birr*\n` +
      `⏳ **Pending Withdrawals:** *${pendingWithdrawalTotal} Birr*\n\n` +
      `📊 **Statistics:**\n` +
      `• Total Deposited (Approved): ${approvedDeposits[0]?.total || 0} Birr\n` +
      `• Total Withdrawn (Approved): ${approvedWithdrawals[0]?.total || 0} Birr\n` +
      `• Member since: ${new Date(userData.created_at).toLocaleDateString()}\n` +
      `• Account type: ${userData.role === 'admin' ? '👑 Admin' : '👤 User'}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💰 Deposit', callback_data: 'menu_deposit' },
              { text: '🏧 Withdraw', callback_data: 'menu_withdraw' }
            ],
            [
              { text: '📜 History', callback_data: 'menu_history' },
              { text: '📋 Main Menu', callback_data: 'show_menu' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Balance error:', error);
    await ctx.reply(
      '❌ Error fetching balance. Please try again.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Try Again', 'menu_balance')],
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
}

// Balance command
bot.command('balance', async (ctx) => {
  await executeBalanceCommand(ctx);
});

// Deposit command execution
async function executeDepositCommand(ctx: any) {
  // Clear any existing session
  clearSession(ctx);
  
  // Check if user is registered
  const isRegistered = await checkUserRegistered(ctx.from.id.toString());
  
  if (!isRegistered) {
    await ctx.reply(
      '❌ You need to register first!',
      Markup.inlineKeyboard([
        [Markup.button.callback('📝 Register Now', 'menu_register')]
      ])
    );
    return;
  }
  
  await ctx.reply(
    '💵 **Deposit Funds**\n\n' +
    '**Payment Methods:**\n\n' +
    '📱 **TeleBirr:**\n' +
    '• 0962935163 (Melsew Abebei)\n' +
    '• 0940192676 (Habesha Bingo)\n\n' +
    '🏦 **CBE Birr:**\n' +
    '• Account: 1000433547741\n' +
    '• Name: Simegnew Destaw\n\n' +
    '**📝 Process:**\n' +
    '1️⃣ Send money to any number above\n' +
    '2️⃣ **COPY the Transaction Reference/ID** from your payment app\n' +
    '3️⃣ Click the button below to submit\n\n' +
    '⚠️ **Minimum deposit:** 10 Birr\n' +
    '⏱️ **Approval:** Within 1-24 hours\n\n' +
    '✅ **Screenshot is OPTIONAL - Transaction Reference is REQUIRED!**',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Submit Deposit with Reference', callback_data: 'start_deposit' }],
          [{ text: '💰 Quick Deposit via Web', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }],
          [{ text: '❓ How to get Transaction Ref?', callback_data: 'how_to_get_ref' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// Deposit command
bot.command('deposit', async (ctx) => {
  await executeDepositCommand(ctx);
});

// How to get transaction reference
bot.action('how_to_get_ref', async (ctx) => {
  await ctx.answerCbQuery();
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
    { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Start Deposit', callback_data: 'start_deposit' }]
        ]
      }
    }
  );
});

// Start deposit flow
bot.action('start_deposit', async (ctx) => {
  await ctx.answerCbQuery();
  
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
  );
});

// Cancel deposit
bot.action('cancel_deposit', async (ctx) => {
  await ctx.answerCbQuery();
  clearSession(ctx);
  await ctx.reply(
    '❌ Deposit cancelled.',
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Main Menu', 'show_menu')]
    ])
  );
});

// Handle payment method selection
bot.action(/deposit_method_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const method = ctx.match[1] as 'telebirr' | 'cbe';
  
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
  );
});

// Handle text responses for deposit
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const session = getSession(ctx);
  
  // Handle amount input (when replying to amount prompt)
  if (ctx.message.reply_to_message?.text?.includes('Step 2: Enter Amount')) {
    const amount = parseFloat(text);
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply(
        '❌ **Invalid amount**\n\n' +
        'Minimum deposit is 10 Birr.\n' +
        'Please enter a valid number:',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      );
      return;
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
    );
  }
  
  // Handle transaction reference input
  else if (ctx.message.reply_to_message?.text?.includes('Step 3: Enter Transaction Reference')) {
    const transactionRef = text.trim();
    
    if (!transactionRef || transactionRef.length < 3) {
      await ctx.reply(
        '❌ **Invalid transaction reference**\n\n' +
        'Please enter a valid reference (at least 3 characters):',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      );
      return;
    }
    
    // Get stored data from session
    const amount = session?.depositAmount;
    const method = session?.depositMethod;
    
    if (!amount || !method) {
      await ctx.reply(
        '❌ **Session expired**\n\n' +
        'Your deposit session has expired. Please start over.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📤 Start New Deposit', callback_data: 'start_deposit' }],
              [{ text: '💰 Use Web App', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }]
            ]
          }
        }
      );
      return;
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
    );
  }
});

// Handle screenshot upload option
// bot.action('deposit_upload_screenshot', async (ctx) => {
//   await ctx.answerCbQuery();
  
//   updateSession(ctx, {
//     depositStep: 'waiting_screenshot'
//   });
  
//   await ctx.reply(
//     '📸 **Upload Screenshot (Optional)**\n\n' +
//     'Send the payment screenshot now.\n\n' +
//     '⚠️ **If upload fails, your deposit will still be saved!**\n\n' +
//     '👉 To skip screenshot, type /skip',
//     {
//       parse_mode: 'Markdown',
//       reply_markup: {
//         force_reply: true
//       }
//     }
//   );
  
//   // Set a timeout to auto-submit after 2 minutes
//   setTimeout(async () => {
//     const currentSession = sessionStore.get(getSessionKey(ctx));
//     if (currentSession?.depositStep === 'waiting_screenshot' && 
//         currentSession?.depositAmount && 
//         currentSession?.transactionRef) {
//       await submitDeposit(ctx, null, '⏱️ Auto-submitted (timeout)');
//     }
//   }, 120000); // 2 minutes
// });

// Handle skip command
// bot.command('skip', async (ctx) => {
//   const session = getSession(ctx);
  
//   // Check if we're in deposit flow
//   if (session?.depositAmount && session?.transactionRef) {
//     await submitDeposit(ctx, null, '⏭️ Skipped screenshot');
//   } else {
//     await ctx.reply('No pending deposit to skip.');
//   }
// });

// Submit without screenshot
// bot.action('deposit_submit_without_screenshot', async (ctx) => {
//   await ctx.answerCbQuery();
//   await submitDeposit(ctx, null, '✅ Submitted with reference only');
// });

// Handle photo upload (screenshot)
// bot.on('photo', async (ctx) => {
//   console.log('📸 Photo received from user:', ctx.from.id);
//   const session = getSession(ctx);
  
//   // Check if we're in deposit flow
//   if (!session?.depositAmount || !session?.transactionRef) {
//     await ctx.reply(
//       '⚠️ No pending deposit found.\n\n' +
//       'Please start a deposit first with /deposit',
//       Markup.inlineKeyboard([
//         [{ text: '📤 Start Deposit', callback_data: 'start_deposit' }]
//       ])
//     );
//     return;
//   }
  
//   // Send typing indicator
//   await ctx.sendChatAction('typing');
  
//   try {
//     // Get the largest photo (best quality)
//     const photo = ctx.message.photo[ctx.message.photo.length - 1];
//     const fileId = photo.file_id;
    
//     console.log('📸 Processing photo, file_id:', fileId);
    
//     // Get file URL from Telegram
//     const fileLink = await ctx.telegram.getFileLink(fileId);
//     const screenshotUrl = fileLink.href;
    
//     console.log('📸 Got file link:', screenshotUrl);
    
//     // Submit deposit with screenshot
//     await submitDeposit(ctx, screenshotUrl, '📸 With screenshot');
    
//   } catch (error) {
//     console.error('❌ Screenshot upload error:', error);
    
//     // Even if screenshot fails, still submit with reference only
//     await ctx.reply(
//       '⚠️ **Screenshot upload failed**\n\n' +
//       `Error: ${error.message || 'Unknown error'}\n\n` +
//       'But don\'t worry! Your deposit will still be processed using the transaction reference.',
//       { parse_mode: 'Markdown' }
//     );
    
//     await submitDeposit(ctx, null, '⚠️ Screenshot failed - using ref only');
//   }
// });

// Helper function to submit deposit
async function submitDeposit(ctx: any, screenshotUrl: string | null, sourceNote: string = '') {
  try {
    // Send typing indicator
    await ctx.sendChatAction('typing');
    
    const session = getSession(ctx);
    const telegramId = ctx.from.id.toString();
    const amount = session?.depositAmount;
    const method = session?.depositMethod;
    const transactionRef = session?.transactionRef;
    
    console.log('💾 Submitting deposit:', { telegramId, amount, method, transactionRef, screenshotUrl, sourceNote });
    
    if (!amount || !method || !transactionRef) {
      console.log('❌ Missing deposit info:', { amount, method, transactionRef });
      await ctx.reply(
        '❌ **Missing deposit information**\n\n' +
        'Please start over with /deposit',
        Markup.inlineKeyboard([
          [{ text: '📤 Start New Deposit', callback_data: 'start_deposit' }],
          [{ text: '💰 Use Web App', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }]
        ])
      );
      return;
    }
    
    // Get user's UUID from database
    console.log('🔍 Looking up user by telegram_id:', telegramId);
    const users = await db.query(
      'SELECT id, username, balance FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[];
    
    console.log('📊 User lookup result:', users);
    
    if (!users || users.length === 0) {
      await ctx.reply(
        '❌ **You are not registered**\n\n' +
        'Please use /register first to create an account.',
        Markup.inlineKeyboard([
          [{ text: '📝 Register Now', callback_data: 'menu_register' }]
        ])
      );
      return;
    }
    
    const userUuid = users[0].id;
    
    // Check if transaction ref already exists
    const existingDeposit = await db.query(
      'SELECT id FROM deposits WHERE transaction_ref = ?',
      [transactionRef]
    ) as any[];
    
    if (existingDeposit && existingDeposit.length > 0) {
      await ctx.reply(
        '❌ **Duplicate Transaction Reference**\n\n' +
        'This transaction reference has already been used.\n' +
        'Please check and try again.',
        Markup.inlineKeyboard([
          [{ text: '🔄 Try Again', callback_data: 'start_deposit' }]
        ])
      );
      return;
    }
    
    // Insert deposit record - screenshot_url can be NULL
    console.log('💾 Inserting deposit record...');
    const insertResult = await db.query(
      `INSERT INTO deposits 
      (user_id, amount, method, transaction_ref, screenshot_url, status) 
      VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userUuid, amount, method, transactionRef, screenshotUrl]
    );
    
    console.log('✅ Deposit inserted successfully:', insertResult);
    
    // Clear session after successful submission
    clearSession(ctx);
    
    // Success message
    let successMessage = 
      `✅ **Deposit Request Submitted!**\n\n` +
      `💰 **Amount:** ${amount} Birr\n` +
      `🔑 **Transaction Ref:** \`${transactionRef}\`\n` +
      `📱 **Method:** ${method === 'telebirr' ? 'TeleBirr' : 'CBE Birr'}\n` +
      `⏱️ **Status:** Pending Approval\n\n`;
    
    if (screenshotUrl) {
      successMessage += `📸 Screenshot received ✅\n`;
    } else {
      successMessage += `📝 *Submitted with transaction reference only*\n`;
    }
    
    if (sourceNote) {
      successMessage += `${sourceNote}\n`;
    }
    
    successMessage += `\n**What happens next?**\n` +
      `1️⃣ Admin will verify your transaction using the reference number\n` +
      `2️⃣ If approved, balance will be added within 1-24 hours\n` +
      `3️⃣ You'll receive a notification`;
    
    await ctx.reply(successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Check Balance', callback_data: 'menu_balance' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    });
    
    // Notify admins about new deposit
    await notifyAdminsOfDeposit(ctx, userUuid, amount, method, transactionRef, screenshotUrl, users[0].username);
    
  } catch (error) {
    console.error('❌ Deposit submission error:', error);
    
    // Detailed error message for user
    let errorMessage = '❌ **Failed to submit deposit**\n\n';
    
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage += 'This transaction reference already exists in our system.\n\n';
    } else {
      errorMessage += `Error: ${error.message || 'Unknown error'}\n\n`;
    }
    
    errorMessage += 'Please try again or use the web app.\n' +
      'Save your transaction reference for manual verification.';
    
    await ctx.reply(
      errorMessage,
      Markup.inlineKeyboard([
        [{ text: '🔄 Try Again', callback_data: 'start_deposit' }],
        [{ text: '💰 Use Web App', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/deposit' } }],
        [{ text: '📞 Contact Support', callback_data: 'menu_support' }]
      ])
    );
  }
}

// Notify admins about new deposit
async function notifyAdminsOfDeposit(ctx: any, userId: string, amount: number, method: string, transactionRef: string, screenshotUrl: string | null, username: string) {
  try {
    console.log('🔔 Notifying admins...');
    
    // Get admin chat IDs from database
    const admins = await db.query(
      'SELECT telegram_id FROM users WHERE role IN ("admin", "superadmin") AND telegram_id IS NOT NULL'
    ) as any[];
    
    console.log(`👥 Found ${admins.length} admins to notify`);
    
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
          `To approve, use:\n` +
          `/approve_deposit ${transactionRef}\n\n` +
          `To reject, use:\n` +
          `/reject_deposit ${transactionRef}`,
          { parse_mode: 'Markdown' }
        );
        console.log(`✅ Notified admin: ${admin.telegram_id}`);
      } catch (e) {
        console.error(`❌ Failed to notify admin ${admin.telegram_id}:`, e);
      }
    }
  } catch (error) {
    console.error('Admin notification error:', error);
  }
}

// ==================== ADMIN COMMANDS ====================

// Approve deposit command (admin only) - FIXED VERSION
bot.command('approve_deposit', async (ctx) => {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  
  const transactionRef = ctx.payload?.trim();
  
  if (!transactionRef) {
    await ctx.reply(
      '❌ Please provide a transaction reference.\n\n' +
      'Usage: /approve_deposit TRANSACTION_REF'
    );
    return;
  }
  
  console.log(`👑 Admin ${user.id} attempting to approve deposit with ref: ${transactionRef}`);
  
  try {
    // Start a transaction
    await db.query('START TRANSACTION');
    
    // Get deposit details - LOCK THE ROW FOR UPDATE to prevent race conditions
    const deposits = await db.query(
      `SELECT d.*, u.id as user_uuid, u.telegram_id, u.username, u.first_name, u.balance 
       FROM deposits d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.transaction_ref = ? AND d.status = 'pending'
       FOR UPDATE`,
      [transactionRef]
    ) as any[];
    
    console.log('📊 Deposit lookup result:', deposits);
    
    if (!deposits || deposits.length === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ No pending deposit found with that transaction reference.');
      return;
    }
    
    const deposit = deposits[0];
    console.log('✅ Found deposit:', { id: deposit.id, amount: deposit.amount, user_id: deposit.user_uuid });
    
    // Get admin user ID from database
    const admins = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!admins || admins.length === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Admin user not found in database.');
      return;
    }
    
    const adminId = admins[0].id;
    
    // Update deposit status to approved
    const updateDepositResult = await db.query(
      `UPDATE deposits 
       SET status = 'approved', approved_by = ?, approved_at = NOW() 
       WHERE id = ? AND status = 'pending'`,
      [adminId, deposit.id]
    );
    
    console.log('📝 Deposit update result:', updateDepositResult);
    
    // Check if deposit was updated
    if (updateDepositResult.affectedRows === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Failed to update deposit status. It may have been already processed.');
      return;
    }
    
    // Get current user balance before update
    const userBeforeUpdate = await db.query(
      'SELECT balance FROM users WHERE id = ?',
      [deposit.user_uuid]
    ) as any[];
    
    console.log('💰 User balance before update:', userBeforeUpdate[0]?.balance);
    
    // Update user balance (add deposit amount)
    const updateBalanceResult = await db.query(
      `UPDATE users 
       SET balance = balance + ?, updated_at = NOW() 
       WHERE id = ?`,
      [deposit.amount, deposit.user_uuid]
    );
    
    console.log('📝 Balance update result:', updateBalanceResult);
    
    if (updateBalanceResult.affectedRows === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Failed to update user balance.');
      return;
    }
    
    // Get new balance after update
    const userAfterUpdate = await db.query(
      'SELECT balance FROM users WHERE id = ?',
      [deposit.user_uuid]
    ) as any[];
    
    console.log('💰 User balance after update:', userAfterUpdate[0]?.balance);
    
    // Commit transaction
    await db.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    
    // Notify user
    try {
      await ctx.telegram.sendMessage(
        deposit.telegram_id,
        `✅ **Deposit Approved!**\n\n` +
        `💰 Amount: *${deposit.amount} Birr*\n` +
        `🔑 Transaction Ref: \`${deposit.transaction_ref}\`\n` +
        `📱 Method: ${deposit.method}\n\n` +
        `Your balance has been updated. New balance: *${userAfterUpdate[0]?.balance} Birr*\n\n` +
        `Use /balance to check.`,
        { parse_mode: 'Markdown' }
      );
      console.log(`✅ User ${deposit.telegram_id} notified`);
    } catch (e) {
      console.error('Failed to notify user:', e);
    }
    
    await ctx.reply(
      `✅ **Deposit Approved!**\n\n` +
      `💰 Amount: ${deposit.amount} Birr\n` +
      `👤 User: ${deposit.first_name} (@${deposit.username || 'N/A'})\n` +
      `🔑 Transaction Ref: \`${deposit.transaction_ref}\`\n` +
      `💳 New Balance: ${userAfterUpdate[0]?.balance} Birr\n\n` +
      `User has been notified.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Approve deposit error:', error);
    await ctx.reply(
      `❌ Error approving deposit: ${error.message || 'Unknown error'}\n\n` +
      'Please check the logs and try again.'
    );
  }
});

// Reject deposit command (admin only)
bot.command('reject_deposit', async (ctx) => {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  
  const transactionRef = ctx.payload?.trim();
  
  if (!transactionRef) {
    await ctx.reply(
      '❌ Please provide a transaction reference.\n\n' +
      'Usage: /reject_deposit TRANSACTION_REF'
    );
    return;
  }
  
  try {
    // Get deposit details
    const deposits = await db.query(
      `SELECT d.*, u.telegram_id, u.username, u.first_name 
       FROM deposits d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.transaction_ref = ? AND d.status = 'pending'`,
      [transactionRef]
    ) as any[];
    
    if (!deposits || deposits.length === 0) {
      await ctx.reply('❌ No pending deposit found with that transaction reference.');
      return;
    }
    
    const deposit = deposits[0];
    
    // Update deposit status to rejected
    await db.query(
      `UPDATE deposits 
       SET status = 'rejected' 
       WHERE id = ?`,
      [deposit.id]
    );
    
    // Notify user
    try {
      await ctx.telegram.sendMessage(
        deposit.telegram_id,
        `❌ **Deposit Rejected**\n\n` +
        `💰 Amount: *${deposit.amount} Birr*\n` +
        `🔑 Transaction Ref: \`${deposit.transaction_ref}\`\n` +
        `📱 Method: ${deposit.method}\n\n` +
        `Please contact support for more information.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Failed to notify user:', e);
    }
    
    await ctx.reply(
      `✅ **Deposit Rejected!**\n\n` +
      `💰 Amount: ${deposit.amount} Birr\n` +
      `👤 User: ${deposit.first_name} (@${deposit.username || 'N/A'})\n` +
      `🔑 Transaction Ref: \`${deposit.transaction_ref}\``,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Reject deposit error:', error);
    await ctx.reply('❌ Error rejecting deposit. Please try again.');
  }
});

// Approve withdrawal command (admin only)
bot.command('approve_withdrawal', async (ctx) => {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  
  const withdrawalId = ctx.payload?.trim();
  
  if (!withdrawalId) {
    await ctx.reply(
      '❌ Please provide a withdrawal ID.\n\n' +
      'Usage: /approve_withdrawal WITHDRAWAL_ID'
    );
    return;
  }
  
  console.log(`👑 Admin ${user.id} attempting to approve withdrawal ID: ${withdrawalId}`);
  
  try {
    // Start a transaction
    await db.query('START TRANSACTION');
    
    // Get withdrawal details with FOR UPDATE lock
    const withdrawals = await db.query(
      `SELECT w.*, u.id as user_uuid, u.telegram_id, u.username, u.first_name, u.balance 
       FROM withdrawals w 
       JOIN users u ON w.user_id = u.id 
       WHERE w.id = ? AND w.status = 'pending'
       FOR UPDATE`,
      [withdrawalId]
    ) as any[];
    
    console.log('📊 Withdrawal lookup result:', withdrawals);
    
    if (!withdrawals || withdrawals.length === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ No pending withdrawal found with that ID.');
      return;
    }
    
    const withdrawal = withdrawals[0];
    console.log('✅ Found withdrawal:', { id: withdrawal.id, amount: withdrawal.amount, user_id: withdrawal.user_uuid, balance: withdrawal.balance });
    
    // Check if user has sufficient balance
    if (withdrawal.balance < withdrawal.amount) {
      await db.query('ROLLBACK');
      await ctx.reply(
        `❌ **Insufficient balance for this withdrawal.**\n\n` +
        `User balance: ${withdrawal.balance} Birr\n` +
        `Withdrawal amount: ${withdrawal.amount} Birr\n\n` +
        `Consider rejecting this withdrawal.`
      );
      return;
    }
    
    // Get admin user ID
    const admins = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!admins || admins.length === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Admin user not found in database.');
      return;
    }
    
    const adminId = admins[0].id;
    
    // Update withdrawal status to approved
    const updateWithdrawalResult = await db.query(
      `UPDATE withdrawals 
       SET status = 'approved', approved_by = ?, approved_at = NOW() 
       WHERE id = ? AND status = 'pending'`,
      [adminId, withdrawal.id]
    );
    
    console.log('📝 Withdrawal update result:', updateWithdrawalResult);
    
    if (updateWithdrawalResult.affectedRows === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Failed to update withdrawal status. It may have been already processed.');
      return;
    }
    
    // Update user balance (subtract withdrawal amount)
    const updateBalanceResult = await db.query(
      `UPDATE users 
       SET balance = balance - ?, updated_at = NOW() 
       WHERE id = ?`,
      [withdrawal.amount, withdrawal.user_uuid]
    );
    
    console.log('📝 Balance update result:', updateBalanceResult);
    
    if (updateBalanceResult.affectedRows === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Failed to update user balance.');
      return;
    }
    
    // Get new balance after update
    const userAfterUpdate = await db.query(
      'SELECT balance FROM users WHERE id = ?',
      [withdrawal.user_uuid]
    ) as any[];
    
    console.log('💰 User balance after update:', userAfterUpdate[0]?.balance);
    
    // Commit transaction
    await db.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    
    // Notify user
    try {
      await ctx.telegram.sendMessage(
        withdrawal.telegram_id,
        `✅ **Withdrawal Approved!**\n\n` +
        `💰 Amount: *${withdrawal.amount} Birr*\n` +
        `📱 Account: \`${withdrawal.account_number}\`\n\n` +
        `The amount has been sent to your account.\n` +
        `New balance: *${userAfterUpdate[0]?.balance} Birr*\n\n` +
        `Use /balance to check your updated balance.`,
        { parse_mode: 'Markdown' }
      );
      console.log(`✅ User ${withdrawal.telegram_id} notified`);
    } catch (e) {
      console.error('Failed to notify user:', e);
    }
    
    await ctx.reply(
      `✅ **Withdrawal Approved!**\n\n` +
      `💰 Amount: ${withdrawal.amount} Birr\n` +
      `👤 User: ${withdrawal.first_name} (@${withdrawal.username || 'N/A'})\n` +
      `📱 Account: \`${withdrawal.account_number}\`\n` +
      `💳 New Balance: ${userAfterUpdate[0]?.balance} Birr\n\n` +
      `User has been notified.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Approve withdrawal error:', error);
    await ctx.reply(
      `❌ Error approving withdrawal: ${error.message || 'Unknown error'}\n\n` +
      'Please check the logs and try again.'
    );
  }
});

// Reject withdrawal command (admin only)
bot.command('reject_withdrawal', async (ctx) => {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  
  const withdrawalId = ctx.payload?.trim();
  
  if (!withdrawalId) {
    await ctx.reply(
      '❌ Please provide a withdrawal ID.\n\n' +
      'Usage: /reject_withdrawal WITHDRAWAL_ID'
    );
    return;
  }
  
  try {
    // Get withdrawal details
    const withdrawals = await db.query(
      `SELECT w.*, u.telegram_id, u.username, u.first_name 
       FROM withdrawals w 
       JOIN users u ON w.user_id = u.id 
       WHERE w.id = ? AND w.status = 'pending'`,
      [withdrawalId]
    ) as any[];
    
    if (!withdrawals || withdrawals.length === 0) {
      await ctx.reply('❌ No pending withdrawal found with that ID.');
      return;
    }
    
    const withdrawal = withdrawals[0];
    
    // Update withdrawal status to rejected
    await db.query(
      `UPDATE withdrawals 
       SET status = 'rejected' 
       WHERE id = ?`,
      [withdrawal.id]
    );
    
    // Notify user
    try {
      await ctx.telegram.sendMessage(
        withdrawal.telegram_id,
        `❌ **Withdrawal Rejected**\n\n` +
        `💰 Amount: *${withdrawal.amount} Birr*\n` +
        `📱 Account: \`${withdrawal.account_number}\`\n\n` +
        `Please contact support for more information.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Failed to notify user:', e);
    }
    
    await ctx.reply(
      `✅ **Withdrawal Rejected!**\n\n` +
      `💰 Amount: ${withdrawal.amount} Birr\n` +
      `👤 User: ${withdrawal.first_name} (@${withdrawal.username || 'N/A'})\n` +
      `📱 Account: \`${withdrawal.account_number}\``,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    await ctx.reply('❌ Error rejecting withdrawal. Please try again.');
  }
});

// Admin panel command
bot.command('admin', async (ctx) => {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  
  // Get pending counts
  const pendingDeposits = await db.query(
    'SELECT COUNT(*) as count FROM deposits WHERE status = "pending"'
  ) as any[];
  
  const pendingWithdrawals = await db.query(
    'SELECT COUNT(*) as count FROM withdrawals WHERE status = "pending"'
  ) as any[];
  
  await ctx.reply(
    `👑 **Admin Panel**\n\n` +
    `**Pending Transactions:**\n` +
    `• Deposits: ${pendingDeposits[0]?.count || 0}\n` +
    `• Withdrawals: ${pendingWithdrawals[0]?.count || 0}\n\n` +
    `**Admin Commands:**\n` +
    `• /pending_deposits - View pending deposits\n` +
    `• /pending_withdrawals - View pending withdrawals\n` +
    `• /approve_deposit [ref] - Approve deposit\n` +
    `• /reject_deposit [ref] - Reject deposit\n` +
    `• /approve_withdrawal [id] - Approve withdrawal\n` +
    `• /reject_withdrawal [id] - Reject withdrawal`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏳ Pending Deposits', callback_data: 'admin_pending_deposits' }],
          [{ text: '⏳ Pending Withdrawals', callback_data: 'admin_pending_withdrawals' }]
        ]
      }
    }
  );
});

// Pending deposits command
bot.command('pending_deposits', async (ctx) => {
  await showPendingDeposits(ctx);
});

bot.action('admin_pending_deposits', async (ctx) => {
  await ctx.answerCbQuery();
  await showPendingDeposits(ctx);
});

async function showPendingDeposits(ctx: any) {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized.');
    return;
  }
  
  try {
    const deposits = await db.query(
      `SELECT d.*, u.username, u.first_name, u.telegram_id 
       FROM deposits d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.status = 'pending' 
       ORDER BY d.created_at DESC 
       LIMIT 10`,
      []
    ) as any[];
    
    if (!deposits || deposits.length === 0) {
      await ctx.reply('✅ No pending deposits.');
      return;
    }
    
    let message = '⏳ **Pending Deposits**\n\n';
    
    deposits.forEach((dep, index) => {
      message += `${index + 1}. **${dep.amount} Birr** (${dep.method})\n`;
      message += `   User: ${dep.first_name} (@${dep.username || 'N/A'})\n`;
      message += `   Ref: \`${dep.transaction_ref}\`\n`;
      message += `   Date: ${new Date(dep.created_at).toLocaleString()}\n`;
      message += `   Approve: /approve_deposit ${dep.transaction_ref}\n`;
      message += `   Reject: /reject_deposit ${dep.transaction_ref}\n\n`;
    });
    
    // Split message if too long
    if (message.length > 4000) {
      // Send first part
      await ctx.reply(message.substring(0, 4000), { parse_mode: 'Markdown' });
      
      // Send remaining parts
      let remaining = message.substring(4000);
      while (remaining.length > 0) {
        await ctx.reply(remaining.substring(0, 4000), { parse_mode: 'Markdown' });
        remaining = remaining.substring(4000);
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Pending deposits error:', error);
    await ctx.reply('❌ Error fetching pending deposits.');
  }
}

// Pending withdrawals command
bot.command('pending_withdrawals', async (ctx) => {
  await showPendingWithdrawals(ctx);
});

bot.action('admin_pending_withdrawals', async (ctx) => {
  await ctx.answerCbQuery();
  await showPendingWithdrawals(ctx);
});

async function showPendingWithdrawals(ctx: any) {
  const user = ctx.from;
  
  // Check if user is admin
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized.');
    return;
  }
  
  try {
    const withdrawals = await db.query(
      `SELECT w.*, u.username, u.first_name, u.telegram_id, u.balance 
       FROM withdrawals w 
       JOIN users u ON w.user_id = u.id 
       WHERE w.status = 'pending' 
       ORDER BY w.created_at DESC 
       LIMIT 10`,
      []
    ) as any[];
    
    if (!withdrawals || withdrawals.length === 0) {
      await ctx.reply('✅ No pending withdrawals.');
      return;
    }
    
    let message = '⏳ **Pending Withdrawals**\n\n';
    
    withdrawals.forEach((wd, index) => {
      message += `${index + 1}. **${wd.amount} Birr**\n`;
      message += `   User: ${wd.first_name} (@${wd.username || 'N/A'})\n`;
      message += `   Account: \`${wd.account_number}\`\n`;
      message += `   Balance: ${wd.balance} Birr\n`;
      message += `   Date: ${new Date(wd.created_at).toLocaleString()}\n`;
      message += `   Approve: /approve_withdrawal ${wd.id}\n`;
      message += `   Reject: /reject_withdrawal ${wd.id}\n\n`;
    });
    
    // Split message if too long
    if (message.length > 4000) {
      await ctx.reply(message.substring(0, 4000), { parse_mode: 'Markdown' });
      let remaining = message.substring(4000);
      while (remaining.length > 0) {
        await ctx.reply(remaining.substring(0, 4000), { parse_mode: 'Markdown' });
        remaining = remaining.substring(4000);
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Pending withdrawals error:', error);
    await ctx.reply('❌ Error fetching pending withdrawals.');
  }
}

// ==================== USER COMMANDS ====================



// Withdraw command execution - FIXED VERSION
async function executeWithdrawCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    // Check if user is registered
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply(
        '❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register Now', 'menu_register')]
        ])
      );
      return;
    }
    
    // Get user balance
    const userData = await getUserData(user.id.toString());
    
    // Send the withdrawal prompt with a unique identifier
    const sentMessage = await ctx.reply(
      `🏧 **Withdraw Funds**\n\n` +
      `💰 **Available Balance:** *${userData.balance} Birr*\n` +
      `📝 **Minimum Withdrawal:** 10 Birr\n` +
      `⏱️ **Processing Time:** 1-24 hours\n\n` +
      `**Please send in this format:**\n` +
      `\`\`\`\nAmount\nAccount Number\n\`\`\`\n\n` +
      `**Example:**\n` +
      `\`\`\`\n50\n0911-123-4567\n\`\`\`\n\n` +
      `⚠️ Make sure you have sufficient balance!\n\n` +
      `_Reply to this message with your withdrawal details._`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Amount\nAccount Number'
        }
      }
    );
    
    // Store the message ID in session to track withdrawal flow
    updateSession(ctx, {
      withdrawStep: 'awaiting_details',
      withdrawMessageId: sentMessage.message_id,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Withdraw command error:', error);
    await ctx.reply(
      '❌ Error processing withdrawal request. Please try again.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Try Again', 'menu_withdraw')],
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
}

// Withdraw command
bot.command('withdraw', async (ctx) => {
  await executeWithdrawCommand(ctx);
});

// Handle withdrawal text - FIXED VERSION
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const session = getSession(ctx);
  
  // Log for debugging
  console.log('📝 Text received:', text);
  console.log('📝 Reply to message:', ctx.message.reply_to_message?.message_id);
  console.log('📝 Session state:', session);
  
  // Check if this is a reply to the withdrawal prompt
  const isWithdrawalReply = ctx.message.reply_to_message && 
                           (ctx.message.reply_to_message.text?.includes('Withdraw Funds') || 
                            ctx.message.reply_to_message.text?.includes('withdrawal details'));
  
  // Also check if we're in withdrawal flow based on session
  const isInWithdrawalFlow = session?.withdrawStep === 'awaiting_details';
  
  if (isWithdrawalReply || isInWithdrawalFlow) {
    console.log('✅ Processing withdrawal request');
    
    // Split by newlines and filter empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      await ctx.reply(
        '❌ **Invalid format**\n\n' +
        'Please send your withdrawal details in this format:\n' +
        '`Amount\nAccountNumber`\n\n' +
        '**Example:**\n' +
        '`50\n0911-123-4567`\n\n' +
        'Please try again with /withdraw',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: 'menu_withdraw' }]
            ]
          }
        }
      );
      // Clear session
      clearSession(ctx);
      return;
    }
    
    const amount = parseFloat(lines[0].trim());
    const accountNumber = lines[1].trim();
    
    // Validate amount
    if (isNaN(amount) || amount < 10) {
      await ctx.reply(
        '❌ **Invalid amount**\n\n' +
        'Minimum withdrawal is 10 Birr.\n\n' +
        'Please try again with /withdraw',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: 'menu_withdraw' }]
            ]
          }
        }
      );
      // Clear session
      clearSession(ctx);
      return;
    }
    
    // Validate account number
    if (!accountNumber || accountNumber.length < 5) {
      await ctx.reply(
        '❌ **Invalid account number**\n\n' +
        'Please enter a valid account number (at least 5 digits).\n\n' +
        'Please try again with /withdraw',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: 'menu_withdraw' }]
            ]
          }
        }
      );
      // Clear session
      clearSession(ctx);
      return;
    }
    
    // Send typing indicator
    await ctx.sendChatAction('typing');
    
    // Check if user has sufficient balance
    try {
      const users = await db.query(
        'SELECT id, balance, username, first_name FROM users WHERE telegram_id = ?',
        [ctx.from.id.toString()]
      ) as any[];
      
      if (!users || users.length === 0) {
        await ctx.reply(
          '❌ You are not registered. Use /register first.',
          Markup.inlineKeyboard([
            [Markup.button.callback('📝 Register Now', 'menu_register')]
          ])
        );
        // Clear session
        clearSession(ctx);
        return;
      }
      
      const user = users[0];
      
      if (user.balance < amount) {
        await ctx.reply(
          '❌ **Insufficient balance**\n\n' +
          `Your balance: *${user.balance} Birr*\n` +
          `Requested: *${amount} Birr*\n\n` +
          `Please deposit more funds to continue.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '💰 Check Balance', callback_data: 'menu_balance' }],
                [{ text: '💰 Deposit', callback_data: 'menu_deposit' }],
                [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
              ]
            }
          }
        );
        // Clear session
        clearSession(ctx);
        return;
      }
      
      // Create withdrawal record in database
      console.log('💾 Creating withdrawal record:', { userId: user.id, amount, accountNumber });
      
      const insertResult = await db.query(
        'INSERT INTO withdrawals (user_id, amount, account_number, status, created_at) VALUES (?, ?, ?, "pending", NOW())',
        [user.id, amount, accountNumber]
      );
      
      // Get the inserted withdrawal ID
      const withdrawalId = insertResult.insertId;
      
      console.log('✅ Withdrawal created with ID:', withdrawalId);
      
      // Clear session after successful submission
      clearSession(ctx);
      
      await ctx.reply(
        `✅ **Withdrawal Request Submitted!**\n\n` +
        `💰 **Amount:** *${amount} Birr*\n` +
        `📱 **Account:** \`${accountNumber}\`\n` +
        `⏱️ **Status:** Pending Approval\n` +
        `🆔 **Request ID:** \`${withdrawalId}\`\n\n` +
        `**What happens next?**\n` +
        `1️⃣ Admin will review your request\n` +
        `2️⃣ If approved, amount will be sent to your account\n` +
        `3️⃣ You'll be notified within 1-24 hours`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Check Balance', callback_data: 'menu_balance' }],
              [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
            ]
          }
        }
      );
      
      // Notify admins
      const admins = await db.query(
        'SELECT telegram_id FROM users WHERE role IN ("admin", "superadmin") AND telegram_id IS NOT NULL'
      ) as any[];
      
      console.log(`👥 Notifying ${admins.length} admins`);
      
      for (const admin of admins) {
        try {
          await ctx.telegram.sendMessage(
            admin.telegram_id,
            `🔔 **New Withdrawal Request**\n\n` +
            `👤 **User:** ${user.first_name || 'Unknown'} (@${user.username || 'N/A'})\n` +
            `🆔 **User ID:** \`${user.id}\`\n` +
            `💰 **Amount:** *${amount} Birr*\n` +
            `📱 **Account:** \`${accountNumber}\`\n` +
            `🆔 **Request ID:** \`${withdrawalId}\`\n` +
            `🕐 **Time:** ${new Date().toLocaleString()}\n\n` +
            `**Actions:**\n` +
            `✅ Approve: /approve_withdrawal ${withdrawalId}\n` +
            `❌ Reject: /reject_withdrawal ${withdrawalId}`,
            { parse_mode: 'Markdown' }
          );
          console.log(`✅ Notified admin: ${admin.telegram_id}`);
        } catch (e) {
          console.error(`❌ Failed to notify admin ${admin.telegram_id}:`, e);
        }
      }
      
    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      await ctx.reply(
        '❌ **Failed to process withdrawal**\n\n' +
        `Error: ${error.message || 'Unknown error'}\n\n` +
        'Please try again or contact support.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'menu_withdraw')],
          [Markup.button.callback('📞 Contact Support', 'menu_support')]
        ])
      );
      // Clear session on error
      clearSession(ctx);
    }
  }
});



bot.on('text', async (ctx) => {
  const session = getSession(ctx);
  
  // If we're in withdrawal flow but this message is not a reply, remind them
  if (session?.withdrawStep === 'awaiting_details' && !ctx.message.reply_to_message) {
    await ctx.reply(
      '⚠️ **Withdrawal in Progress**\n\n' +
      'Please reply to the withdrawal message with your details.\n\n' +
      'Format:\n' +
      '`Amount\nAccountNumber`\n\n' +
      'Example:\n' +
      '`50\n0911-123-4567`\n\n' +
      'Or type /cancel to cancel.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'cancel_withdrawal' }]
          ]
        }
      }
    );
  }
});

// Cancel withdrawal
bot.action('cancel_withdrawal', async (ctx) => {
  await ctx.answerCbQuery();
  clearSession(ctx);
  await ctx.reply(
    '❌ Withdrawal cancelled.',
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Main Menu', 'show_menu')]
    ])
  );
});

// Also handle /cancel command for withdrawal
bot.command('cancel', async (ctx) => {
  const session = getSession(ctx);
  if (session?.withdrawStep === 'awaiting_details') {
    clearSession(ctx);
    await ctx.reply(
      '❌ Withdrawal cancelled.',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  } else {
    clearSession(ctx);
    await ctx.reply(
      '✅ Current operation cancelled.',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
});

// Withdraw command
bot.command('withdraw', async (ctx) => {
  await executeWithdrawCommand(ctx);
});

// Handle withdrawal text
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Handle withdrawal details
  if (ctx.message.reply_to_message?.text?.includes('Withdraw Funds')) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      await ctx.reply(
        '❌ **Invalid format**\n\n' +
        'Please send:\n' +
        '`Amount\nAccountNumber`\n\n' +
        'Example:\n' +
        '`50\n0911-123-4567`',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      );
      return;
    }
    
    const amount = parseFloat(lines[0].trim());
    const accountNumber = lines[1].trim();
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply(
        '❌ **Invalid amount**\n\n' +
        'Minimum withdrawal is 10 Birr.',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      );
      return;
    }
    
    if (!accountNumber || accountNumber.length < 5) {
      await ctx.reply(
        '❌ **Invalid account number**\n\n' +
        'Please enter a valid account number.',
        {
          parse_mode: 'Markdown',
          reply_markup: { force_reply: true }
        }
      );
      return;
    }
    
    // Check if user has sufficient balance
    try {
      const users = await db.query(
        'SELECT id, balance FROM users WHERE telegram_id = ?',
        [ctx.from.id.toString()]
      ) as any[];
      
      if (!users || users.length === 0) {
        await ctx.reply(
          '❌ You are not registered. Use /register first.',
          Markup.inlineKeyboard([
            [Markup.button.callback('📝 Register Now', 'menu_register')]
          ])
        );
        return;
      }
      
      if (users[0].balance < amount) {
        await ctx.reply(
          '❌ **Insufficient balance**\n\n' +
          `Your balance: *${users[0].balance} Birr*\n` +
          `Requested: *${amount} Birr*`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '💰 Check Balance', callback_data: 'menu_balance' }],
                [{ text: '💰 Deposit', callback_data: 'menu_deposit' }]
              ]
            }
          }
        );
        return;
      }
      
      // Create withdrawal record in database
      const insertResult = await db.query(
        'INSERT INTO withdrawals (user_id, amount, account_number, status, created_at) VALUES (?, ?, ?, "pending", NOW())',
        [users[0].id, amount, accountNumber]
      );
      
      // Get the inserted withdrawal ID
      const withdrawalId = insertResult.insertId;
      
      await ctx.reply(
        `✅ **Withdrawal Request Submitted!**\n\n` +
        `💰 **Amount:** *${amount} Birr*\n` +
        `📱 **Account:** \`${accountNumber}\`\n` +
        `⏱️ **Status:** Pending Approval\n` +
        `🆔 **Request ID:** \`${withdrawalId}\`\n\n` +
        `You'll be notified once approved.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Check Balance', callback_data: 'menu_balance' }],
              [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
            ]
          }
        }
      );
      
      // Notify admins
      const admins = await db.query(
        'SELECT telegram_id FROM users WHERE role IN ("admin", "superadmin") AND telegram_id IS NOT NULL'
      ) as any[];
      
      for (const admin of admins) {
        try {
          await ctx.telegram.sendMessage(
            admin.telegram_id,
            `🔔 **New Withdrawal Request**\n\n` +
            `👤 User: ${ctx.from.username || ctx.from.first_name} (${users[0].id})\n` +
            `💰 Amount: ${amount} Birr\n` +
            `📱 Account: \`${accountNumber}\`\n` +
            `🆔 Request ID: \`${withdrawalId}\`\n` +
            `🕐 Time: ${new Date().toLocaleString()}\n\n` +
            `To approve: /approve_withdrawal ${withdrawalId}\n` +
            `To reject: /reject_withdrawal ${withdrawalId}`,
            { parse_mode: 'Markdown' }
          );
        } catch (e) {
          console.error('Failed to notify admin:', e);
        }
      }
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      await ctx.reply(
        '❌ Failed to process withdrawal. Please try again.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Try Again', 'menu_withdraw')]
        ])
      );
    }
  }
});



// Invite command execution - FIXED VERSION
async function executeInviteCommand(ctx: any) {
  try {
    const user = ctx.from;
    const telegramId = user.id.toString();
    
    console.log(`👥 User ${telegramId} requested referral info`);
    
    // Check if user is registered
    const isRegistered = await checkUserRegistered(telegramId);
    
    if (!isRegistered) {
      await ctx.reply(
        '❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register Now', 'menu_register')]
        ])
      );
      return;
    }
    
    // Get user's data from database
    const users = await db.query(
      'SELECT id, referral_code, balance, bonus_balance FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[];
    
    if (!users || users.length === 0) {
      console.error('User not found in database despite being registered:', telegramId);
      await ctx.reply(
        '❌ Error fetching your information. Please try again or contact support.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📞 Contact Support', 'menu_support')]
        ])
      );
      return;
    }
    
    const userData = users[0];
    const referralCode = userData.referral_code;
    const userId = userData.id;
    
    // Create referral link
    const botUsername = ctx.botInfo?.username || 'HabeshaBingoBot';
    const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;
    
    // Get referral count - FIXED: Using correct column name (referred_by)
    const referralsResult = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE referred_by = ?',
      [userId]
    ) as any[];
    
    const referralCount = referralsResult[0]?.count || 0;
    
    // Calculate referral earnings (10 Birr per referral)
    const referralEarnings = referralCount * 10;
    
    // Get list of recent referrals (optional, for display)
    const recentReferrals = await db.query(
      'SELECT first_name, username, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    ) as any[];
    
    console.log(`📊 User ${telegramId} has ${referralCount} referrals, earned ${referralEarnings} Birr`);
    
    // Build the message
    let message = `👥 **Refer & Earn**\n\n`;
    message += `🎁 Earn **10 Birr** for each friend who joins using your link!\n\n`;
    message += `🔑 **Your Referral Code:** \`${referralCode}\`\n`;
    message += `📊 **Total Referrals:** *${referralCount}*\n`;
    message += `💰 **Total Earned:** *${referralEarnings} Birr*\n\n`;
    message += `📱 **Your Referral Link:**\n`;
    message += `${referralLink}\n\n`;
    
    // Add recent referrals if any
    if (recentReferrals && recentReferrals.length > 0) {
      message += `**Recent Referrals:**\n`;
      recentReferrals.forEach((ref: any, index: number) => {
        const name = ref.first_name || ref.username || 'Anonymous';
        const date = new Date(ref.created_at).toLocaleDateString();
        message += `${index + 1}. ${name} - ${date}\n`;
      });
      message += `\n`;
    }
    
    message += `**How it works:**\n`;
    message += `1️⃣ Share your link with friends\n`;
    message += `2️⃣ They register using your code\n`;
    message += `3️⃣ You get 10 Birr bonus instantly!\n`;
    message += `4️⃣ They get 50 Birr welcome bonus 🎉`;
    
    await ctx.reply(
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 Share on Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🎮 Join Habesha Bingo and get 50 Birr welcome bonus! Use my referral code: ' + referralCode)}` }
            ],
            [
              { text: '📊 View All Referrals', callback_data: 'view_referrals' },
              { text: '🎮 Play Now', callback_data: 'menu_play' }
            ],
            [
              { text: '📋 Main Menu', callback_data: 'show_menu' }
            ]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error('❌ Invite command error:', error);
    await ctx.reply(
      '❌ **Error fetching referral information**\n\n' +
      'Please try again or contact support.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: 'menu_invite' }],
            [{ text: '📞 Contact Support', callback_data: 'menu_support' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  }
}

// View referrals callback - FIXED VERSION
bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const user = ctx.from;
    const telegramId = user.id.toString();
    
    console.log(`📊 User ${telegramId} requested to view all referrals`);
    
    // Get user ID from database
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply(
        '❌ You are not registered.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register Now', 'menu_register')]
        ])
      );
      return;
    }
    
    const userId = users[0].id;
    
    // Get all referrals
    const referrals = await db.query(
      'SELECT first_name, username, created_at, balance FROM users WHERE referred_by = ? ORDER BY created_at DESC',
      [userId]
    ) as any[];
    
    if (!referrals || referrals.length === 0) {
      await ctx.reply(
        '📊 **You haven\'t referred anyone yet.**\n\n' +
        'Share your referral link to start earning 10 Birr per friend!',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '👥 Get Referral Link', callback_data: 'menu_invite' }],
              [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
            ]
          }
        }
      );
      return;
    }
    
    // Calculate total earnings
    const totalEarnings = referrals.length * 10;
    
    let referralList = `📊 **Your Referrals (${referrals.length} total)**\n\n`;
    referralList += `💰 **Total Earned:** *${totalEarnings} Birr*\n\n`;
    
    if (referrals.length > 10) {
      referralList += `*Showing last 10 referrals:*\n\n`;
    }
    
    // Show last 10 referrals
    const displayReferrals = referrals.slice(0, 10);
    displayReferrals.forEach((ref: any, index: number) => {
      const name = ref.first_name || ref.username || 'Anonymous';
      const date = new Date(ref.created_at).toLocaleDateString();
      referralList += `${index + 1}. ${name} - ${date}\n`;
    });
    
    if (referrals.length > 10) {
      referralList += `\n*... and ${referrals.length - 10} more*`;
    }
    
    await ctx.editMessageText(
      referralList,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 Back to Referral', callback_data: 'menu_invite' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error('❌ View referrals error:', error);
    await ctx.reply(
      '❌ Error fetching referrals. Please try again.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Try Again', 'view_referrals')],
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
});

// Invite command
bot.command('invite', async (ctx) => {
  await executeInviteCommand(ctx);
});

// Also handle menu_invite callback
bot.action('menu_invite', async (ctx) => {
  await ctx.answerCbQuery();
  await executeInviteCommand(ctx);
});

// Invite command
bot.command('invite', async (ctx) => {
  await executeInviteCommand(ctx);
});

// View referrals callback
bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery();
  
  try {
    const user = ctx.from;
    
    // Get user ID
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered.');
      return;
    }
    
    const userId = users[0].id;
    
    // Get referrals list
    const referrals = await db.query(
      'SELECT username, first_name, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    ) as any[];
    
    if (!referrals || referrals.length === 0) {
      await ctx.reply(
        '📊 **You haven\'t referred anyone yet.**\n\n' +
        'Share your referral link to start earning!',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '👥 Get Referral Link', callback_data: 'menu_invite' }]
            ]
          }
        }
      );
      return;
    }
    
    let referralList = '📊 **Your Referrals:**\n\n';
    referrals.forEach((ref, index) => {
      const name = ref.first_name || ref.username || 'Anonymous';
      const date = new Date(ref.created_at).toLocaleDateString();
      referralList += `${index + 1}. ${name} - ${date}\n`;
    });
    
    if (referrals.length === 10) {
      referralList += '\n*Showing last 10 referrals*';
    }
    
    await ctx.reply(
      referralList,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👥 Back to Referral', callback_data: 'menu_invite' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('View referrals error:', error);
    await ctx.reply('❌ Error fetching referrals.');
  }
});

// Instructions command execution
async function executeInstructionsCommand(ctx: any) {
  await ctx.reply(
    '📖 **How to Play Habesha Bingo**\n\n' +
    '**Step 1: Register** 📝\n' +
    '• Use /register to create your account\n' +
    '• Get 50 Birr welcome bonus!\n\n' +
    '**Step 2: Deposit** 💰\n' +
    '• Use /deposit to add funds\n' +
    '• Minimum deposit: 10 Birr\n' +
    '• Pay via TeleBirr or CBE Birr\n\n' +
    '**Step 3: Play** 🎮\n' +
    '• Use /play to open the game\n' +
    '• Buy bingo cards\n' +
    '• Match numbers to win!\n\n' +
    '**Step 4: Withdraw** 🏧\n' +
    '• Use /withdraw to cash out\n' +
    '• Minimum withdrawal: 10 Birr\n' +
    '• Processing time: 1-24 hours\n\n' +
    '**Referral Program** 👥\n' +
    '• Earn 10 Birr per referral\n' +
    '• Use /invite to get your link\n\n' +
    '**Need Help?** 📞\n' +
    '• Use /support to contact us',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play Now', callback_data: 'menu_play' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// Instructions command
bot.command('instructions', async (ctx) => {
  await executeInstructionsCommand(ctx);
});

// Support command execution
async function executeSupportCommand(ctx: any) {
  await ctx.reply(
    '📞 **Contact Support**\n\n' +
    '**How can we help you?**\n\n' +
    '• 💳 Deposit issues\n' +
    '• 🏧 Withdrawal problems\n' +
    '• 🎮 Game questions\n' +
    '• 👤 Account issues\n' +
    '• 💬 General inquiries\n\n' +
    '**Contact methods:**\n\n' +
    '📱 **Telegram:** @HabeshaBingoSupport\n' +
    '📧 **Email:** support@habeshabingo.com\n' +
    '⏱️ **Response time:** Within 24 hours\n\n' +
    'Please include your User ID when contacting support.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Contact on Telegram', url: 'https://t.me/HabeshaBingoSupport' }],
          [{ text: '📧 Send Email', url: 'mailto:support@habeshabingo.com' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// Support command
bot.command('support', async (ctx) => {
  await executeSupportCommand(ctx);
});

// About command execution
async function executeAboutCommand(ctx: any) {
  await ctx.reply(
    'ℹ️ **About Habesha Bingo**\n\n' +
    '**Version:** 1.0.0\n' +
    '**Developer:** DevVoltz\n' +
    '**Released:** 2024\n\n' +
    '**What is Habesha Bingo?**\n' +
    'Habesha Bingo is an exciting online bingo platform where you can play and win real money prizes!\n\n' +
    '**Features:**\n' +
    '• 🎮 Multiple bingo game modes\n' +
    '• 💰 Real money prizes\n' +
    '• 👥 Referral program\n' +
    '• 📱 Telegram Mini App integration\n' +
    '• 🔒 Secure transactions\n\n' +
    '**Why choose us?**\n' +
    '• ✅ Licensed and regulated\n' +
    '• ✅ Fast withdrawals\n' +
    '• ✅ 24/7 customer support\n' +
    '• ✅ Fair gameplay\n\n' +
    'Thank you for choosing Habesha Bingo! 🎉',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Start Playing', callback_data: 'menu_play' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// About command
bot.command('about', async (ctx) => {
  await executeAboutCommand(ctx);
});

// History command execution
async function executeHistoryCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    // Check if user is registered
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply(
        '❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register Now', 'menu_register')]
        ])
      );
      return;
    }
    
    // Get user ID
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ Error fetching user data.');
      return;
    }
    
    const userId = users[0].id;
    
    // Get recent deposits
    const deposits = await db.query(
      'SELECT amount, method, status, created_at FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    ) as any[];
    
    // Get recent withdrawals
    const withdrawals = await db.query(
      'SELECT amount, status, created_at FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    ) as any[];
    
    let historyText = '📜 **Transaction History**\n\n';
    
    historyText += '**Recent Deposits:**\n';
    if (deposits && deposits.length > 0) {
      deposits.forEach(dep => {
        const date = new Date(dep.created_at).toLocaleDateString();
        const statusEmoji = dep.status === 'approved' ? '✅' : dep.status === 'pending' ? '⏳' : '❌';
        historyText += `${statusEmoji} ${dep.amount} Birr (${dep.method}) - ${date} - ${dep.status}\n`;
      });
    } else {
      historyText += 'No deposits yet\n';
    }
    
    historyText += '\n**Recent Withdrawals:**\n';
    if (withdrawals && withdrawals.length > 0) {
      withdrawals.forEach(wd => {
        const date = new Date(wd.created_at).toLocaleDateString();
        const statusEmoji = wd.status === 'approved' ? '✅' : wd.status === 'pending' ? '⏳' : '❌';
        historyText += `${statusEmoji} ${wd.amount} Birr - ${date} - ${wd.status}\n`;
      });
    } else {
      historyText += 'No withdrawals yet\n';
    }
    
    await ctx.reply(
      historyText,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Make Deposit', callback_data: 'menu_deposit' }],
            [{ text: '🏧 Make Withdrawal', callback_data: 'menu_withdraw' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('History error:', error);
    await ctx.reply(
      '❌ Error fetching transaction history.',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
}

// History command
bot.command('history', async (ctx) => {
  await executeHistoryCommand(ctx);
});

// Profile command execution
async function executeProfileCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    // Check if user is registered
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply(
        '❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register Now', 'menu_register')]
        ])
      );
      return;
    }
    
    // Get user data
    const userData = await getUserData(user.id.toString());
    
    if (!userData) {
      await ctx.reply('❌ Error fetching profile data.');
      return;
    }
    
    // Get statistics
    const depositStats = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = "approved"',
      [userData.id]
    ) as any[];
    
    const withdrawalStats = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status = "approved"',
      [userData.id]
    ) as any[];
    
    // Check if game_history table exists, if not, return 0
    let gameStats = [{ games_played: 0, total_wins: 0 }];
    try {
      gameStats = await db.query(
        'SELECT COUNT(*) as games_played, COALESCE(SUM(win_amount), 0) as total_wins FROM game_history WHERE user_id = ?',
        [userData.id]
      ) as any[];
    } catch (e) {
      console.log('Game history table may not exist yet');
    }
    
    await ctx.reply(
      `👤 **Your Profile**\n\n` +
      `**Personal Info:**\n` +
      `• Name: ${userData.first_name}\n` +
      `• Username: ${userData.username || 'Not set'}\n` +
      `• User ID: \`${userData.id}\`\n` +
      `• Member since: ${new Date(userData.created_at).toLocaleDateString()}\n` +
      `• Account type: ${userData.role === 'admin' ? '👑 Admin' : '👤 User'}\n\n` +
      `**Statistics:**\n` +
      `• Total Deposits: ${depositStats[0]?.count || 0} (${depositStats[0]?.total || 0} Birr)\n` +
      `• Total Withdrawals: ${withdrawalStats[0]?.count || 0} (${withdrawalStats[0]?.total || 0} Birr)\n` +
      `• Games Played: ${gameStats[0]?.games_played || 0}\n` +
      `• Total Winnings: ${gameStats[0]?.total_wins || 0} Birr\n\n` +
      `**Referral Info:**\n` +
      `• Referral Code: \`${userData.referral_code}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📜 Transaction History', callback_data: 'menu_history' }],
            [{ text: '👥 Referral Program', callback_data: 'menu_invite' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Profile error:', error);
    await ctx.reply(
      '❌ Error fetching profile data.',
      Markup.inlineKeyboard([
        [Markup.button.callback('📋 Main Menu', 'show_menu')]
      ])
    );
  }
}

// Profile command
bot.command('profile', async (ctx) => {
  await executeProfileCommand(ctx);
});

// Error handling
bot.catch((err: any, ctx: Context) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err);
  
  // Send user-friendly error message
  ctx.reply(
    '❌ **An error occurred**\n\n' +
    `Error: ${err.message || 'Unknown error'}\n\n` +
    'Please try again or contact support if the issue persists.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📞 Contact Support', callback_data: 'menu_support' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  ).catch(e => console.error('Failed to send error message:', e));
});

// Start bot
export async function startBot() {
  try {
    console.log('🤖 Starting Habesha Bingo Bot...');
    console.log('📝 Environment:', process.env.NODE_ENV);
    console.log('📝 WebApp URL:', process.env.NEXT_PUBLIC_WEBAPP_URL);
    console.log('👑 Admin IDs:', ADMIN_IDS);
    
    // Only try ngrok in development
    if (process.env.NODE_ENV === 'development') {
      const tunnelUrl = await startNgrokTunnel(3000);
      console.log(`✅ Ngrok URL: ${tunnelUrl}`);
    } else {
      // In production, use the production webhook URL
      const webhookUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'}/api/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Production webhook set to: ${webhookUrl}`);
    }
    
    // Launch bot
    await bot.launch();
    console.log('✅ Bot is running!');
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
    return bot;
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    throw error;
  }
}

export async function stopBot() {
  await bot.stop();
  if (process.env.NODE_ENV === 'development') {
    await stopNgrokTunnel();
  }
  console.log('✅ Bot stopped');
}

// Export bot for server-side use
export { bot };