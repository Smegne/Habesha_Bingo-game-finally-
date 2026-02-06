// scripts/fix-telegram-ids.ts
import { db } from '@/lib/mysql-db';

async function fixTelegramIds() {
  try {
    console.log('🔧 Starting Telegram ID fix script...');
    
    // Get all users
    const result = await db.query('SELECT id, telegram_id, telegram_user_id FROM users') as any;
    
    let users = [];
    if (Array.isArray(result) && result[0]) {
      const [rows] = result;
      if (Array.isArray(rows)) {
        users = rows;
      } else if (rows && typeof rows === 'object' && rows.id) {
        users = [rows];
      }
    }
    
    console.log(`📊 Found ${users.length} users`);
    
    let updatedCount = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        const telegramId = user.telegram_id;
        
        // If telegram_id is numeric, add "user" prefix
        if (telegramId && /^\d+$/.test(telegramId)) {
          const newTelegramId = `user${telegramId}`;
          const numericId = parseInt(telegramId);
          
          await db.query(
            'UPDATE users SET telegram_id = ?, telegram_user_id = ? WHERE id = ?',
            [newTelegramId, numericId, user.id]
          );
          
          console.log(`✅ Updated ${user.id}: ${telegramId} -> ${newTelegramId} (numeric: ${numericId})`);
          updatedCount++;
        }
        // If telegram_id already has "user" prefix, extract numeric ID
        else if (telegramId && telegramId.startsWith('user') && /^\d+$/.test(telegramId.substring(4))) {
          const numericId = parseInt(telegramId.substring(4));
          
          // Only update if telegram_user_id is not set
          if (!user.telegram_user_id) {
            await db.query(
              'UPDATE users SET telegram_user_id = ? WHERE id = ?',
              [numericId, user.id]
            );
            
            console.log(`✅ Added telegram_user_id for ${user.id}: ${numericId}`);
            updatedCount++;
          } else {
            console.log(`⚠️ User ${user.id} already has telegram_user_id: ${user.telegram_user_id}`);
          }
        }
        // Handle other formats
        else if (telegramId && telegramId.includes('user') && telegramId.includes('@')) {
          // This is the email-like format: "userYWRpbm5vQG1770400825524"
          // Extract numeric part if possible
          const matches = telegramId.match(/\d+/g);
          if (matches && matches.length > 0) {
            const numericId = parseInt(matches[matches.length - 1]);
            if (!isNaN(numericId) && numericId > 1000) {
              await db.query(
                'UPDATE users SET telegram_user_id = ? WHERE id = ?',
                [numericId, user.id]
              );
              
              console.log(`✅ Extracted telegram_user_id for ${user.id}: ${numericId} (from: ${telegramId})`);
              updatedCount++;
            }
          }
        }
        else {
          console.log(`ℹ️ Skipping ${user.id}: telegram_id = "${telegramId}"`);
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user.id}:`, error);
        errors++;
      }
    }
    
    console.log(`\n🎉 Script completed:`);
    console.log(`✅ Updated: ${updatedCount} users`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total: ${users.length} users processed`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
fixTelegramIds().then(() => {
  console.log('✨ Script execution finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});