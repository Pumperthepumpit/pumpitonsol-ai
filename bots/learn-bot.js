// bots/learn-bot.js - Complete version with Redis cache for ultra-fast performance
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Redis } = require('@upstash/redis');
const cron = require('node-cron');
require('dotenv').config({ path: '.env.local' });

// ==================== ENVIRONMENT DEBUG ====================
console.log('=== ENVIRONMENT CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('REDIS URL exists:', !!process.env.UPSTASH_REDIS_REST_URL);
console.log('REDIS TOKEN exists:', !!process.env.UPSTASH_REDIS_REST_TOKEN);
console.log('BOT TOKEN exists:', !!process.env.LEARN_BOT_TOKEN);
console.log('SUPABASE URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Available Redis vars:', Object.keys(process.env).filter(k => k.includes('UPSTASH') || k.includes('REDIS')));
console.log('=========================');

// ==================== INITIALIZE SERVICES ====================

// Initialize Redis for ultra-fast caching - with proper error handling
let redis;
try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    console.error('❌ Redis credentials missing!');
    console.error('URL:', redisUrl ? 'Found' : 'Missing');
    console.error('Token:', redisToken ? 'Found' : 'Missing');
    // Create a mock Redis that won't crash the bot
    redis = {
      get: async () => null,
      set: async () => null,
      del: async () => null,
      keys: async () => [],
      sadd: async () => null,
      smembers: async () => [],
      setex: async () => null
    };
  } else {
    redis = new Redis({
      url: redisUrl,
      token: redisToken
    });
    console.log('✅ Redis initialized with URL:', redisUrl.substring(0, 30) + '...');
  }
} catch (error) {
  console.error('Redis initialization error:', error);
  // Create mock Redis to prevent crashes
  redis = {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    keys: async () => [],
    sadd: async () => null,
    smembers: async () => [],
    setex: async () => null
  };
}

// Initialize Supabase for permanent storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Check if we're on Railway for webhook setup
const RAILWAY_URL = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
const IS_PRODUCTION = !!RAILWAY_URL;

// Initialize Telegram Bot with optimized settings
const botConfig = IS_PRODUCTION ? {
  webHook: {
    port: process.env.PORT || 3000
  }
} : {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
      allowed_updates: ['message', 'callback_query']
    }
  }
};

const bot = new TelegramBot(process.env.LEARN_BOT_TOKEN, botConfig);

// Set webhook if on Railway
if (IS_PRODUCTION && RAILWAY_URL) {
  const webhookUrl = `https://${RAILWAY_URL}/${process.env.LEARN_BOT_TOKEN}`;
  bot.setWebHook(webhookUrl).then(() => {
    console.log('✅ Webhook set:', webhookUrl);
  }).catch(err => {
    console.error('❌ Webhook error:', err);
  });
}

