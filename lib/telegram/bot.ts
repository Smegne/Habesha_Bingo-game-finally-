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
  withdrawMode?: boolean;
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
  { command: 'start', description: '🚀 Start the bot' },
  { command: 'register', description: '📝 Register new account' },
  { command: 'play', description: '🎮 Play bingo game' },
  { command: 'deposit', description: '💰 Deposit funds' },
  { command: 'balance', description: '💳 Check balance' },
  { command: 'withdraw', description: '🏧 Withdraw funds' },
  { command: 'invite', description: '👥 Referral program' },
  { command: 'instructions', description: '📖 How to play' },
  { command: 'history', description: '📜 Transaction history' },
  { command: 'profile', description: '👤 View profile' },
  { command: 'support', description: '📞 Contact support' },
  { command: 'about', description: 'ℹ️ About us' },
  { command: 'menu', description: '📋 Main menu' },
  { command: 'cancel', description: '❌ Cancel operation' },
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
bot.telegram.setMyCommands(commands).then(() => {
  console.log('✅ Commands registered with Telegram');
}).catch(err => {
  console.error('❌ Failed to register commands:', err);
});

// ==================== DEBUGGING MIDDLEWARE ====================
bot.use((ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      console.log('📢 COMMAND RECEIVED:', {
        command: text.split(' ')[0],
        from: ctx.from?.id,
        username: ctx.from?.username
      });
    }
  }
  return next();
});

// ==================== HELPER FUNCTIONS ====================

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

// ==================== MAIN MENU FUNCTION ====================
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

// ==================== COMMAND HANDLERS ====================
// ALL COMMAND HANDLERS MUST BE AT THE TOP

// Start command
bot.command('start', async (ctx) => {
  console.log('✅ /start command executed');
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
});

// Register command
bot.command('register', async (ctx) => {
  console.log('✅ /register command executed');
  await executeRegisterCommand(ctx);
});

// Play command
bot.command('play', async (ctx) => {
  console.log('✅ /play command executed');
  await executePlayCommand(ctx);
});

// Deposit command
bot.command('deposit', async (ctx) => {
  console.log('✅ /deposit command executed');
  clearSession(ctx);
  await executeDepositCommand(ctx);
});

// Balance command
bot.command('balance', async (ctx) => {
  console.log('✅ /balance command executed');
  await executeBalanceCommand(ctx);
});

// Withdraw command
bot.command('withdraw', async (ctx) => {
  console.log('✅ /withdraw command executed');
  clearSession(ctx);
  await executeWithdrawCommand(ctx);
});

// Invite command
bot.command('invite', async (ctx) => {
  console.log('✅ /invite command executed');
  await executeInviteCommand(ctx);
});

// Instructions command
bot.command('instructions', async (ctx) => {
  console.log('✅ /instructions command executed');
  await executeInstructionsCommand(ctx);
});

// History command
bot.command('history', async (ctx) => {
  console.log('✅ /history command executed');
  await executeHistoryCommand(ctx);
});

// Profile command
bot.command('profile', async (ctx) => {
  console.log('✅ /profile command executed');
  await executeProfileCommand(ctx);
});

// Support command
bot.command('support', async (ctx) => {
  console.log('✅ /support command executed');
  await executeSupportCommand(ctx);
});

// About command
bot.command('about', async (ctx) => {
  console.log('✅ /about command executed');
  await executeAboutCommand(ctx);
});

// Menu command
bot.command('menu', async (ctx) => {
  console.log('✅ /menu command executed');
  await showMainMenu(ctx);
});

// Cancel command
bot.command('cancel', async (ctx) => {
  console.log('✅ /cancel command executed');
  clearSession(ctx);
  await ctx.reply(
    '✅ Current operation cancelled.',
    Markup.inlineKeyboard([
      [Markup.button.callback('📋 Main Menu', 'show_menu')]
    ])
  );
});

// Skip command (for deposit flow)
bot.command('skip', async (ctx) => {
  console.log('✅ /skip command executed');
  const session = getSession(ctx);
  
  if (session?.depositAmount && session?.transactionRef) {
    await submitDeposit(ctx, null, '⏭️ Skipped screenshot');
  } else {
    await ctx.reply('No pending deposit to skip.');
  }
});

// ==================== ADMIN COMMANDS ====================
bot.command('admin', async (ctx) => {
  console.log('✅ /admin command executed');
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  
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
    { parse_mode: 'Markdown' }
  );
});

