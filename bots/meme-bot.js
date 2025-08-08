// meme-bot.js - UPDATED TO SAVE USERNAMES
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs').promises;
const https = require('https');

// ============================================
// CONFIGURATION CHECK
// ============================================
console.log('🔍 Checking configuration...');

const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'OPENAI_API_KEY', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease add these to your .env.local file in the parent directory');
  process.exit(1);
}

console.log('✅ All required environment variables found');

// ============================================
// INITIALIZE SERVICES
// ============================================
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// ============================================
// CONSTANTS
// ============================================
const PUMPIT_GROUP_ID = '-1002887330073';
const PAYMENT_WALLET = 'F3bVwQWTNTDNMtHr4P1h58DwLiFcre1F5mmeERrrBzdJ';
const OWNER_ID = '1923063992';
const OWNER_USERNAME = 'Growthewealth';
const PREMIUM_PRICE = 0.065;
const PREMIUM_DAYS = 30;

// ============================================
// DATA STORES
// ============================================
const userLimits = new Map();
const paymentReservations = new Map();
const verifiedPayments = new Set();
const userPaymentHistory = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserDailyLimit(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}-${today}`;
  
  if (!userLimits.has(userKey)) {
    userLimits.set(userKey, 0);
  }
  
  return userLimits.get(userKey);
}

async function incrementUsage(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}-${today}`;
  const current = userLimits.get(userKey) || 0;
  userLimits.set(userKey, current + 1);
}

async function isPremium(userId) {
  try {
    const { data, error } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_id', userId.toString())
      .gte('expires_at', new Date().toISOString())
      .single();
    
    return !!data;
  } catch (error) {
    return false;
  }
}

// UPDATED: Function to update username for existing users
async function updateUserUsername(userId, username) {
  if (!username) return;
  
  try {
    // Update username for existing premium users
    await supabase
      .from('premium_users')
      .update({ telegram_username: username })
      .eq('telegram_id', userId.toString());
    
    console.log(`Updated username @${username} for user ${userId}`);
  } catch (error) {
    console.error('Error updating username:', error);
  }
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath).catch(() => {});
      reject(err);
    });
  });
}

async function generateMeme(prompt, isPremiumUser) {
  try {
    console.log(`🎨 Generating meme: "${prompt}"`);
    
    let finalPrompt = prompt;
    if (!isPremiumUser) {
      finalPrompt = `${prompt}. Add cartoon red lips on the person's face.`;
    } else {
      finalPrompt = `${prompt}. Add cartoon red lips somewhere creative in the scene.`;
    }
    
    finalPrompt += ' Include "$PUMPIT" text in the image.';
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
    });
    
    if (!response.data || !response.data[0] || !response.data[0].url) {
      throw new Error('No image generated');
    }
    
    return response.data[0].url;
  } catch (error) {
    console.error('DALL-E error:', error);
    throw error;
  }
}