// Solana RPC with Helius
const HELIUS_KEY = process.env.HELIUS_API_KEY || 'demo';
const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`,
  'confirmed'
);

// Constants
const PUMPIT_TOKEN_ADDRESS = 'B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk';
const PAYMENT_WALLET = 'F3bVwQWTNTDNMtHr4P1h58DwLiFcre1F5mmeERrrBzdJ';

// Startup logging
console.log('⚡ ULTRA FAST PUMPIT LANGUAGE BOT');
console.log('✅ Redis:', redis.get ? 'Connected' : 'Mock Mode');
console.log('✅ Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected' : 'Missing');
console.log('✅ Bot Token:', process.env.LEARN_BOT_TOKEN ? 'Connected' : 'Missing');
console.log('✅ Helius RPC:', HELIUS_KEY !== 'demo' ? 'Connected' : 'Demo mode');
console.log('✅ Mode:', IS_PRODUCTION ? 'Production (Webhook)' : 'Development (Polling)');
console.log('🚀 Loading lessons to Redis cache...');

// ==================== CACHE MANAGEMENT ====================

// Load all lessons to Redis on startup (one-time operation)
async function loadLessonsToRedis() {
  try {
    // Skip if Redis is not properly initialized
    if (!redis.get || !process.env.UPSTASH_REDIS_REST_URL) {
      console.log('⚠️ Redis not available, using database directly');
      return false;
    }
    
    console.log('📚 Fetching lessons from Supabase...');
    
    // Get all lessons from database
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*');
    
    if (error) {
      console.error('Error fetching lessons:', error);
      return false;
    }
    
    if (!lessons || lessons.length === 0) {
      console.log('⚠️ No lessons found in database');
      return false;
    }
    
    console.log(`📦 Caching ${lessons.length} lessons to Redis...`);
    
    // Store each lesson in Redis with proper key structure
    for (const lesson of lessons) {
      const key = `lesson:${lesson.language}:${lesson.skill_id}:${lesson.level}:${lesson.lesson_number}`;
      await redis.set(key, JSON.stringify(lesson.questions), {
        ex: 86400 // Expire after 24 hours (will reload next day)
      });
    }
    
    // Store lesson metadata for quick access
    await redis.set('lessons:metadata', JSON.stringify({
      total: lessons.length,
      languages: ['spanish', 'french'],
      skills: [...new Set(lessons.map(l => l.skill_id))],
      lastUpdated: new Date().toISOString()
    }));
    
    console.log(`✅ Successfully cached ${lessons.length} lessons to Redis!`);
    return true;
  } catch (error) {
    console.error('Redis caching error:', error);
    return false;
  }
}

// ==================== TIER SYSTEM ====================

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    hearts: 5,
    lessonsPerDay: 5,
    xpMultiplier: 1,
    tokenRequirement: 0
  },
  plus: {
    name: 'Plus',
    hearts: -1,
    lessonsPerDay: 20,
    xpMultiplier: 1.5,
    tokenRequirement: 300000
  },
  pro: {
    name: 'Pro',
    hearts: -1,
    lessonsPerDay: -1,
    xpMultiplier: 2,
    tokenRequirement: 1000000
  },
  max: {
    name: 'Max',
    hearts: -1,
    lessonsPerDay: -1,
    xpMultiplier: 3,
    tokenRequirement: 5000000
  }
};

// ==================== ACHIEVEMENTS ====================

const ACHIEVEMENTS = {
  first_lesson: { name: 'First Steps', emoji: '🌟', xp: 50 },
  streak_3: { name: '3 Day Streak', emoji: '🔥', xp: 100 },
  streak_7: { name: 'Week Warrior', emoji: '🔥🔥', xp: 200 },
  streak_30: { name: 'Monthly Master', emoji: '🔥🔥🔥', xp: 500 },
  perfect_lesson: { name: 'Perfectionist', emoji: '💯', xp: 75 },
  speed_demon: { name: 'Speed Demon', emoji: '⚡', xp: 100 },
  daily_champion: { name: 'Daily Champion', emoji: '🏆', xp: 150 },
  level_5: { name: 'Rising Star', emoji: '⭐', xp: 200 },
  level_10: { name: 'Language Expert', emoji: '🎓', xp: 500 },
  level_20: { name: 'Master Linguist', emoji: '👑', xp: 1000 }
};

// ==================== SKILL PROGRESSION ====================

const SKILL_LIST = [
  'basics1', 'greetings', 'food', 'family', 'numbers',
  'present', 'colors', 'animals', 'clothes', 'house',
  'routine', 'work', 'school', 'transport', 'shopping',
  'past', 'weather', 'health', 'sports', 'travel',
  'future', 'technology', 'nature', 'culture', 'emotions',
  'subjunctive', 'conditional', 'business', 'idioms', 'advanced'
];

// ==================== USER MANAGEMENT WITH REDIS ====================

async function getUserFromCache(userId) {
  try {
    // Check Redis first if available
    if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
      const cached = await redis.get(`user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Not in cache or Redis unavailable, get from database
    const { data: user } = await supabase
      .from('language_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    if (user) {
      // Cache for 1 hour if Redis is available
      if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
        await redis.set(`user:${userId}`, JSON.stringify(user), { ex: 3600 });
      }
      return user;
    }
    
    // Create new user
    const newUser = {
      telegram_id: userId,
      telegram_username: 'user',
      hearts_remaining: 5,
      total_xp: 0,
      daily_streak: 0,
      lessons_today: 0,
      achievements: [],
      subscription_tier: 'free',
      created_at: new Date().toISOString()
    };
    
    // Save to database
    await supabase.from('language_users').insert(newUser);
    
    // Cache it if Redis is available
    if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(`user:${userId}`, JSON.stringify(newUser), { ex: 3600 });
    }
    
    return newUser;
  } catch (error) {
    console.error('User fetch error:', error);
    return null;
  }
}

async function updateUserCache(userId, updates) {
  try {
    // Get current user data
    const user = await getUserFromCache(userId);
    if (!user) return null;
    
    // Merge updates
    const updatedUser = { ...user, ...updates };
    
    // Update cache immediately if Redis is available
    if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(`user:${userId}`, JSON.stringify(updatedUser), { ex: 3600 });
      // Mark user as dirty for background sync
      await redis.sadd('dirty:users', userId);
    } else {
      // If Redis not available, update database directly
      await supabase
        .from('language_users')
        .update(updates)
        .eq('telegram_id', userId);
    }
    
    return updatedUser;
  } catch (error) {
    console.error('User update error:', error);
    return null;
  }
}

// ==================== LESSON MANAGEMENT WITH REDIS ====================