bot.command('pending_deposits', async (ctx) => {
  console.log('✅ /pending_deposits command executed');
  await showPendingDeposits(ctx);
});

bot.command('pending_withdrawals', async (ctx) => {
  console.log('✅ /pending_withdrawals command executed');
  await showPendingWithdrawals(ctx);
});

bot.command('approve_deposit', async (ctx) => {
  console.log('✅ /approve_deposit command executed');
  await approveDeposit(ctx);
});

bot.command('reject_deposit', async (ctx) => {
  console.log('✅ /reject_deposit command executed');
  await rejectDeposit(ctx);
});

bot.command('approve_withdrawal', async (ctx) => {
  console.log('✅ /approve_withdrawal command executed');
  await approveWithdrawal(ctx);
});

bot.command('reject_withdrawal', async (ctx) => {
  console.log('✅ /reject_withdrawal command executed');
  await rejectWithdrawal(ctx);
});

// ==================== ACTION HANDLERS ====================
// Menu actions
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
  clearSession(ctx);
  await executeDepositCommand(ctx);
});

bot.action('menu_balance', async (ctx) => {
  await ctx.answerCbQuery();
  await executeBalanceCommand(ctx);
});

bot.action('menu_withdraw', async (ctx) => {
  await ctx.answerCbQuery();
  clearSession(ctx);
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

// Deposit flow actions
bot.action('start_deposit', async (ctx) => {
  await ctx.answerCbQuery();
  
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

bot.action('how_to_get_ref', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '🔑 **How to find Transaction Reference:**\n\n' +
    '📱 **TeleBirr:**\n' +
    '• After payment, look for "Transaction ID" or "Trx ID"\n' +
    '• Example: *TB23894723*\n\n' +
    '🏦 **CBE Birr:**\n' +
    '• Look for "Reference Number" or "Journal Number"\n' +
    '• Example: *CBE12345678*',
    { parse_mode: 'Markdown' }
  );
});

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

bot.action(/deposit_method_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const method = ctx.match[1] as 'telebirr' | 'cbe';
  
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

bot.action('deposit_upload_screenshot', async (ctx) => {
  await ctx.answerCbQuery();
  
  updateSession(ctx, {
    depositStep: 'waiting_screenshot'
  });
  
  await ctx.reply(
    '📸 **Upload Screenshot (Optional)**\n\n' +
    'Send the payment screenshot now.\n\n' +
    '👉 To skip screenshot, type /skip',
    { parse_mode: 'Markdown' }
  );
  
  setTimeout(async () => {
    const currentSession = sessionStore.get(getSessionKey(ctx));
    if (currentSession?.depositStep === 'waiting_screenshot' && 
        currentSession?.depositAmount && 
        currentSession?.transactionRef) {
      await submitDeposit(ctx, null, '⏱️ Auto-submitted (timeout)');
    }
  }, 120000);
});

bot.action('deposit_submit_without_screenshot', async (ctx) => {
  await ctx.answerCbQuery();
  await submitDeposit(ctx, null, '✅ Submitted with reference only');
});

// Admin actions
bot.action('admin_pending_deposits', async (ctx) => {
  await ctx.answerCbQuery();
  await showPendingDeposits(ctx);
});

bot.action('admin_pending_withdrawals', async (ctx) => {
  await ctx.answerCbQuery();
  await showPendingWithdrawals(ctx);
});

// Referral action
bot.action('view_referrals', async (ctx) => {
  await ctx.answerCbQuery();
  await viewReferrals(ctx);
});

// ==================== TEXT HANDLER ====================
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const session = getSession(ctx);
  
  // Handle amount input for deposit
  if (session?.depositStep === 'amount_input' && ctx.message.reply_to_message) {
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
    
    updateSession(ctx, {
      depositAmount: amount,
      depositStep: 'ref_input'
    });
    
    await ctx.reply(
      `🔑 **Step 3: Enter Transaction Reference**\n\n` +
      `Amount: *${amount} Birr*\n\n` +
      `Please enter the **Transaction Reference/ID** from your payment app:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter transaction reference'
        }
      }
    );
  }
  
  // Handle transaction reference input for deposit
  else if (session?.depositStep === 'ref_input' && ctx.message.reply_to_message) {
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
    
    const amount = session?.depositAmount;
    const method = session?.depositMethod;
    
    if (!amount || !method) {
      await ctx.reply('❌ Session expired. Please start over.', 
        Markup.inlineKeyboard([[{ text: '📤 Start New Deposit', callback_data: 'start_deposit' }]])
      );
      return;
    }
    
    updateSession(ctx, {
      transactionRef: transactionRef,
      depositStep: 'screenshot_option'
    });
    
    await ctx.reply(
      `📸 **Step 4: Screenshot (Optional)**\n\n` +
      `**Deposit Summary:**\n` +
      `• Amount: *${amount} Birr*\n` +
      `• Method: *${method === 'telebirr' ? '📱 TeleBirr' : '🏦 CBE Birr'}*\n` +
      `• Transaction Ref: *${transactionRef}*\n\n` +
      `Choose an option:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📸 Upload Screenshot', callback_data: 'deposit_upload_screenshot' }],
            [{ text: '✅ Submit with Reference Only', callback_data: 'deposit_submit_without_screenshot' }],
            [{ text: '🔙 Cancel', callback_data: 'cancel_deposit' }]
          ]
        }
      }
    );
  }
  
  // Handle withdrawal details
  else if (session?.withdrawMode && ctx.message.reply_to_message) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      await ctx.reply(
        '❌ **Invalid format**\n\n' +
        'Please send:\n' +
        '`Amount\nAccountNumber`\n\n' +
        'Example:\n' +
        '`50\n0911-123-4567`',
        { parse_mode: 'Markdown', reply_markup: { force_reply: true } }
      );
      return;
    }
    
    const amount = parseFloat(lines[0].trim());
    const accountNumber = lines[1].trim();
    
    if (isNaN(amount) || amount < 10) {
      await ctx.reply('❌ **Invalid amount**\nMinimum withdrawal is 10 Birr.', 
        { parse_mode: 'Markdown', reply_markup: { force_reply: true } }
      );
      return;
    }
    
    if (!accountNumber || accountNumber.length < 5) {
      await ctx.reply('❌ **Invalid account number**', 
        { parse_mode: 'Markdown', reply_markup: { force_reply: true } }
      );
      return;
    }
    
    await processWithdrawal(ctx, amount, accountNumber);
  }
});