async function saveMemeToSupabase(imageUrl, userId, username, topic, description) {
  let tempPath = null;
  try {
    tempPath = path.join(__dirname, `temp_${Date.now()}.png`);
    await downloadImage(imageUrl, tempPath);
    
    const fileBuffer = await fs.readFile(tempPath);
    
    const fileName = `telegram-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memes')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png'
      });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('memes')
      .getPublicUrl(fileName);
    
    const { data: memeData, error: dbError } = await supabase
      .from('memes')
      .insert({
        image_url: publicUrl,
        creator_x_handle: username || 'telegram_user',
        creator_wallet: null,
        likes_count: 0,
        shares_count: 0,
        views_count: 0,
        topic: topic || 'PUMPIT Meme',
        description: description || `${topic} - Created via Telegram bot`,
        source: 'telegram',
        from_telegram_bot: true
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
    
    console.log('✅ Meme saved successfully');
    return { publicUrl, memeId: memeData.id };
  } catch (error) {
    console.error('Supabase error:', error);
    throw error;
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    }
  }
}

// ============================================
// PAYMENT VERIFICATION SYSTEM
// ============================================

async function verifyBlockchainPayment(signature, paymentId) {
  try {
    console.log(`Verifying: ${signature} with Payment ID: ${paymentId}`);
    
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      return { 
        success: false, 
        error: 'INVALID_SIGNATURE',
        errorMessage: 'Transaction not found on blockchain'
      };
    }
    
    const txTime = tx.blockTime * 1000;
    const now = Date.now();
    const minutesSince = (now - txTime) / (1000 * 60);
    
    if (minutesSince > 60) {
      return { 
        success: false, 
        error: 'TOO_OLD',
        errorMessage: `Transaction is ${Math.floor(minutesSince)} minutes old (max 60 minutes)`
      };
    }
    
    // Check for Payment ID in memo
    let memoFound = false;
    
    for (const instruction of tx.transaction.message.instructions) {
      if (instruction.program === 'spl-memo') {
        const memoText = instruction.parsed || '';
        if (memoText.includes(paymentId)) {
          memoFound = true;
          break;
        }
      }
    }
    
    if (!memoFound) {
      return { 
        success: false, 
        error: 'NO_PAYMENT_ID',
        errorMessage: `Payment ID "${paymentId}" not found in transaction memo`
      };
    }
    
    // Verify the transfer amount and recipient
    let transferAmount = 0;
    let correctRecipient = false;
    
    for (const instruction of tx.transaction.message.instructions) {
      if (instruction.parsed && instruction.parsed.type === 'transfer') {
        const info = instruction.parsed.info;
        
        if (info.destination === PAYMENT_WALLET) {
          correctRecipient = true;
          transferAmount = info.lamports / 1000000000;
          break;
        }
      }
    }
    
    if (!correctRecipient && tx.meta) {
      const accountKeys = tx.transaction.message.accountKeys;
      const walletIndex = accountKeys.findIndex(key => 
        key.pubkey && key.pubkey.toString() === PAYMENT_WALLET
      );
      
      if (walletIndex !== -1) {
        const preBalance = tx.meta.preBalances[walletIndex] || 0;
        const postBalance = tx.meta.postBalances[walletIndex] || 0;
        const received = (postBalance - preBalance) / 1000000000;
        
        if (received > 0) {
          correctRecipient = true;
          transferAmount = received;
        }
      }
    }
    
    if (!correctRecipient) {
      return { 
        success: false, 
        error: 'WRONG_WALLET',
        errorMessage: 'Payment was sent to wrong wallet address'
      };
    }
    
    const expectedAmount = PREMIUM_PRICE;
    const minAmount = expectedAmount * 0.99;
    const maxAmount = expectedAmount * 1.01;
    
    if (transferAmount < minAmount || transferAmount > maxAmount) {
      return { 
        success: false, 
        error: 'WRONG_AMOUNT',
        errorMessage: `Sent ${transferAmount.toFixed(4)} SOL, expected ${expectedAmount} SOL`
      };
    }
    
    return {
      success: true,
      amount: transferAmount.toFixed(4),
      signature: signature,
      paymentId: paymentId
    };
    
  } catch (error) {
    console.error('Blockchain verification error:', error);
    throw error;
  }
}

// ============================================
// EXPIRY REMINDER SYSTEM
// ============================================

async function checkExpiryReminders() {
  try {
    console.log('🔔 Checking for expiring premium subscriptions...');
    
    const { data: premiumUsers, error } = await supabase
      .from('premium_users')
      .select('*')
      .gte('expires_at', new Date().toISOString());
    
    if (error) throw error;
    if (!premiumUsers || premiumUsers.length === 0) return;
    
    const now = new Date();
    
    for (const user of premiumUsers) {
      const expiryDate = new Date(user.expires_at);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 5 && daysUntilExpiry > 0) {
        let reminderMessage = '';
        
        switch(daysUntilExpiry) {
          case 5:
            reminderMessage = `⏰ Premium expires in 5 days!\n\nRenew now: /subscribe`;
            break;
          case 4:
            reminderMessage = `⚠️ Premium expires in 4 days!\n\nDon't lose your benefits: /subscribe`;
            break;
          case 3:
            reminderMessage = `⏳ Only 3 days left!\n\n🎁 Special: Mention "RENEW3" for bonus day!\n\n/subscribe`;
            break;
          case 2:
            reminderMessage = `🔴 2 days until expiry!\n\nKeep your premium: /subscribe`;
            break;
          case 1:
            reminderMessage = `🚨 LAST DAY!\n\nPremium expires TOMORROW!\n\nRenew NOW: /subscribe`;
            break;
        }
        
        try {
          await bot.sendMessage(user.telegram_id, reminderMessage);
          console.log(`Sent ${daysUntilExpiry}-day reminder to ${user.telegram_id}`);
        } catch (err) {
          console.error(`Failed to send reminder: ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

function scheduleDailyReminderCheck() {
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(10, 0, 0, 0);
  
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  const msUntilScheduledTime = scheduledTime - now;
  
  setTimeout(() => {
    checkExpiryReminders();
    setInterval(checkExpiryReminders, 24 * 60 * 60 * 1000);
  }, msUntilScheduledTime);
  
  console.log(`📅 Reminders scheduled for ${scheduledTime.toLocaleString()}`);
}

// ============================================
// BOT COMMANDS
// ============================================

// /start command - UPDATED to save username
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name || 'there';
  
  // Update username if user is premium
  if (username) {
    await updateUserUsername(userId, username);
  }
  
  const welcomeMessage = `
🚀 Welcome ${firstName} to Pumper Meme Bot!

Create AI-powered $PUMPIT memes with just a description!

📝 **Commands:**
/meme [description] - Create a meme
/status - Check your daily limit
/subscribe - Get premium
/help - Show all commands

**Free:** 1 meme/day
**Premium:** 3 memes/day

Let's PUMP IT! 🎨`;
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// /meme command - UPDATED to save username
bot.onText(/\/meme (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const description = match[1];
  
  // Update username if user is premium
  if (username) {
    await updateUserUsername(userId, username);
  }
  
  try {
    const isOwner = userId.toString() === OWNER_ID;
    
    // Check limits
    if (!isOwner) {
      const premium = await isPremium(userId);
      const dailyLimit = premium ? 3 : 1;
      const currentUsage = await getUserDailyLimit(userId);
      
      if (currentUsage >= dailyLimit) {
        const limitMessage = premium 
          ? "Daily limit reached! You've used all 3 premium memes today. Reset at midnight! 🌙"
          : "Daily limit reached! Free users get 1 meme/day. Upgrade to premium for 3 daily memes! /subscribe 🚀";
        
        return bot.sendMessage(chatId, limitMessage);
      }
    }
    
    const statusMsg = await bot.sendMessage(chatId, "🎨 Generating your $PUMPIT meme...");
    
    // Generate meme
    const premium = await isPremium(userId) || isOwner;
    const imageUrl = await generateMeme(description, premium);
    
    // Simple description
    const seoDescription = `${description} - PUMPIT meme by ${username || 'community'}`;
    
    // Save to Supabase
    const { publicUrl, memeId } = await saveMemeToSupabase(
      imageUrl, 
      userId, 
      username, 
      description, 
      seoDescription
    );
    
    // Update usage
    if (!isOwner) {
      await incrementUsage(userId);
    }
    
    // Calculate remaining
    const currentUsage = await getUserDailyLimit(userId);
    const dailyLimit = isOwner ? '∞' : (premium ? 3 : 1);
    const remaining = isOwner ? '∞' : (dailyLimit - currentUsage);
    
    // Delete status message
    bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    
    // Send to user
    const memeUrl = `https://letspumpit.com/meme/${memeId}`;
    const caption = `✨ Your meme is ready!
    
📊 Remaining today: ${remaining}
🌐 View: ${memeUrl}

💰 Buy $PUMPIT:
B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk

${!premium && !isOwner ? '🚀 Upgrade: /subscribe' : ''}`;
    
    await bot.sendPhoto(chatId, imageUrl, { caption });
    
    // Forward to group
    if (PUMPIT_GROUP_ID) {
      try {
        await bot.sendPhoto(PUMPIT_GROUP_ID, imageUrl, { 
          caption: `New meme: "${description}"\n\nCreate yours: @pumpermemebot` 
        });
      } catch (err) {
        console.log('Group forward failed:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, "❌ Oops! Something went wrong. Please try again.");
  }
});

// /subscribe command - UPDATED to include username info
bot.onText(/\/subscribe/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'User';
  
  const isPremiumUser = await isPremium(userId);
  if (isPremiumUser) {
    return bot.sendMessage(chatId, "✅ You already have premium! Check /status");
  }
  
  const paymentId = `PUMP${userId.toString().slice(-4)}${Date.now().toString().slice(-6)}`;
  
  paymentReservations.set(paymentId, {
    userId: userId,
    username: username, // Store username in reservation
    timestamp: Date.now(),
    chatId: chatId,
    status: 'pending'
  });
  
  setTimeout(() => {
    if (paymentReservations.has(paymentId)) {
      paymentReservations.delete(paymentId);
    }
  }, 60 * 60 * 1000);
  
  const subscribeMessage = `
⭐ **Premium Subscription**

Price: **${PREMIUM_PRICE} SOL**

Your Telegram: @${username}
${!username ? '⚠️ Set a username in Telegram settings for website access!' : '✅ You can use website with @' + username}

🔐 **YOUR PAYMENT ID:**
\`${paymentId}\`

**Steps:**
1. Copy Payment ID above
2. Send ${PREMIUM_PRICE} SOL to:
\`${PAYMENT_WALLET}\`
3. Add Payment ID in memo
4. Copy transaction signature
5. Verify: \`/verify ${paymentId} SIGNATURE\`

Contact: @${OWNER_USERNAME}`;
  
  bot.sendMessage(chatId, subscribeMessage, { parse_mode: 'Markdown' });
});

// /verify command - UPDATED to save username
bot.onText(/\/verify (\S+)\s+(\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username; // Get current username
  const paymentId = match[1].trim();
  const signature = match[2].trim();
  
  const statusMsg = await bot.sendMessage(chatId, "🔍 Verifying payment...");
  
  try {
    const reservation = paymentReservations.get(paymentId);
    
    if (!reservation) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Invalid Payment ID. Use /subscribe for new one.");
    }
    
    if (reservation.userId !== userId) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ This Payment ID isn't yours.");
    }
    
    if (reservation.status === 'completed') {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Already used.");
    }
    
    if (verifiedPayments.has(signature)) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Signature already used.");
    }
    
    const verification = await verifyBlockchainPayment(signature, paymentId);
    
    if (verification.success) {
      reservation.status = 'completed';
      verifiedPayments.add(signature);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + PREMIUM_DAYS);
      
      // UPDATED: Save with username
      await supabase
        .from('premium_users')
        .upsert({
          telegram_id: userId.toString(),
          telegram_username: username || reservation.username, // Save username
          transaction_signature: signature,
          payment_date: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          amount: verification.amount
        });
      
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      
      const successMessage = `
🎉 **Payment Verified!**

✅ Premium activated for ${PREMIUM_DAYS} days!
✅ You can now create 3 memes per day!
${username ? `✅ Website access enabled for @${username}` : '⚠️ Set a Telegram username to use website'}

Try it: /meme your idea`;
      
      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      
      bot.sendMessage(OWNER_ID, `💰 New premium: @${username || reservation.username} paid ${verification.amount} SOL`);
      
    } else {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      bot.sendMessage(chatId, `❌ Verification failed: ${verification.errorMessage}`);
    }
    
  } catch (error) {
    console.error('Verify error:', error);
    bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// /status command - UPDATED to show username
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  
  // Update username if premium
  if (username) {
    await updateUserUsername(userId, username);
  }
  
  const isOwner = userId.toString() === OWNER_ID;
  
  if (isOwner) {
    return bot.sendMessage(chatId, "👑 Owner Status\n\nUnlimited memes!");
  }
  
  const premium = await isPremium(userId);
  const dailyLimit = premium ? 3 : 1;
  const currentUsage = await getUserDailyLimit(userId);
  const remaining = dailyLimit - currentUsage;
  
  let statusMessage = `📊 Your Status\n\n`;
  statusMessage += `Telegram: @${username || 'no username set'}\n`;
  statusMessage += `Type: ${premium ? '⭐ Premium' : '🆓 Free'}\n`;
  statusMessage += `Daily Limit: ${dailyLimit}\n`;
  statusMessage += `Used Today: ${currentUsage}\n`;
  statusMessage += `Remaining: ${remaining}`;

  if (premium) {
    const { data } = await supabase
      .from('premium_users')
      .select('expires_at')
      .eq('telegram_id', userId.toString())
      .single();
    
    if (data) {
      const expiryDate = new Date(data.expires_at).toLocaleDateString();
      statusMessage += `\nExpires: ${expiryDate}`;
      statusMessage += `\n\n✅ Website access: letspumpit.com`;
    }
  } else {
    statusMessage += '\n\n🚀 Upgrade: /subscribe';
  }
  
  if (!username) {
    statusMessage += '\n\n⚠️ Set a Telegram username to use website!';
  }
  
  bot.sendMessage(chatId, statusMessage);
});

// /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  let helpMessage = `
📚 **Commands**

/meme [description] - Create meme
/status - Check limits & username
/subscribe - Get premium
/verify [id] [sig] - Verify payment
/help - Show this

**Website Access:**
Premium users can use @username on website

Example: /meme dog wearing sunglasses`;

  if (userId.toString() === OWNER_ID) {
    helpMessage += `

👑 **Admin:**
/grant [id] - Grant premium
/subscribers - View users
/updateusers - Update all usernames`;
  }
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Admin commands
bot.onText(/\/grant (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId.toString() !== OWNER_ID) return;
  
  const targetId = match[1];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PREMIUM_DAYS);
  
  try {
    // Try to get username of target user (if we have it)
    const targetUsername = ''; // Would need to look this up somehow
    
    await supabase
      .from('premium_users')
      .upsert({
        telegram_id: targetId.toString(),
        telegram_username: targetUsername, // Save if available
        transaction_signature: 'manual_grant_' + Date.now(),
        payment_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        amount: 0
      });
    
    bot.sendMessage(chatId, `✅ Premium granted to ${targetId}`);
    bot.sendMessage(targetId, `🎉 You got premium for ${PREMIUM_DAYS} days!`);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Failed: ${error.message}`);
  }
});