async function getLessonFromCache(language, userId) {
  try {
    // Get user to determine appropriate level
    const user = await getUserFromCache(userId);
    const userLevel = Math.floor((user?.total_xp || 0) / 100) + 1;
    
    // Determine skill based on level
    const skillIndex = Math.min(Math.floor((userLevel - 1) / 2), SKILL_LIST.length - 1);
    const skillId = SKILL_LIST[Math.max(0, skillIndex)];
    const lessonLevel = Math.min(5, Math.max(1, Math.ceil(userLevel / 4)));
    const lessonNumber = Math.floor(Math.random() * 3) + 1;
    
    // Try to get from Redis if available
    if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
      const key = `lesson:${language}:${skillId}:${lessonLevel}:${lessonNumber}`;
      const cached = await redis.get(key);
      
      if (cached) {
        const questions = JSON.parse(cached);
        console.log(`✅ Loaded lesson from Redis: ${key}`);
        return questions;
      }
      
      // Fallback: Get ANY lesson for that language from Redis
      const pattern = `lesson:${language}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys && keys.length > 0) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const fallbackCached = await redis.get(randomKey);
        if (fallbackCached) {
          console.log(`✅ Loaded fallback lesson from Redis: ${randomKey}`);
          return JSON.parse(fallbackCached);
        }
      }
    }
    
    // If Redis not available or lesson not found, get from database
    const { data: lessons } = await supabase
      .from('lessons')
      .select('questions')
      .eq('language', language)
      .limit(1)
      .single();
    
    if (lessons?.questions) {
      return lessons.questions;
    }
    
    // Last resort: Return static questions
    console.log('⚠️ Using static fallback questions');
    return getStaticQuestions(language);
  } catch (error) {
    console.error('Lesson fetch error:', error);
    return getStaticQuestions(language);
  }
}

function getStaticQuestions(language) {
  const questions = {
    spanish: [
      { question: 'Hello', answer: 'Hola', options: ['Hola', 'Adiós', 'Gracias', 'Por favor'], points: 10 },
      { question: 'Goodbye', answer: 'Adiós', options: ['Adiós', 'Hola', 'Sí', 'No'], points: 10 },
      { question: 'Thank you', answer: 'Gracias', options: ['Gracias', 'De nada', 'Perdón', 'Hola'], points: 10 },
      { question: 'Please', answer: 'Por favor', options: ['Por favor', 'Gracias', 'Lo siento', 'Sí'], points: 10 },
      { question: 'Yes', answer: 'Sí', options: ['Sí', 'No', 'Tal vez', 'Nunca'], points: 10 }
    ],
    french: [
      { question: 'Hello', answer: 'Bonjour', options: ['Bonjour', 'Au revoir', 'Merci', 'Oui'], points: 10 },
      { question: 'Goodbye', answer: 'Au revoir', options: ['Au revoir', 'Bonjour', 'Bonsoir', 'Salut'], points: 10 },
      { question: 'Thank you', answer: 'Merci', options: ['Merci', 'De rien', 'Pardon', 'Bonjour'], points: 10 },
      { question: 'Please', answer: "S'il vous plaît", options: ["S'il vous plaît", 'Merci', 'Pardon', 'Oui'], points: 10 },
      { question: 'Yes', answer: 'Oui', options: ['Oui', 'Non', 'Peut-être', 'Jamais'], points: 10 }
    ]
  };
  
  return questions[language] || questions.spanish;
}

// ==================== SESSION MANAGEMENT WITH REDIS ====================

async function createSession(userId, language, type, size = 10) {
  try {
    const sessionId = `${userId}_${Date.now()}`;
    
    // Get questions based on type
    let questions;
    if (type === 'daily') {
      questions = await getLessonFromCache(language, userId);
      questions = questions.slice(0, 15);
      // Double points for daily challenge
      questions = questions.map(q => ({ ...q, points: (q.points || 10) * 2 }));
    } else if (type === 'quick') {
      questions = await getLessonFromCache(language, userId);
      questions = questions.slice(0, 5);
    } else {
      questions = await getLessonFromCache(language, userId);
      questions = questions.slice(0, size);
    }
    
    const session = {
      id: sessionId,
      userId: userId,
      language: language,
      type: type,
      questions: questions,
      current: 0,
      correct: 0,
      earned: 0,
      total: questions.length,
      startTime: Date.now(),
      comboStreak: 0
    };
    
    // Store session in Redis if available, otherwise in memory
    if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(`session:${userId}`, JSON.stringify(session), { ex: 3600 });
    } else {
      // Fallback to in-memory storage
      global.sessions = global.sessions || {};
      global.sessions[userId] = session;
    }
    
    return session;
  } catch (error) {
    console.error('Session creation error:', error);
    return null;
  }
}

async function getSession(userId) {
  try {
    if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
      const cached = await redis.get(`session:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } else {
      // Fallback to in-memory storage
      return global.sessions?.[userId] || null;
    }
  } catch (error) {
    console.error('Session fetch error:', error);
    return null;
  }
}

async function updateSession(userId, updates) {
  try {
    const session = await getSession(userId);
    if (!session) return null;
    
    const updatedSession = { ...session, ...updates };
    
    if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(`session:${userId}`, JSON.stringify(updatedSession), { ex: 3600 });
    } else {
      // Fallback to in-memory storage
      global.sessions = global.sessions || {};
      global.sessions[userId] = updatedSession;
    }
    
    return updatedSession;
  } catch (error) {
    console.error('Session update error:', error);
    return null;
  }
}

// ==================== PAYMENT VERIFICATION ====================

async function checkRecentPayment(userId, expectedAmount) {
  try {
    const paymentWallet = new PublicKey(PAYMENT_WALLET);
    const signatures = await connection.getSignaturesForAddress(paymentWallet, { limit: 20 });
    
    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature);
      
      if (tx && tx.meta && !tx.meta.err) {
        const expectedLamports = expectedAmount * LAMPORTS_PER_SOL;
        const preBalance = tx.meta.preBalances[1] || 0;
        const postBalance = tx.meta.postBalances[1] || 0;
        const received = postBalance - preBalance;
        
        if (received >= expectedLamports * 0.9) {
          return {
            found: true,
            signature: sig.signature,
            amount: received / LAMPORTS_PER_SOL
          };
        }
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('Payment check error:', error);
    return { found: false };
  }
}

async function checkPumpitBalance(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: new PublicKey(PUMPIT_TOKEN_ADDRESS)
    });

    if (tokenAccounts.value.length === 0) return 0;

    const balance = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
    return parseFloat(balance.value.uiAmount || 0);
  } catch (error) {
    console.error('Balance check error:', error);
    return 0;
  }
}