// ==================== PHOTO HANDLER ====================
bot.on('photo', async (ctx) => {
  console.log('📸 Photo received');
  const session = getSession(ctx);
  
  if (!session?.depositAmount || !session?.transactionRef) {
    await ctx.reply('⚠️ No pending deposit found. Start with /deposit');
    return;
  }
  
  await ctx.sendChatAction('typing');
  
  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const screenshotUrl = fileLink.href;
    
    await submitDeposit(ctx, screenshotUrl, '📸 With screenshot');
  } catch (error) {
    console.error('❌ Screenshot error:', error);
    await ctx.reply('⚠️ Screenshot upload failed. Submitting with reference only.');
    await submitDeposit(ctx, null, '⚠️ Screenshot failed');
  }
});

// ==================== COMMAND EXECUTION FUNCTIONS ====================

// Register command execution
async function executeRegisterCommand(ctx: any) {
  const user = ctx.from;
  
  try {
    const existingUser = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (existingUser && existingUser.length > 0) {
      await ctx.reply('✅ You are already registered!',
        Markup.inlineKeyboard([[Markup.button.callback('🎮 Play Game', 'menu_play')]])
      );
      return;
    }
    
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
    
    await db.query(
      `INSERT INTO users 
      (telegram_id, username, first_name, referral_code, is_online, last_active, balance, bonus_balance, role)
      VALUES (?, ?, ?, ?, TRUE, NOW(), 50, 10, 'user')`,
      [user.id.toString(), user.username || `user_${user.id}`, user.first_name, referralCode]
    );
    
    await ctx.reply(
      `✅ **Registration Successful!**\n\n` +
      `💰 You received **50 Birr** welcome bonus!\n` +
      `🎁 Plus **10 Birr** bonus balance!\n\n` +
      `🔑 Your Referral Code: \`${referralCode}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Play Now', web_app: { url: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/' } }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    await ctx.reply('❌ Registration failed. Please try again.');
  }
}

// Play command execution
async function executePlayCommand(ctx: any) {
  const user = ctx.from;
  const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com/';
  
  const isRegistered = await checkUserRegistered(user.id.toString());
  
  if (!isRegistered) {
    await ctx.reply('❌ You need to register first!',
      Markup.inlineKeyboard([[Markup.button.callback('📝 Register Now', 'menu_register')]])
    );
    return;
  }
  
  const miniAppUrl = `${webAppUrl}?tgWebAppStartParam=play`;
  
  await ctx.reply(
    '🎮 **Opening Habesha Bingo Mini App...**',
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

// Deposit command execution
async function executeDepositCommand(ctx: any) {
  const isRegistered = await checkUserRegistered(ctx.from.id.toString());
  
  if (!isRegistered) {
    await ctx.reply('❌ You need to register first!',
      Markup.inlineKeyboard([[Markup.button.callback('📝 Register Now', 'menu_register')]])
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
    '2️⃣ **COPY the Transaction Reference/ID**\n' +
    '3️⃣ Click the button below to submit\n\n' +
    '⚠️ **Minimum deposit:** 10 Birr',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Submit Deposit', callback_data: 'start_deposit' }],
          [{ text: '❓ How to get Transaction Ref?', callback_data: 'how_to_get_ref' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// Balance command execution
async function executeBalanceCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply('❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([[Markup.button.callback('📝 Register Now', 'menu_register')]])
      );
      return;
    }
    
    const userData = await getUserData(user.id.toString());
    
    if (!userData) {
      await ctx.reply('❌ Error fetching user data.');
      return;
    }
    
    await ctx.reply(
      `💰 **Your Wallet**\n\n` +
      `💳 **Main Balance:** *${userData.balance} Birr*\n` +
      `🎁 **Bonus Balance:** *${userData.bonus_balance} Birr*\n` +
      `🎯 **Total Balance:** *${userData.balance + userData.bonus_balance} Birr*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Deposit', callback_data: 'menu_deposit' }, { text: '🏧 Withdraw', callback_data: 'menu_withdraw' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Balance error:', error);
    await ctx.reply('❌ Error fetching balance.');
  }
}

