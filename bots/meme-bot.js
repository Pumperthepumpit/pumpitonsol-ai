require('dotenv').config({ path: '.env.local' });
const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Initialize services
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Constants
const PUMPIT_GROUP_ID = '-1002887330073'; // Your private group for all memes
const PAYMENT_WALLET = 'F3bVwQWTNTDNMtHr4P1h58DwLiFcre1F5mmeERrrBzdJ';
const OWNER_ID = '1923063992'; // Your ID for admin commands
const OWNER_USERNAME = 'Growthewealth';
const PREMIUM_PRICE = 0.065; // SOL
const PREMIUM_DAYS = 30;

// Track daily usage
const userLimits = new Map();

// Track processed transactions
const processedTransactions = new Set();

// ============================================
// COMPREHENSIVE LOGGING FOR GROUP ID DETECTION
// ============================================
bot.on('message', (msg) => {
  console.log('\n========== NEW MESSAGE ==========');
  console.log('Time:', new Date().toLocaleString());
  console.log('Chat ID:', msg.chat.id);
  console.log('Chat Type:', msg.chat.type);
  console.log('Chat Title:', msg.chat.title || 'No title (private chat)');
  
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    console.log('>>> THIS IS A GROUP! <<<');
    console.log('>>> GROUP ID:', msg.chat.id, '<<<');
    console.log('Members Count:', msg.chat.members_count || 'Unknown');
  }
  
  if (msg.chat.type === 'channel') {
    console.log('>>> THIS IS A CHANNEL! <<<');
    console.log('>>> CHANNEL ID:', msg.chat.id, '<<<');
  }
  
  console.log('From User:', msg.from.username || msg.from.first_name);
  console.log('From ID:', msg.from.id);
  console.log('Message:', msg.text || '[Non-text message]');
  console.log('=================================\n');
});

// Special command to get chat info
bot.onText(/\/info/, (msg) => {
  const chatInfo = `
📊 Chat Information:

Chat ID: \`${msg.chat.id}\`
Type: ${msg.chat.type}
Title: ${msg.chat.title || 'Private Chat'}
Your ID: ${msg.from.id}
Your Username: @${msg.from.username || 'No username'}

${msg.chat.type === 'private' ? '💡 This is a private chat (DM)' : ''}
${msg.chat.type === 'group' || msg.chat.type === 'supergroup' ? '👥 This is a group chat' : ''}
${msg.chat.type === 'channel' ? '📢 This is a channel' : ''}
  `;
  
  bot.sendMessage(msg.chat.id, chatInfo, { parse_mode: 'Markdown' });
});

// Helper to get user's daily limit
async function getUserDailyLimit(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}-${today}`;
  
  if (!userLimits.has(userKey)) {
    userLimits.set(userKey, 0);
  }
  
  return userLimits.get(userKey);
}

// Helper to increment usage
async function incrementUsage(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}-${today}`;
  const current = userLimits.get(userKey) || 0;
  userLimits.set(userKey, current + 1);
}

// Check if user is premium
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

// Check for payments
async function checkForPayments() {
  try {
    console.log('Checking for new payments...');
    const wallet = new PublicKey(PAYMENT_WALLET);
    const signatures = await connection.getSignaturesForAddress(wallet, { limit: 20 });
    
    for (const sigInfo of signatures) {
      // Skip if already processed
      if (processedTransactions.has(sigInfo.signature)) continue;
      
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0
      });
      if (!tx || !tx.meta) continue;
      
      // Find transfers to our wallet
      const postBalance = tx.meta.postBalances[0];
      const preBalance = tx.meta.preBalances[0];
      const receivedLamports = postBalance - preBalance;
      
      // Check if it's at least 0.065 SOL (65000000 lamports)
      if (receivedLamports >= 65000000) {
        // Look for memo with Telegram ID
        let telegramId = null;
        
        for (const instruction of tx.transaction.message.instructions) {
          if (instruction.program === 'spl-memo' && instruction.parsed) {
            const memoText = instruction.parsed;
            // Check if memo is a valid telegram ID
            if (/^\d+$/.test(memoText)) {
              telegramId = memoText;
              break;
            }
          }
        }
        
        if (telegramId) {
          // Grant premium
          await grantPremium(telegramId, sigInfo.signature, receivedLamports / 1000000000);
          processedTransactions.add(sigInfo.signature);
          
          // Notify user
          bot.sendMessage(telegramId, `✅ Payment received! You now have premium access for ${PREMIUM_DAYS} days. Enjoy 3 daily memes! 🎨`);
          
          // Notify admin
          bot.sendMessage(OWNER_ID, `💰 New premium subscriber: User ${telegramId} paid ${receivedLamports / 1000000000} SOL`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking payments:', error);
  }
}

// Grant premium access
async function grantPremium(telegramId, transactionSignature, amount) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PREMIUM_DAYS);
  
  try {
    const { error } = await supabase
      .from('premium_users')
      .upsert({
        telegram_id: telegramId.toString(),
        transaction_signature: transactionSignature,
        payment_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        amount: amount
      });
    
    if (error) throw error;
    console.log(`Premium granted to ${telegramId} until ${expiresAt}`);
    return true;
  } catch (error) {
    console.error('Error granting premium:', error);
    return false;
  }
}