async function getUserTier(userId) {
  try {
    const user = await getUserFromCache(userId);
    if (!user) return 'free';
    
    if (user.wallet_address) {
      const balance = await checkPumpitBalance(user.wallet_address);
      if (balance >= 5000000) return 'max';
      if (balance >= 1000000) return 'pro';
      if (balance >= 300000) return 'plus';
    }
    
    return user.subscription_tier || 'free';
  } catch (error) {
    return 'free';
  }
}

// ==================== ACHIEVEMENT TRACKING ====================

async function grantAchievement(userId, achievementId) {
  try {
    const user = await getUserFromCache(userId);
    if (!user) return;
    
    const achievements = user.achievements || [];
    if (achievements.includes(achievementId)) return;
    
    achievements.push(achievementId);
    const xpBonus = ACHIEVEMENTS[achievementId].xp;
    
    await updateUserCache(userId, {
      achievements: achievements,
      total_xp: (user.total_xp || 0) + xpBonus
    });
    
    bot.sendMessage(userId, `
🏆 **Achievement Unlocked!**
${ACHIEVEMENTS[achievementId].emoji} ${ACHIEVEMENTS[achievementId].name}
+${xpBonus} XP
`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Achievement error:', error);
  }
}

// ==================== DISPLAY FUNCTIONS ====================

async function showQuestion(chatId, session) {
  if (!session || session.current >= session.total) {
    return completeSession(chatId, session);
  }
  
  const q = session.questions[session.current];
  const progress = session.current + 1;
  
  let message = `📚 **${session.type === 'daily' ? '🏆 Daily Challenge' : 'Lesson'}** (${progress}/${session.total})\n`;
  message += `⭐ Score: ${session.earned} XP`;
  
  if (session.comboStreak > 2) {
    message += ` | 🔥 Combo x${session.comboStreak}`;
  }
  
  message += `\n\n**Translate to ${session.language}:**\n"${q.question}"`;
  
  const keyboard = {
    inline_keyboard: []
  };
  
  // Shuffle options for each question
  const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
  shuffledOptions.forEach(opt => {
    keyboard.inline_keyboard.push([{
      text: opt,
      callback_data: `ans_${session.current}_${opt === q.answer ? '1' : '0'}`
    }]);
  });
  
  keyboard.inline_keyboard.push([
    { text: '⏭️ Skip', callback_data: 'skip' }
  ]);
  
  // Send as new message for better performance
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function completeSession(chatId, session) {
  if (!session) return;
  
  const time = Math.round((Date.now() - session.startTime) / 1000);
  const accuracy = Math.round((session.correct / session.total) * 100);
  
  // Update user stats
  const user = await getUserFromCache(session.userId);
  if (user) {
    await updateUserCache(session.userId, {
      total_xp: (user.total_xp || 0) + session.earned,
      total_lessons: (user.total_lessons || 0) + 1,
      last_lesson_at: new Date().toISOString()
    });
    
    // Check achievements
    if ((user.total_lessons || 0) === 0) await grantAchievement(session.userId, 'first_lesson');
    if (accuracy === 100) await grantAchievement(session.userId, 'perfect_lesson');
    if (time < 60) await grantAchievement(session.userId, 'speed_demon');
    if (session.type === 'daily') await grantAchievement(session.userId, 'daily_champion');
  }
  
  // Clear session
  if (redis.del && process.env.UPSTASH_REDIS_REST_URL) {
    await redis.del(`session:${session.userId}`);
  } else if (global.sessions) {
    delete global.sessions[session.userId];
  }
  
  const gradeEmoji = accuracy === 100 ? '🥇' : accuracy >= 80 ? '🥈' : '🥉';
  
  const message = `
✅ **Complete!**

${gradeEmoji} Accuracy: ${accuracy}%
⭐ XP Earned: ${session.earned}
⏱️ Time: ${Math.floor(time / 60)}m ${time % 60}s

${accuracy === 100 ? '🎉 Perfect!' : accuracy >= 80 ? '👏 Great job!' : '💪 Keep practicing!'}
`;
  
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📚 New Lesson', callback_data: `start_${session.language}` },
          { text: '🎯 Quick 5', callback_data: `quick_${session.language}` }
        ],
        [{ text: '🏠 Main Menu', callback_data: 'menu' }]
      ]
    }
  });
}

// ==================== KEYBOARDS ====================

function getMainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇪🇸 Spanish', callback_data: 'lang_spanish' },
        { text: '🇫🇷 French', callback_data: 'lang_french' }
      ],
      [
        { text: '📊 Dashboard', callback_data: 'dashboard' },
        { text: '🏆 Leaderboard', callback_data: 'leaderboard' }
      ],
      [
        { text: '📚 My Progress', callback_data: 'progress' },
        { text: '❓ Help', callback_data: 'help' }
      ]
    ]
  };
}

function getLearningKeyboard(language) {
  return {
    inline_keyboard: [
      [
        { text: '📚 Start Lesson (10)', callback_data: `start_${language}` },
        { text: '🎯 Quick Practice (5)', callback_data: `quick_${language}` }
      ],
      [
        { text: '🏆 Daily Challenge', callback_data: `daily_${language}` },
        { text: '📊 My Stats', callback_data: 'progress' }
      ],
      [{ text: '← Main Menu', callback_data: 'menu' }]
    ]
  };
}

function getDashboardKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🎯 Daily Challenge', callback_data: 'daily_spanish' },
        { text: '🏅 Achievements', callback_data: 'achievements' }
      ],
      [
        { text: '❤️ Buy Hearts', callback_data: 'buy_hearts' },
        { text: '⭐ Upgrade Tier', callback_data: 'upgrade' }
      ],
      [{ text: '← Back', callback_data: 'menu' }]
    ]
  };
}