// Withdraw command execution
async function executeWithdrawCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply('❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([[Markup.button.callback('📝 Register Now', 'menu_register')]])
      );
      return;
    }
    
    const userData = await getUserData(user.id.toString());
    
    if (!userData) {
      await ctx.reply('❌ Error fetching user data.');
      return;
    }
    
    // Set withdraw mode
    updateSession(ctx, { withdrawMode: true });
    
    await ctx.reply(
      `🏧 **Withdraw Funds**\n\n` +
      `💰 **Available Balance:** *${userData.balance} Birr*\n` +
      `📝 **Minimum Withdrawal:** 10 Birr\n\n` +
      `**Please send in this format:**\n` +
      `\`\`\`\nAmount\nAccount Number\n\`\`\`\n\n` +
      `**Example:**\n` +
      `\`\`\`\n50\n0911-123-4567\n\`\`\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Amount\nAccount Number'
        }
      }
    );
  } catch (error) {
    console.error('Withdraw error:', error);
    await ctx.reply('❌ Error processing withdrawal request.');
  }
}

// Invite command execution
async function executeInviteCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply('❌ You are not registered. Use /register first.',
        Markup.inlineKeyboard([[Markup.button.callback('📝 Register Now', 'menu_register')]])
      );
      return;
    }
    
    const users = await db.query(
      'SELECT id, referral_code FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ Error fetching referral info.');
      return;
    }
    
    const referralCode = users[0].referral_code;
    const botUsername = ctx.botInfo?.username || 'HabeshaBingoBot';
    const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;
    
    await ctx.reply(
      `👥 **Refer & Earn**\n\n` +
      `🎁 Earn **10 Birr** for each friend who joins!\n\n` +
      `🔑 **Your Referral Code:** \`${referralCode}\`\n\n` +
      `📱 **Share this link:**\n${referralLink}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Share on Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Habesha Bingo!')}` }],
            [{ text: '📊 View Referrals', callback_data: 'view_referrals' }],
            [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Invite error:', error);
    await ctx.reply('❌ Error fetching referral info.');
  }
}