// NEW: Admin command to update all usernames
bot.onText(/\/updateusers/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId.toString() !== OWNER_ID) return;
  
  bot.sendMessage(chatId, "🔄 Updating usernames... Users need to use any command for update.");
  
  // Can't force update all users, but this prepares the system
  bot.sendMessage(chatId, "✅ System ready. Usernames will update as users interact with bot.");
});

bot.onText(/\/subscribers/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId.toString() !== OWNER_ID) return;
  
  try {
    const { data } = await supabase
      .from('premium_users')
      .select('*')
      .gte('expires_at', new Date().toISOString());
    
    if (!data || data.length === 0) {
      return bot.sendMessage(chatId, "No active subscribers");
    }
    
    let message = `👑 Premium Users (${data.length})\n\n`;
    for (const sub of data) {
      const expiry = new Date(sub.expires_at).toLocaleDateString();
      message += `ID: ${sub.telegram_id}\n`;
      message += `Username: @${sub.telegram_username || 'not set'}\n`;
      message += `Expires: ${expiry}\n\n`;
    }
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, "Error: " + error.message);
  }
});

// Error handler
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// ============================================
// STARTUP
// ============================================

// Schedule reminders
scheduleDailyReminderCheck();
setTimeout(checkExpiryReminders, 5000);

// Test connection
bot.getMe().then(botInfo => {
  console.log('================================================');
  console.log('🚀 PUMPER BOT IS RUNNING!');
  console.log(`✅ Connected as @${botInfo.username}`);
  console.log('================================================');
  console.log('📝 USERNAME TRACKING ENABLED');
  console.log('Users can now use @username on website!');
  console.log('================================================');
}).catch(error => {
  console.error('❌ Failed to connect:', error.message);
  process.exit(1);
});