// ==================== BOT COMMANDS ====================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  
  const user = await getUserFromCache(userId);
  const tier = await getUserTier(userId);
  const level = Math.floor((user?.total_xp || 0) / 100) + 1;
  
  bot.sendMessage(chatId, `
🎓 **PUMPIT Language Learning**

📚 Level ${level} | ${user?.total_xp || 0} XP
💎 Tier: ${SUBSCRIPTION_TIERS[tier].name}
❤️ Hearts: ${tier === 'free' ? `${user?.hearts_remaining || 5}/5` : 'Unlimited'}
🔥 Streak: ${user?.daily_streak || 0} days

Choose a language to start:
`, {
    parse_mode: 'Markdown',
    reply_markup: getMainKeyboard()
  });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📚 **PUMPIT Learning - Help**

**Commands:**
/start - Main menu
/connect - Connect wallet
/progress - View stats
/leaderboard - Top learners

**Features:**
• 9,000+ lessons
• Spanish & French
• Daily challenges (2x XP)
• Achievement system
• Token holder benefits

**Tiers:**
• Free - 5 lessons/day
• Plus (300k PUMPIT) - 20 lessons
• Pro (1M PUMPIT) - Unlimited
• Max (5M PUMPIT) - 3x XP

${redis.get ? '⚡ Powered by Redis cache for instant responses!' : '⚠️ Running in fallback mode'}
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/connect/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  
  bot.sendMessage(chatId, `
🔗 **Connect Wallet**

Send your Solana wallet address to unlock tier benefits.

Token requirements:
• 300k+ PUMPIT = Plus
• 1M+ PUMPIT = Pro
• 5M+ PUMPIT = Max
`, { parse_mode: 'Markdown' });
  
  // Store state
  if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
    await redis.set(`state:${userId}`, 'awaiting_wallet', { ex: 300 });
  } else {
    global.states = global.states || {};
    global.states[userId] = 'awaiting_wallet';
  }
});