// Instructions command execution
async function executeInstructionsCommand(ctx: any) {
  await ctx.reply(
    '📖 **How to Play Habesha Bingo**\n\n' +
    '**Step 1: Register** 📝\n' +
    '• Use /register to create your account\n' +
    '• Get 50 Birr welcome bonus!\n\n' +
    '**Step 2: Deposit** 💰\n' +
    '• Use /deposit to add funds\n' +
    '• Minimum deposit: 10 Birr\n\n' +
    '**Step 3: Play** 🎮\n' +
    '• Use /play to open the game\n' +
    '• Buy bingo cards and win!\n\n' +
    '**Step 4: Withdraw** 🏧\n' +
    '• Use /withdraw to cash out\n' +
    '• Minimum withdrawal: 10 Birr\n\n' +
    '**Referral Program** 👥\n' +
    '• Earn 10 Birr per referral\n' +
    '• Use /invite to get your link',
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

// History command execution
async function executeHistoryCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply('❌ You are not registered. Use /register first.');
      return;
    }
    
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ Error fetching user data.');
      return;
    }
    
    const userId = users[0].id;
    
    const deposits = await db.query(
      'SELECT amount, method, status, created_at FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    ) as any[];
    
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
    
    await ctx.reply(historyText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💰 Deposit', callback_data: 'menu_deposit' }, { text: '🏧 Withdraw', callback_data: 'menu_withdraw' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    });
  } catch (error) {
    console.error('History error:', error);
    await ctx.reply('❌ Error fetching transaction history.');
  }
}

// Profile command execution
async function executeProfileCommand(ctx: any) {
  try {
    const user = ctx.from;
    
    const isRegistered = await checkUserRegistered(user.id.toString());
    
    if (!isRegistered) {
      await ctx.reply('❌ You are not registered. Use /register first.');
      return;
    }
    
    const userData = await getUserData(user.id.toString());
    
    if (!userData) {
      await ctx.reply('❌ Error fetching profile data.');
      return;
    }
    
    await ctx.reply(
      `👤 **Your Profile**\n\n` +
      `**Personal Info:**\n` +
      `• Name: ${userData.first_name}\n` +
      `• Username: ${userData.username || 'Not set'}\n` +
      `• User ID: \`${userData.id}\`\n` +
      `• Member since: ${new Date(userData.created_at).toLocaleDateString()}\n` +
      `• Account type: ${userData.role === 'admin' ? '👑 Admin' : '👤 User'}\n\n` +
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
    await ctx.reply('❌ Error fetching profile data.');
  }
}

// Support command execution
async function executeSupportCommand(ctx: any) {
  const user = ctx.from;
  const userData = await getUserData(user.id.toString());
  const userId = userData?.id || user.id;
  
  await ctx.reply(
    '📞 **Contact Support**\n\n' +
    '**How can we help you?**\n\n' +
    '• 💳 Deposit issues\n' +
    '• 🏧 Withdrawal problems\n' +
    '• 🎮 Game questions\n' +
    '• 👤 Account issues\n\n' +
    '**Contact methods:**\n\n' +
    '📱 **Telegram:** @HabeshaBingoSupport\n' +
    '📧 **Email:** support@habeshabingo.com\n' +
    `🆔 **Your User ID:** \`${userId}\``,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Contact on Telegram', url: 'https://t.me/HabeshaBingoSupport' }],
          [{ text: '📋 Main Menu', callback_data: 'show_menu' }]
        ]
      }
    }
  );
}