// Download image from URL
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

// Generate meme with DALL-E
async function generateMeme(prompt, isPremiumUser) {
  try {
    let finalPrompt = prompt;
    if (!isPremiumUser) {
      finalPrompt = `${prompt}. Add cartoon red lips on the person's face (forehead or cheek area).`;
    } else {
      finalPrompt = `${prompt}. Add cartoon red lips somewhere in the scene but NOT on any person's face.`;
    }
    
    // Always include $PUMPIT branding for all users
    finalPrompt += ' Include "$PUMPIT" text in the image.';
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
    });
    
    return response.data[0].url;
  } catch (error) {
    console.error('DALL-E error:', error);
    throw error;
  }
}

// Save meme to Supabase - UPDATED WITH SOURCE TRACKING AND SEO
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
        creator_x_handle: `${username || 'telegram_user'}`,
        creator_wallet: null,
        likes_count: 0,
        shares_count: 0,
        views_count: 0,
        topic: topic,
        description: description,
        source: 'telegram',  // ADDED: Mark as telegram source
        from_telegram_bot: true  // ADDED: For the badge
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
    
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

// Bot Commands

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🚀 Welcome to Pumper Meme Bot!

Create AI-powered $PUMPIT memes with just a description!

📝 Commands:
/meme [description] - Create a meme
/status - Check your daily limit
/subscribe - Get premium (3 memes/day)
/help - Show all commands

Free tier: 1 meme/day
Premium: 3 memes/day for 0.065 SOL/month

Let's PUMP IT! 🎨`;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// /meme command
bot.onText(/\/meme (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const description = match[1];
  
  try {
    // Check if user is owner - owners get unlimited memes
    const isOwner = userId.toString() === OWNER_ID;
    
    if (!isOwner) {
      // Regular users have limits
      const premium = await isPremium(userId);
      const dailyLimit = premium ? 3 : 1;
      const currentUsage = await getUserDailyLimit(userId);
      
      if (currentUsage >= dailyLimit) {
        const limitMessage = premium 
          ? "Daily limit reached! You've used all 3 premium memes today. Reset at midnight! 🌙"
          : "Daily limit reached! Free users get 1 meme/day. Upgrade to premium for 3 daily memes! /subscribe 🚀";
        
        bot.sendMessage(chatId, limitMessage);
        return;
      }
    }
    
    const statusMsg = await bot.sendMessage(chatId, "🎨 Generating your $PUMPIT meme...");
    
    const premium = await isPremium(userId);
    const imageUrl = await generateMeme(description, premium || isOwner);
    
    // Generate SEO description using OpenAI
    let seoDescription = '';
    try {
      const seoResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Write a short, fun SEO description (max 160 chars) for a PUMPIT meme about: ${description}. Make it engaging and include relevant keywords.`
        }],
        max_tokens: 50
      });
      seoDescription = seoResponse.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating SEO description:', error);
      seoDescription = `Epic ${description} PUMPIT meme created by the community. Join Solana's fastest growing memecoin!`;
    }
    
    const { publicUrl, memeId } = await saveMemeToSupabase(imageUrl, userId, username, description, seoDescription);
    
    // Only increment usage for non-owners
    if (!isOwner) {
      await incrementUsage(userId);
    }
    
    // Calculate remaining memes
    let remaining;
    if (isOwner) {
      remaining = "∞ (Owner privileges)";
    } else {
      const currentUsage = await getUserDailyLimit(userId);
      const dailyLimit = premium ? 3 : 1;
      remaining = dailyLimit - currentUsage;
    }
    
    bot.deleteMessage(chatId, statusMsg.message_id);
    
    const memeUrl = `https://letspumpit.com/meme/${memeId}`;
    const shareText = `Check out this ${description} meme! 🚀 @pumpitonsol\n\n#PUMPIT #Solana #MemeCoin`;
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(memeUrl)}`;
    
    const caption = `✨ Your $PUMPIT meme is ready!
    
📊 Memes remaining today: ${remaining}
🌐 View HD: ${memeUrl}

💰 Buy $PUMPIT Now!
CA: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk

📢 Share on 𝕏: ${twitterShareUrl}
${!premium && !isOwner ? '\n🚀 Upgrade for more: /subscribe' : ''}`;
    
    await bot.sendPhoto(chatId, imageUrl, { caption });
    
    // ALWAYS forward to the group (remove the condition check)
    console.log(`\n>>> ATTEMPTING TO FORWARD MEME TO GROUP: ${PUMPIT_GROUP_ID} <<<`);
    
    const adminCaption = `🎨 New $PUMPIT meme created via Telegram Bot!

"${description}"

🌐 View: ${memeUrl}
📢 Share on 𝕏: ${twitterShareUrl}

💰 Buy $PUMPIT:
CA: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk

🤖 Create your own: @pumpermemebot`;
    
    try {
      await bot.sendPhoto(PUMPIT_GROUP_ID, imageUrl, { caption: adminCaption });
      console.log('>>> MEME FORWARDED SUCCESSFULLY <<<\n');
    } catch (error) {
      console.error('>>> ERROR FORWARDING MEME:', error.message, '<<<\n');
    }
    
  } catch (error) {
    console.error('Error generating meme:', error);
    bot.sendMessage(chatId, "❌ Oops! Something went wrong. Please try again.");
  }
});

// /status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const premium = await isPremium(userId);
  const dailyLimit = premium ? 3 : 1;
  const currentUsage = await getUserDailyLimit(userId);
  const remaining = dailyLimit - currentUsage;
  
  let statusMessage = `
📊 Your Status:

Account Type: ${premium ? '⭐ Premium' : '🆓 Free'}
Daily Limit: ${dailyLimit} memes
Used Today: ${currentUsage}
Remaining: ${remaining}`;

  if (premium) {
    const { data } = await supabase
      .from('premium_users')
      .select('expires_at')
      .eq('telegram_id', userId.toString())
      .single();
    
    if (data) {
      const expiryDate = new Date(data.expires_at).toLocaleDateString();
      statusMessage += `\nExpires: ${expiryDate}`;
    }
  } else {
    statusMessage += '\n\n🚀 Upgrade to Premium: /subscribe';
  }
  
  bot.sendMessage(chatId, statusMessage);
});

// /subscribe command
bot.onText(/\/subscribe/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const subscribeMessage = `
⭐ Premium Subscription

Price: ${PREMIUM_PRICE} SOL/month ($9.75)

✅ Premium Benefits:
- 3 memes per day (vs 1)
- No forced lips on faces
- Priority generation
- Support $PUMPIT development

💰 To subscribe:
1. Send exactly ${PREMIUM_PRICE} SOL to:
\`${PAYMENT_WALLET}\`

2. IMPORTANT: Include your Telegram ID in the memo:
\`${userId}\`

3. You'll receive premium access automatically within 5 minutes!

⚠️ Must include your ID (${userId}) in the transaction memo or payment won't be processed!`;
  
  bot.sendMessage(chatId, subscribeMessage, { parse_mode: 'Markdown' });
});