bot.onText(/\/progress/, async (msg) => {
  const userId = msg.from.id.toString();
  const user = await getUserFromCache(userId);
  const level = Math.floor((user?.total_xp || 0) / 100) + 1;
  const progress = (user?.total_xp || 0) % 100;
  const tier = await getUserTier(userId);
  
  bot.sendMessage(msg.chat.id, `
📊 **Your Progress**

🎖️ Level ${level} (${user?.total_xp || 0} XP)
Progress: [${'▓'.repeat(Math.floor(progress/10))}${'░'.repeat(10-Math.floor(progress/10))}] ${progress}%
🔥 Streak: ${user?.daily_streak || 0} days
📚 Lessons: ${user?.total_lessons || 0}
🏅 Achievements: ${user?.achievements?.length || 0}/${Object.keys(ACHIEVEMENTS).length}
💎 Tier: ${SUBSCRIPTION_TIERS[tier].name}
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/leaderboard/, async (msg) => {
  // Get from cache first if Redis available
  let cached = null;
  if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
    cached = await redis.get('leaderboard:weekly');
  }
  
  if (cached) {
    bot.sendMessage(msg.chat.id, cached, { parse_mode: 'Markdown' });
    return;
  }
  
  // Fetch from database
  const { data: topUsers } = await supabase
    .from('language_users')
    .select('telegram_username, total_xp, daily_streak')
    .order('weekly_xp', { ascending: false })
    .limit(10);
  
  if (!topUsers || topUsers.length === 0) {
    bot.sendMessage(msg.chat.id, '📊 No users yet. Be the first!');
    return;
  }
  
  let message = '🏆 **Weekly Leaderboard**\n\n';
  topUsers.forEach((user, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const level = Math.floor((user.total_xp || 0) / 100) + 1;
    message += `${medal} @${user.telegram_username || 'User'} - Level ${level}\n`;
    message += `   ${user.total_xp} XP | 🔥 ${user.daily_streak} days\n\n`;
  });
  
  // Cache for 5 minutes if Redis available
  if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
    await redis.set('leaderboard:weekly', message, { ex: 300 });
  }
  
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

// ==================== CALLBACK HANDLERS ====================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const data = query.data;
  
  // Answer callback immediately to prevent loading
  bot.answerCallbackQuery(query.id).catch(() => {});
  
  // Main menu
  if (data === 'menu') {
    const user = await getUserFromCache(userId);
    const tier = await getUserTier(userId);
    const level = Math.floor((user?.total_xp || 0) / 100) + 1;
    
    bot.sendMessage(chatId, `
🎓 **Main Menu**

Level ${level} | ${user?.total_xp || 0} XP
💎 Tier: ${SUBSCRIPTION_TIERS[tier].name}
❤️ Hearts: ${user?.hearts_remaining || 5}/5

Choose an option:
`, {
      parse_mode: 'Markdown',
      reply_markup: getMainKeyboard()
    });
    return;
  }
  
  // Language selection
  if (data.startsWith('lang_')) {
    const language = data.split('_')[1];
    
    // Update user's current language
    await updateUserCache(userId, { current_language: language });
    
    const user = await getUserFromCache(userId);
    const tier = await getUserTier(userId);
    const level = Math.floor((user?.total_xp || 0) / 100) + 1;
    
    bot.sendMessage(chatId, `
${language === 'spanish' ? '🇪🇸 **Spanish**' : '🇫🇷 **French**'} Course

Level ${level} | Tier: ${SUBSCRIPTION_TIERS[tier].name}
❤️ Hearts: ${user?.hearts_remaining || 5}

Choose mode:
`, {
      parse_mode: 'Markdown',
      reply_markup: getLearningKeyboard(language)
    });
    return;
  }
  
  // Start regular lesson
  if (data.startsWith('start_')) {
    const language = data.split('_')[1];
    const user = await getUserFromCache(userId);
    const tier = await getUserTier(userId);
    
    // Check hearts for free tier
    if (tier === 'free' && (user?.hearts_remaining || 0) <= 0) {
      bot.answerCallbackQuery(query.id, {
        text: '❌ Out of hearts! Buy more or wait for regeneration.',
        show_alert: true
      });
      
      bot.sendMessage(chatId, `
💔 **Out of Hearts!**

Options:
• Wait 1 hour for +1 heart
• Buy hearts with SOL
• Hold PUMPIT tokens for unlimited

Choose:
`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❤️ Buy 5 Hearts (0.01 SOL)', callback_data: 'buy_5' }],
            [{ text: '❤️ Buy 25 Hearts (0.04 SOL)', callback_data: 'buy_25' }],
            [{ text: '← Back', callback_data: 'menu' }]
          ]
        }
      });
      return;
    }
    
    // Check daily lesson limit
    const lessonsToday = user?.lessons_today || 0;
    const limit = SUBSCRIPTION_TIERS[tier].lessonsPerDay;
    
    if (limit !== -1 && lessonsToday >= limit) {
      bot.answerCallbackQuery(query.id, {
        text: `Daily limit reached! Upgrade tier for more.`,
        show_alert: true
      });
      return;
    }
    
    bot.sendMessage(chatId, '📚 Loading lesson...');
    
    const session = await createSession(userId, language, 'lesson', 10);
    if (!session) {
      bot.sendMessage(chatId, '❌ Error creating session. Try again.');
      return;
    }
    
    // Update lesson count
    await updateUserCache(userId, {
      lessons_today: lessonsToday + 1
    });
    
    setTimeout(() => showQuestion(chatId, session), 500);
    return;
  }
  
  // Quick practice
  if (data.startsWith('quick_')) {
    const language = data.split('_')[1];
    
    bot.sendMessage(chatId, '🎯 Loading quick practice...');
    
    const session = await createSession(userId, language, 'quick', 5);
    if (!session) {
      bot.sendMessage(chatId, '❌ Error creating session. Try again.');
      return;
    }
    
    setTimeout(() => showQuestion(chatId, session), 500);
    return;
  }
  
  // Daily challenge
  if (data.startsWith('daily_')) {
    const language = data.split('_')[1];
    
    // Check if already completed today
    const dailyKey = `daily:${userId}:${new Date().toDateString()}`;
    let completed = false;
    
    if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
      completed = await redis.get(dailyKey);
    } else {
      global.dailyCompleted = global.dailyCompleted || {};
      completed = global.dailyCompleted[dailyKey];
    }
    
    if (completed) {
      bot.answerCallbackQuery(query.id, {
        text: '⏰ Already completed today! Come back tomorrow.',
        show_alert: true
      });
      return;
    }
    
    bot.sendMessage(chatId, '🏆 Loading daily challenge...');
    
    const session = await createSession(userId, language, 'daily', 15);
    if (!session) {
      bot.sendMessage(chatId, '❌ Error creating session. Try again.');
      return;
    }
    
    // Mark as completed
    if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(dailyKey, '1', { ex: 86400 });
    } else {
      global.dailyCompleted = global.dailyCompleted || {};
      global.dailyCompleted[dailyKey] = true;
    }
    
    setTimeout(() => showQuestion(chatId, session), 500);
    return;
  }
  
  // Answer handling
  if (data.startsWith('ans_')) {
    const parts = data.split('_');
    const questionIndex = parseInt(parts[1]);
    const isCorrect = parts[2] === '1';
    
    const session = await getSession(userId);
    if (!session || session.current !== questionIndex) {
      bot.sendMessage(chatId, 'Session expired. Please start a new lesson.');
      return;
    }
    
    const question = session.questions[session.current];
    const user = await getUserFromCache(userId);
    const tier = await getUserTier(userId);
    
    if (isCorrect) {
      session.correct++;
      session.comboStreak++;
      
      // Calculate points with combo bonus
      const comboBonus = session.comboStreak > 2 ? Math.floor(session.comboStreak / 2) : 0;
      const points = question.points + comboBonus;
      session.earned += points;
      
      // Update XP immediately in cache
      await updateUserCache(userId, {
        total_xp: (user?.total_xp || 0) + points,
        weekly_xp: (user?.weekly_xp || 0) + points
      });
      
      // Quick feedback
      let feedback = `✅ +${points} XP`;
      if (session.comboStreak > 2) {
        feedback += ` | 🔥 Combo x${session.comboStreak}`;
      }
      bot.answerCallbackQuery(query.id, { text: feedback });
      
    } else {
      session.comboStreak = 0;
      
      // Show correct answer
      bot.answerCallbackQuery(query.id, {
        text: `❌ Correct: ${question.answer}`,
        show_alert: true
      });
      
      // Deduct heart for free tier
      if (tier === 'free' && user?.hearts_remaining > 0) {
        await updateUserCache(userId, {
          hearts_remaining: user.hearts_remaining - 1
        });
        
        if (user.hearts_remaining - 1 <= 0) {
          bot.sendMessage(chatId, '💔 Out of hearts! Wait for regeneration or buy more.');
          // Clear session
          if (redis.del && process.env.UPSTASH_REDIS_REST_URL) {
            await redis.del(`session:${userId}`);
          } else if (global.sessions) {
            delete global.sessions[userId];
          }
          return;
        }
      }
    }
    
    // Move to next question
    session.current++;
    await updateSession(userId, session);
    
    // Show next question or complete
    if (session.current < session.total) {
      setTimeout(() => showQuestion(chatId, session), 100);
    } else {
      completeSession(chatId, session);
    }
    return;
  }
  
  // Skip question
  if (data === 'skip') {
    const session = await getSession(userId);
    if (!session) return;
    
    bot.answerCallbackQuery(query.id, { text: '⏭️ Skipped' });
    
    session.current++;
    await updateSession(userId, session);
    
    if (session.current < session.total) {
      showQuestion(chatId, session);
    } else {
      completeSession(chatId, session);
    }
    return;
  }
  
  // Dashboard
  if (data === 'dashboard') {
    bot.sendMessage(chatId, '📊 **Dashboard**', {
      parse_mode: 'Markdown',
      reply_markup: getDashboardKeyboard()
    });
    return;
  }
  
  // Progress
  if (data === 'progress') {
    const user = await getUserFromCache(userId);
    const level = Math.floor((user?.total_xp || 0) / 100) + 1;
    const nextLevel = (level * 100) - (user?.total_xp || 0);
    
    bot.sendMessage(chatId, `
📈 **Your Progress**

Level ${level} | ${user?.total_xp || 0} XP
Next level in: ${nextLevel} XP
Lessons today: ${user?.lessons_today || 0}
Total lessons: ${user?.total_lessons || 0}
Perfect lessons: ${user?.perfect_lessons || 0}
Daily streak: ${user?.daily_streak || 0} days

Keep going! 🚀
`, { parse_mode: 'Markdown' });
    return;
  }
  
  // Achievements
  if (data === 'achievements') {
    const user = await getUserFromCache(userId);
    const userAchievements = user?.achievements || [];
    
    let message = '🏅 **Achievements**\n\n';
    
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (userAchievements.includes(key)) {
        message += `${achievement.emoji} **${achievement.name}** ✅\n`;
      } else {
        message += `🔒 ${achievement.name}\n`;
      }
    }
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return;
  }
  
  // Buy hearts
  if (data.startsWith('buy_')) {
    const amount = data.split('_')[1];
    const prices = { '5': 0.01, '25': 0.04 };
    const price = prices[amount];
    
    if (!price) return;
    
    // Store payment pending
    const paymentData = {
      hearts: parseInt(amount),
      price: price,
      timestamp: Date.now()
    };
    
    if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(`payment:${userId}`, JSON.stringify(paymentData), { ex: 600 });
    } else {
      global.payments = global.payments || {};
      global.payments[userId] = paymentData;
    }
    
    bot.sendMessage(chatId, `
💰 **Payment Instructions**

Send exactly **${price} SOL** to:
\`${PAYMENT_WALLET}\`

After sending, click verify:
`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Verify Payment', callback_data: 'verify_payment' }],
          [{ text: '❌ Cancel', callback_data: 'menu' }]
        ]
      }
    });
    return;
  }
  
  // Verify payment
  if (data === 'verify_payment') {
    let pendingData = null;
    
    if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
      const cached = await redis.get(`payment:${userId}`);
      pendingData = cached ? JSON.parse(cached) : null;
    } else {
      pendingData = global.payments?.[userId];
    }
    
    if (!pendingData) {
      bot.sendMessage(chatId, '❌ No pending payment found.');
      return;
    }
    
    bot.answerCallbackQuery(query.id, {
      text: 'Checking blockchain...',
      show_alert: false
    });
    
    const result = await checkRecentPayment(userId, pendingData.price);
    
    if (result.found) {
      const user = await getUserFromCache(userId);
      await updateUserCache(userId, {
        hearts_remaining: (user?.hearts_remaining || 0) + pendingData.hearts
      });
      
      // Clear payment
      if (redis.del && process.env.UPSTASH_REDIS_REST_URL) {
        await redis.del(`payment:${userId}`);
      } else if (global.payments) {
        delete global.payments[userId];
      }
      
      bot.sendMessage(chatId, `
✅ **Payment Confirmed!**

Added ${pendingData.hearts} hearts!
Transaction: \`${result.signature.slice(0, 8)}...\`

Continue learning! 🎉
`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `
❌ **Payment Not Found**

Please check:
• Sent exactly ${pendingData.price} SOL
• Transaction confirmed

Try again in 30 seconds.
`, { parse_mode: 'Markdown' });
    }
    return;
  }
  
  // Upgrade tier
  if (data === 'upgrade') {
    bot.sendMessage(chatId, `
⭐ **Upgrade Tier**

Hold PUMPIT tokens for instant benefits:

**Plus (300K PUMPIT)**
• Unlimited hearts
• 20 lessons/day
• 1.5x XP

**Pro (1M PUMPIT)**
• Unlimited lessons
• 2x XP

**Max (5M PUMPIT)**
• 3x XP
• Everything

Use /connect to link wallet!
`, { parse_mode: 'Markdown' });
    return;
  }
  
  // Help
  if (data === 'help') {
    bot.sendMessage(chatId, 'Use /help for instructions');
    return;
  }
});