// About command execution
async function executeAboutCommand(ctx: any) {
  await ctx.reply(
    'ℹ️ **About Habesha Bingo**\n\n' +
    '**Version:** 1.0.0\n' +
    '**Developer:** DevVoltz\n' +
    '**Released:** 2024\n\n' +
    '**Features:**\n' +
    '• 🎮 Multiple bingo game modes\n' +
    '• 💰 Real money prizes\n' +
    '• 👥 Referral program\n' +
    '• 📱 Telegram Mini App integration\n' +
    '• 🔒 Secure transactions\n\n' +
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

// ==================== ADMIN FUNCTIONS ====================

async function approveDeposit(ctx: any) {
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ Not authorized.');
    return;
  }
  
  const transactionRef = ctx.payload?.trim();
  
  if (!transactionRef) {
    await ctx.reply('❌ Please provide a transaction reference.\nUsage: /approve_deposit TRANSACTION_REF');
    return;
  }
  
  try {
    await db.query('START TRANSACTION');
    
    const deposits = await db.query(
      `SELECT d.*, u.id as user_uuid, u.telegram_id, u.username, u.first_name, u.balance 
       FROM deposits d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.transaction_ref = ? AND d.status = 'pending'
       FOR UPDATE`,
      [transactionRef]
    ) as any[];
    
    if (!deposits || deposits.length === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ No pending deposit found.');
      return;
    }
    
    const deposit = deposits[0];
    
    await db.query(
      `UPDATE deposits SET status = 'approved', approved_at = NOW() WHERE id = ?`,
      [deposit.id]
    );
    
    await db.query(
      `UPDATE users SET balance = balance + ? WHERE id = ?`,
      [deposit.amount, deposit.user_uuid]
    );
    
    await db.query('COMMIT');
    
    try {
      await ctx.telegram.sendMessage(
        deposit.telegram_id,
        `✅ **Deposit Approved!**\n\n💰 Amount: *${deposit.amount} Birr*`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
    
    await ctx.reply(`✅ Deposit approved for ${deposit.amount} Birr.`);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Approve error:', error);
    await ctx.reply('❌ Error approving deposit.');
  }
}

async function rejectDeposit(ctx: any) {
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ Not authorized.');
    return;
  }
  
  const transactionRef = ctx.payload?.trim();
  
  if (!transactionRef) {
    await ctx.reply('❌ Please provide a transaction reference.');
    return;
  }
  
  try {
    const deposits = await db.query(
      `SELECT d.*, u.telegram_id, u.first_name 
       FROM deposits d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.transaction_ref = ? AND d.status = 'pending'`,
      [transactionRef]
    ) as any[];
    
    if (!deposits || deposits.length === 0) {
      await ctx.reply('❌ No pending deposit found.');
      return;
    }
    
    const deposit = deposits[0];
    
    await db.query(
      `UPDATE deposits SET status = 'rejected' WHERE id = ?`,
      [deposit.id]
    );
    
    try {
      await ctx.telegram.sendMessage(
        deposit.telegram_id,
        `❌ **Deposit Rejected**\n\n💰 Amount: *${deposit.amount} Birr*`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
    
    await ctx.reply(`✅ Deposit rejected.`);
  } catch (error) {
    console.error('Reject error:', error);
    await ctx.reply('❌ Error rejecting deposit.');
  }
}

async function approveWithdrawal(ctx: any) {
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ Not authorized.');
    return;
  }
  
  const withdrawalId = ctx.payload?.trim();
  
  if (!withdrawalId) {
    await ctx.reply('❌ Please provide a withdrawal ID.\nUsage: /approve_withdrawal WITHDRAWAL_ID');
    return;
  }
  
  try {
    await db.query('START TRANSACTION');
    
    const withdrawals = await db.query(
      `SELECT w.*, u.id as user_uuid, u.telegram_id, u.balance 
       FROM withdrawals w 
       JOIN users u ON w.user_id = u.id 
       WHERE w.id = ? AND w.status = 'pending'
       FOR UPDATE`,
      [withdrawalId]
    ) as any[];
    
    if (!withdrawals || withdrawals.length === 0) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ No pending withdrawal found.');
      return;
    }
    
    const withdrawal = withdrawals[0];
    
    if (withdrawal.balance < withdrawal.amount) {
      await db.query('ROLLBACK');
      await ctx.reply('❌ Insufficient balance.');
      return;
    }
    
    await db.query(
      `UPDATE withdrawals SET status = 'approved', approved_at = NOW() WHERE id = ?`,
      [withdrawal.id]
    );
    
    await db.query(
      `UPDATE users SET balance = balance - ? WHERE id = ?`,
      [withdrawal.amount, withdrawal.user_uuid]
    );
    
    await db.query('COMMIT');
    
    try {
      await ctx.telegram.sendMessage(
        withdrawal.telegram_id,
        `✅ **Withdrawal Approved!**\n\n💰 Amount: *${withdrawal.amount} Birr*`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
    
    await ctx.reply(`✅ Withdrawal approved for ${withdrawal.amount} Birr.`);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Approve withdrawal error:', error);
    await ctx.reply('❌ Error approving withdrawal.');
  }
}

async function rejectWithdrawal(ctx: any) {
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ Not authorized.');
    return;
  }
  
  const withdrawalId = ctx.payload?.trim();
  
  if (!withdrawalId) {
    await ctx.reply('❌ Please provide a withdrawal ID.');
    return;
  }
  
  try {
    const withdrawals = await db.query(
      `SELECT w.*, u.telegram_id 
       FROM withdrawals w 
       JOIN users u ON w.user_id = u.id 
       WHERE w.id = ? AND w.status = 'pending'`,
      [withdrawalId]
    ) as any[];
    
    if (!withdrawals || withdrawals.length === 0) {
      await ctx.reply('❌ No pending withdrawal found.');
      return;
    }
    
    const withdrawal = withdrawals[0];
    
    await db.query(
      `UPDATE withdrawals SET status = 'rejected' WHERE id = ?`,
      [withdrawal.id]
    );
    
    try {
      await ctx.telegram.sendMessage(
        withdrawal.telegram_id,
        `❌ **Withdrawal Rejected**\n\n💰 Amount: *${withdrawal.amount} Birr*`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
    
    await ctx.reply(`✅ Withdrawal rejected.`);
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    await ctx.reply('❌ Error rejecting withdrawal.');
  }
}

async function showPendingDeposits(ctx: any) {
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ Not authorized.');
    return;
  }
  
  try {
    const deposits = await db.query(
      `SELECT d.*, u.username, u.first_name 
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
      message += `   User: ${dep.first_name}\n`;
      message += `   Ref: \`${dep.transaction_ref}\`\n`;
      message += `   Approve: /approve_deposit ${dep.transaction_ref}\n\n`;
    });
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Pending deposits error:', error);
    await ctx.reply('❌ Error fetching pending deposits.');
  }
}

async function showPendingWithdrawals(ctx: any) {
  const user = ctx.from;
  
  if (!isAdmin(user.id.toString())) {
    await ctx.reply('❌ Not authorized.');
    return;
  }
  
  try {
    const withdrawals = await db.query(
      `SELECT w.*, u.username, u.first_name, u.balance 
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
      message += `   User: ${wd.first_name}\n`;
      message += `   Account: \`${wd.account_number}\`\n`;
      message += `   Balance: ${wd.balance} Birr\n`;
      message += `   Approve: /approve_withdrawal ${wd.id}\n\n`;
    });
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Pending withdrawals error:', error);
    await ctx.reply('❌ Error fetching pending withdrawals.');
  }
}

// ==================== REFERRAL FUNCTIONS ====================

async function viewReferrals(ctx: any) {
  try {
    const user = ctx.from;
    
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [user.id.toString()]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered.');
      return;
    }
    
    const userId = users[0].id;
    
    const referrals = await db.query(
      'SELECT username, first_name, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    ) as any[];
    
    if (!referrals || referrals.length === 0) {
      await ctx.reply('📊 **You haven\'t referred anyone yet.**');
      return;
    }
    
    let referralList = '📊 **Your Referrals:**\n\n';
    referrals.forEach((ref, index) => {
      const name = ref.first_name || ref.username || 'Anonymous';
      const date = new Date(ref.created_at).toLocaleDateString();
      referralList += `${index + 1}. ${name} - ${date}\n`;
    });
    
    await ctx.reply(referralList, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('View referrals error:', error);
    await ctx.reply('❌ Error fetching referrals.');
  }
}

// ==================== DEPOSIT FUNCTIONS ====================

async function submitDeposit(ctx: any, screenshotUrl: string | null, sourceNote: string = '') {
  try {
    await ctx.sendChatAction('typing');
    
    const session = getSession(ctx);
    const telegramId = ctx.from.id.toString();
    const amount = session?.depositAmount;
    const method = session?.depositMethod;
    const transactionRef = session?.transactionRef;
    
    if (!amount || !method || !transactionRef) {
      await ctx.reply('❌ Missing deposit information. Please start over.',
        Markup.inlineKeyboard([[{ text: '📤 Start New Deposit', callback_data: 'start_deposit' }]])
      );
      return;
    }
    
    const users = await db.query(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered.');
      return;
    }
    
    const userUuid = users[0].id;
    
    const existingDeposit = await db.query(
      'SELECT id FROM deposits WHERE transaction_ref = ?',
      [transactionRef]
    ) as any[];
    
    if (existingDeposit && existingDeposit.length > 0) {
      await ctx.reply('❌ Duplicate transaction reference.');
      return;
    }
    
    await db.query(
      `INSERT INTO deposits (user_id, amount, method, transaction_ref, screenshot_url, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userUuid, amount, method, transactionRef, screenshotUrl]
    );
    
    clearSession(ctx);
    
    await ctx.reply(
      `✅ **Deposit Request Submitted!**\n\n` +
      `💰 **Amount:** ${amount} Birr\n` +
      `🔑 **Transaction Ref:** \`${transactionRef}\`\n` +
      `⏱️ **Status:** Pending Approval\n\n` +
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
  } catch (error) {
    console.error('Deposit submission error:', error);
    await ctx.reply('❌ Failed to submit deposit. Please try again.');
  }
}

// ==================== WITHDRAWAL FUNCTIONS ====================

async function processWithdrawal(ctx: any, amount: number, accountNumber: string) {
  try {
    const users = await db.query(
      'SELECT id, balance FROM users WHERE telegram_id = ?',
      [ctx.from.id.toString()]
    ) as any[];
    
    if (!users || users.length === 0) {
      await ctx.reply('❌ You are not registered.');
      return;
    }
    
    if (users[0].balance < amount) {
      await ctx.reply('❌ Insufficient balance.');
      return;
    }
    
    const insertResult = await db.query(
      'INSERT INTO withdrawals (user_id, amount, account_number, status, created_at) VALUES (?, ?, ?, "pending", NOW())',
      [users[0].id, amount, accountNumber]
    );
    
    clearSession(ctx);
    
    await ctx.reply(
      `✅ **Withdrawal Request Submitted!**\n\n` +
      `💰 **Amount:** *${amount} Birr*\n` +
      `📱 **Account:** \`${accountNumber}\`\n` +
      `⏱️ **Status:** Pending Approval`,
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
  } catch (error) {
    console.error('Withdrawal processing error:', error);
    await ctx.reply('❌ Failed to process withdrawal.');
  }
}

// ==================== NGROK FUNCTIONS ====================

export async function startNgrokTunnel(port: number = 3000): Promise<string> {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Ngrok tunnel skipped in production mode');
    return process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com';
  }

  if (!NGROK_AUTH_TOKEN) {
    throw new Error('NGROK_AUTH_TOKEN is required for development tunneling');
  }

  try {
    if (!ngrok) {
      ngrok = await import('@ngrok/ngrok');
    }

    try {
      const tunnels = await ngrok.tunnels();
      if (tunnels.length > 0) {
        ngrokUrl = tunnels[0].public_url;
        console.log(`✅ Using existing Ngrok tunnel: ${ngrokUrl}`);
        return ngrokUrl;
      }
    } catch (e) {
      console.log('No existing tunnels found, creating new one...');
    }

    const listener = await ngrok.connect({
      addr: port,
      authtoken: NGROK_AUTH_TOKEN,
    });
    
    ngrokUrl = listener.url();
    console.log(`✅ Ngrok tunnel started: ${ngrokUrl}`);
    
    botWebhookUrl = `${ngrokUrl}/api/webhook`;
    await bot.telegram.setWebhook(botWebhookUrl);
    console.log(`✅ Webhook set to: ${botWebhookUrl}`);
    
    return ngrokUrl;
  } catch (error) {
    console.error('❌ Ngrok tunnel failed:', error);
    return process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com';
  }
}

export async function stopNgrokTunnel(): Promise<void> {
  if (process.env.NODE_ENV === 'development' && ngrok) {
    try {
      await ngrok.disconnect();
      console.log('✅ Ngrok tunnel stopped');
    } catch (error) {
      console.error('Failed to stop ngrok tunnel:', error);
    }
  }
  ngrokUrl = null;
  botWebhookUrl = null;
}

export function getNgrokUrl(): string | null {
  return ngrokUrl;
}

export function getBotWebhookUrl(): string | null {
  return botWebhookUrl;
}

// ==================== ERROR HANDLING ====================

bot.catch((err: any, ctx: Context) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err);
  
  ctx.reply(
    '❌ **An error occurred**\n\n' +
    'Please try again or contact support.',
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

// ==================== START BOT ====================

export async function startBot() {
  try {
    console.log('🤖 Starting Habesha Bingo Bot...');
    console.log('📝 Environment:', process.env.NODE_ENV);
    console.log('👑 Admin IDs:', ADMIN_IDS);
    
    if (process.env.NODE_ENV === 'development') {
      const tunnelUrl = await startNgrokTunnel(3000);
      console.log(`✅ Ngrok URL: ${tunnelUrl}`);
    } else {
      const webhookUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://habeshabingo.devvoltz.com'}/api/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Production webhook set to: ${webhookUrl}`);
    }
    
    await bot.launch();
    console.log('✅ Bot is running!');
    
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