// Admin Commands (only for you)

// /grant command - manually grant premium
bot.onText(/\/grant @?(\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId.toString() !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Admin command only.");
  }
  
  const username = match[1];
  bot.sendMessage(chatId, `To grant premium, I need the user's Telegram ID, not username. They can get it by typing /subscribe`);
});

// /grant with ID
bot.onText(/\/grant (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId.toString() !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Admin command only.");
  }
  
  const targetId = match[1];
  const success = await grantPremium(targetId, 'manual_grant', 0);
  
  if (success) {
    bot.sendMessage(chatId, `✅ Premium granted to user ${targetId} for ${PREMIUM_DAYS} days`);
    bot.sendMessage(targetId, `🎉 You've been granted premium access for ${PREMIUM_DAYS} days! Enjoy 3 daily memes!`);
  } else {
    bot.sendMessage(chatId, `❌ Failed to grant premium to ${targetId}`);
  }
});

// /subscribers command - see all premium users
bot.onText(/\/subscribers/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId.toString() !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Admin command only.");
  }
  
  try {
    const { data, error } = await supabase
      .from('premium_users')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return bot.sendMessage(chatId, "No active premium subscribers.");
    }
    
    let message = `👑 Active Premium Subscribers (${data.length}):\n\n`;
    
    for (const sub of data) {
      const expiryDate = new Date(sub.expires_at).toLocaleDateString();
      message += `• User: ${sub.telegram_id}\n  Expires: ${expiryDate}\n  Paid: ${sub.amount} SOL\n\n`;
    }
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, "❌ Error fetching subscribers.");
  }
});

// /getid command - Simple command to get chat ID
bot.onText(/\/getid/, (msg) => {
  bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`);
});

// /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  let helpMessage = `
📚 Pumper Bot Commands:

/meme [description] - Create a meme
Example: /meme dog wearing sunglasses at computer

/status - Check your daily meme limit
/subscribe - Get premium access
/start - Welcome message
/help - Show this help
/info - Show chat information
/getid - Get this chat's ID

💡 Tips:
- Be specific in descriptions
- Free tier adds lips to faces
- Premium gives more creative freedom
- All memes appear on letspumpit.com!`;

  // Add admin commands for owner
  if (userId.toString() === OWNER_ID) {
    helpMessage += `

👑 Admin Commands:
/grant [telegram_id] - Grant premium manually
/subscribers - View all premium users`;
  }
  
  bot.sendMessage(chatId, helpMessage);
});

// Check for payments every 5 minutes
setInterval(checkForPayments, 5 * 60 * 1000);

// Initial payment check
setTimeout(checkForPayments, 5000);

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🚀 Pumper Telegram Bot is running with payment system!');
console.log('📊 Watching for messages to identify group IDs...');
console.log('✅ Source tracking enabled - all memes will be marked as "telegram"');
console.log('🔍 SEO descriptions enabled - all memes will have AI-generated descriptions');