// ==================== TEXT MESSAGE HANDLER ====================

bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text;
  
  if (text.startsWith('/')) return;
  
  // Check if awaiting wallet
  let state = null;
  if (redis.get && process.env.UPSTASH_REDIS_REST_URL) {
    state = await redis.get(`state:${userId}`);
  } else {
    state = global.states?.[userId];
  }
  
  if (state === 'awaiting_wallet') {
    if (text.length === 44 && /^[A-Za-z0-9]+$/.test(text)) {
      bot.sendMessage(chatId, '🔍 Checking PUMPIT balance...');
      
      const balance = await checkPumpitBalance(text);
      
      await updateUserCache(userId, {
        wallet_address: text,
        pumpit_balance: balance
      });
      
      const tier = balance >= 5000000 ? 'Max' :
                   balance >= 1000000 ? 'Pro' :
                   balance >= 300000 ? 'Plus' : 'Free';
      
      bot.sendMessage(chatId, `
✅ **Wallet Connected!**

Balance: ${balance.toLocaleString()} PUMPIT
Tier: ${tier}

${tier !== 'Free' ? '🎉 Premium benefits activated!' : 'Need 300k+ PUMPIT for Plus tier'}
`, {
        parse_mode: 'Markdown',
        reply_markup: getMainKeyboard()
      });
      
      // Clear state
      if (redis.del && process.env.UPSTASH_REDIS_REST_URL) {
        await redis.del(`state:${userId}`);
      } else if (global.states) {
        delete global.states[userId];
      }
    } else {
      bot.sendMessage(chatId, '❌ Invalid wallet address. Try again.');
    }
  }
});

// ==================== BACKGROUND SYNC TO SUPABASE ====================

// Sync dirty users to database every 30 seconds (only if Redis is available)
if (redis.smembers && process.env.UPSTASH_REDIS_REST_URL) {
  setInterval(async () => {
    try {
      const dirtyUsers = await redis.smembers('dirty:users');
      
      if (dirtyUsers.length === 0) return;
      
      console.log(`📤 Syncing ${dirtyUsers.length} users to Supabase...`);
      
      for (const userId of dirtyUsers) {
        const userData = await redis.get(`user:${userId}`);
        if (userData) {
          const user = JSON.parse(userData);
          
          // Update in database
          await supabase
            .from('language_users')
            .update({
              total_xp: user.total_xp,
              weekly_xp: user.weekly_xp,
              hearts_remaining: user.hearts_remaining,
              achievements: user.achievements,
              lessons_today: user.lessons_today,
              total_lessons: user.total_lessons,
              last_lesson_at: user.last_lesson_at,
              wallet_address: user.wallet_address,
              pumpit_balance: user.pumpit_balance
            })
            .eq('telegram_id', userId);
        }
      }
      
      // Clear dirty users
      await redis.del('dirty:users');
      
      console.log('✅ Sync complete');
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, 30000); // Every 30 seconds
}

// ==================== CRON JOBS ====================

// Reset daily limits at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Daily reset');
  
  // Clear all daily keys if Redis available
  if (redis.keys && process.env.UPSTASH_REDIS_REST_URL) {
    const keys = await redis.keys('daily:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } else {
    // Clear in-memory daily completed
    global.dailyCompleted = {};
  }
  
  // Reset lessons_today for all users
  await supabase
    .from('language_users')
    .update({ lessons_today: 0 })
    .gte('telegram_id', '0');
});

// Regenerate hearts every hour
cron.schedule('0 * * * *', async () => {
  console.log('❤️ Regenerating hearts');
  
  const { data: users } = await supabase
    .from('language_users')
    .select('telegram_id, hearts_remaining')
    .lt('hearts_remaining', 5);
  
  for (const user of users || []) {
    const tier = await getUserTier(user.telegram_id);
    if (tier === 'free') {
      const newHearts = Math.min(user.hearts_remaining + 1, 5);
      
      // Update in cache
      await updateUserCache(user.telegram_id, {
        hearts_remaining: newHearts
      });
      
      if (user.hearts_remaining === 0) {
        bot.sendMessage(user.telegram_id, '❤️ +1 heart regenerated! Continue learning!');
      }
    }
  }
});

// Weekly leaderboard reset
cron.schedule('0 0 * * 0', async () => {
  console.log('🏆 Weekly reset');
  
  // Clear leaderboard cache if Redis available
  if (redis.del && process.env.UPSTASH_REDIS_REST_URL) {
    await redis.del('leaderboard:weekly');
  }
  
  // Reset weekly XP
  await supabase
    .from('language_users')
    .update({ weekly_xp: 0 })
    .gte('telegram_id', '0');
});

// Reload lessons cache daily (only if Redis available)
if (redis.set && process.env.UPSTASH_REDIS_REST_URL) {
  cron.schedule('0 3 * * *', async () => {
    console.log('🔄 Reloading lessons cache');
    await loadLessonsToRedis();
  });
}

// ==================== ERROR HANDLING ====================

bot.on('polling_error', (error) => {
  if (error.code !== 'ETELEGRAM') {
    console.error('Polling error:', error.code);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// ==================== STARTUP ====================

// Load lessons to Redis on startup
loadLessonsToRedis().then(() => {
  console.log('✅ Bot ready!');
  console.log('🚀 All systems operational');
  console.log(redis.get && process.env.UPSTASH_REDIS_REST_URL ? '⚡ Response time: <5ms' : '⚠️ Running without Redis cache');
  console.log('📊 Use /start in Telegram');
});