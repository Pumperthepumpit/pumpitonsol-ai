// bots/learn-bot-stateless.js - Duolingo-style stateless architecture
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
require('dotenv').config({ path: '.env.local' });

// ==================== INITIALIZE SERVICES ====================

// Initialize Supabase for permanent storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.LEARN_BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
      allowed_updates: ['message', 'callback_query']
    }
  }
});

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
console.log('🚀 STATELESS PUMPIT LANGUAGE BOT');
console.log('✅ Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected' : 'Missing');
console.log('✅ Bot Token:', process.env.LEARN_BOT_TOKEN ? 'Connected' : 'Missing');
console.log('✅ Architecture: Stateless (Duolingo-style)');
console.log('📊 Use /start in Telegram');

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

// ==================== STATELESS QUESTION MANAGEMENT ====================

// Encode lesson data into callback format
function encodeCallback(action, data) {
  // Format: action_param1_param2_etc
  // Examples: 
  // ans_spanish_0_1_10 = answer for spanish, question 0, correct, 10xp
  // next_spanish_1_50 = next question, spanish, question 1, 50xp earned so far
  const parts = [action, ...Object.values(data)];
  return parts.join('_');
}

// Decode callback data
function decodeCallback(callbackData) {
  const parts = callbackData.split('_');
  const action = parts[0];
  
  switch(action) {
    case 'ans':
      return {
        action: 'answer',
        language: parts[1],
        questionIndex: parseInt(parts[2]),
        isCorrect: parts[3] === '1',
        points: parseInt(parts[4]) || 10
      };
    case 'next':
      return {
        action: 'next',
        language: parts[1],
        questionIndex: parseInt(parts[2]),
        totalXP: parseInt(parts[3]) || 0,
        correct: parseInt(parts[4]) || 0
      };
    case 'complete':
      return {
        action: 'complete',
        language: parts[1],
        totalXP: parseInt(parts[2]) || 0,
        correct: parseInt(parts[3]) || 0,
        total: parseInt(parts[4]) || 0
      };
    default:
      return { action: parts[0], data: parts.slice(1) };
  }
}

// ==================== LESSON QUESTIONS ====================

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

async function getLessonQuestions(language, userId, type = 'lesson') {
  try {
    // Try to get from database
    const { data: lessons } = await supabase
      .from('lessons')
      .select('questions')
      .eq('language', language)
      .limit(1)
      .single();
    
    let questions = lessons?.questions || getStaticQuestions(language);
    
    // Adjust based on type
    if (type === 'daily') {
      questions = questions.slice(0, 15);
      // Double points for daily challenge
      questions = questions.map(q => ({ ...q, points: (q.points || 10) * 2 }));
    } else if (type === 'quick') {
      questions = questions.slice(0, 5);
    } else {
      questions = questions.slice(0, 10);
    }
    
    return questions;
  } catch (error) {
    console.error('Error fetching questions:', error);
    return getStaticQuestions(language);
  }
}

// ==================== USER MANAGEMENT ====================

async function getUser(userId) {
  try {
    const { data: user } = await supabase
      .from('language_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();
    
    if (user) return user;
    
    // Create new user
    const newUser = {
      telegram_id: userId,
      telegram_username: 'user',
      hearts_remaining: 5,
      total_xp: 0,
      daily_streak: 0,
      lessons_today: 0,
      weekly_xp: 0,
      achievements: [],
      subscription_tier: 'free',
      created_at: new Date().toISOString()
    };
    
    await supabase.from('language_users').insert(newUser);
    return newUser;
  } catch (error) {
    console.error('User fetch error:', error);
    return null;
  }
}

async function updateUser(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('language_users')
      .update(updates)
      .eq('telegram_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('User update error:', error);
    return null;
  }
}

// ==================== STATELESS QUESTION DISPLAY ====================

async function sendQuestion(chatId, language, questionIndex, questions, stats = { earned: 0, correct: 0 }) {
  if (questionIndex >= questions.length) {
    return completeLesson(chatId, language, stats, questions.length);
  }
  
  const q = questions[questionIndex];
  const progress = questionIndex + 1;
  
  let message = `📚 **Lesson Progress** (${progress}/${questions.length})\n`;
  message += `⭐ Score: ${stats.earned} XP | ✅ Correct: ${stats.correct}/${questionIndex}\n\n`;
  message += `**Translate to ${language}:**\n"${q.question}"`;
  
  const keyboard = {
    inline_keyboard: []
  };
  
  // Shuffle options for each question
  const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
  shuffledOptions.forEach(opt => {
    const isCorrect = opt === q.answer;
    // Encode all data needed to process answer
    const callbackData = encodeCallback('ans', {
      lang: language.substring(0, 2), // Shorten to fit
      qIndex: questionIndex,
      correct: isCorrect ? '1' : '0',
      points: q.points
    });
    
    keyboard.inline_keyboard.push([{
      text: opt,
      callback_data: callbackData
    }]);
  });
  
  keyboard.inline_keyboard.push([
    { text: '⏭️ Skip', callback_data: `skip_${language}_${questionIndex}_${stats.earned}_${stats.correct}` }
  ]);
  
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function completeLesson(chatId, language, stats, totalQuestions) {
  const accuracy = Math.round((stats.correct / totalQuestions) * 100);
  const gradeEmoji = accuracy === 100 ? '🥇' : accuracy >= 80 ? '🥈' : '🥉';
  
  const message = `
✅ **Lesson Complete!**

${gradeEmoji} Accuracy: ${accuracy}%
⭐ XP Earned: ${stats.earned}
✅ Correct: ${stats.correct}/${totalQuestions}

${accuracy === 100 ? '🎉 Perfect score!' : accuracy >= 80 ? '👏 Great job!' : '💪 Keep practicing!'}
`;
  
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📚 New Lesson', callback_data: `start_${language}` },
          { text: '🎯 Quick 5', callback_data: `quick_${language}` }
        ],
        [{ text: '🏠 Main Menu', callback_data: 'menu' }]
      ]
    }
  });
  
  // Update user stats in database
  const userId = chatId.toString();
  const user = await getUser(userId);
  if (user) {
    await updateUser(userId, {
      total_xp: (user.total_xp || 0) + stats.earned,
      weekly_xp: (user.weekly_xp || 0) + stats.earned,
      total_lessons: (user.total_lessons || 0) + 1,
      lessons_today: (user.lessons_today || 0) + 1,
      last_lesson_at: new Date().toISOString()
    });
  }
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

// ==================== BOT COMMANDS ====================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  
  const user = await getUser(userId);
  const level = Math.floor((user?.total_xp || 0) / 100) + 1;
  
  bot.sendMessage(chatId, `
🎓 **PUMPIT Language Learning**

📚 Level ${level} | ${user?.total_xp || 0} XP
❤️ Hearts: ${user?.hearts_remaining || 5}/5
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
/progress - View stats
/leaderboard - Top learners

**Architecture:**
This bot uses stateless architecture inspired by Duolingo.
No sessions to expire - each interaction is self-contained!

**Features:**
• Instant responses
• No session timeouts
• Progress saved after each lesson
• Works even if bot restarts
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/progress/, async (msg) => {
  const userId = msg.from.id.toString();
  const user = await getUser(userId);
  const level = Math.floor((user?.total_xp || 0) / 100) + 1;
  const progress = (user?.total_xp || 0) % 100;
  
  bot.sendMessage(msg.chat.id, `
📊 **Your Progress**

🎖️ Level ${level} (${user?.total_xp || 0} XP)
Progress: [${'▓'.repeat(Math.floor(progress/10))}${'░'.repeat(10-Math.floor(progress/10))}] ${progress}%
🔥 Streak: ${user?.daily_streak || 0} days
📚 Lessons: ${user?.total_lessons || 0}
❤️ Hearts: ${user?.hearts_remaining || 5}/5
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/leaderboard/, async (msg) => {
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
  
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

// ==================== STATELESS CALLBACK HANDLERS ====================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const data = query.data;
  
  // Answer callback immediately
  bot.answerCallbackQuery(query.id).catch(() => {});
  
  // Delete the previous message to keep chat clean
  bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
  
  // Main menu
  if (data === 'menu') {
    const user = await getUser(userId);
    const level = Math.floor((user?.total_xp || 0) / 100) + 1;
    
    bot.sendMessage(chatId, `
🎓 **Main Menu**

Level ${level} | ${user?.total_xp || 0} XP
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
    const user = await getUser(userId);
    
    bot.sendMessage(chatId, `
${language === 'spanish' ? '🇪🇸 **Spanish**' : '🇫🇷 **French**'} Course

❤️ Hearts: ${user?.hearts_remaining || 5}

Choose mode:
`, {
      parse_mode: 'Markdown',
      reply_markup: getLearningKeyboard(language)
    });
    return;
  }
  
  // Start lesson
  if (data.startsWith('start_')) {
    const language = data.split('_')[1];
    const user = await getUser(userId);
    
    // Check hearts
    if ((user?.hearts_remaining || 0) <= 0) {
      bot.sendMessage(chatId, `
💔 **Out of Hearts!**

Wait 1 hour for regeneration or upgrade your tier.
`, { parse_mode: 'Markdown' });
      return;
    }
    
    bot.sendMessage(chatId, '📚 Loading lesson...');
    
    // Get questions and start lesson
    const questions = await getLessonQuestions(language, userId, 'lesson');
    setTimeout(() => {
      sendQuestion(chatId, language, 0, questions, { earned: 0, correct: 0 });
    }, 500);
    return;
  }
  
  // Quick practice
  if (data.startsWith('quick_')) {
    const language = data.split('_')[1];
    
    bot.sendMessage(chatId, '🎯 Loading quick practice...');
    
    const questions = await getLessonQuestions(language, userId, 'quick');
    setTimeout(() => {
      sendQuestion(chatId, language, 0, questions, { earned: 0, correct: 0 });
    }, 500);
    return;
  }
  
  // Daily challenge
  if (data.startsWith('daily_')) {
    const language = data.split('_')[1];
    
    bot.sendMessage(chatId, '🏆 Loading daily challenge...');
    
    const questions = await getLessonQuestions(language, userId, 'daily');
    setTimeout(() => {
      sendQuestion(chatId, language, 0, questions, { earned: 0, correct: 0 });
    }, 500);
    return;
  }
  
  // Handle answer - STATELESS!
  if (data.startsWith('ans_')) {
    const decoded = decodeCallback(data);
    const language = decoded.language === 'sp' ? 'spanish' : 'french';
    const questionIndex = decoded.questionIndex;
    const isCorrect = decoded.isCorrect;
    const points = decoded.points;
    
    // Get questions again (stateless - we don't store them)
    const questions = await getLessonQuestions(language, userId);
    const user = await getUser(userId);
    
    // Calculate new stats based on answer
    let earnedSoFar = 0;
    let correctSoFar = 0;
    
    // Parse stats from previous questions if available
    // In a real implementation, you might encode this in the callback
    
    if (isCorrect) {
      earnedSoFar += points;
      correctSoFar += 1;
      
      // Update XP immediately
      await updateUser(userId, {
        total_xp: (user?.total_xp || 0) + points,
        weekly_xp: (user?.weekly_xp || 0) + points
      });
      
      bot.answerCallbackQuery(query.id, { text: `✅ Correct! +${points} XP` });
    } else {
      // Deduct heart for wrong answer (free tier only)
      if (user?.subscription_tier === 'free' && (user?.hearts_remaining || 0) > 0) {
        await updateUser(userId, {
          hearts_remaining: Math.max(0, (user?.hearts_remaining || 5) - 1)
        });
      }
      
      bot.answerCallbackQuery(query.id, { 
        text: `❌ Wrong! Correct: ${questions[questionIndex].answer}`,
        show_alert: true 
      });
    }
    
    // Send next question
    sendQuestion(chatId, language, questionIndex + 1, questions, {
      earned: earnedSoFar,
      correct: correctSoFar
    });
    return;
  }
  
  // Skip question
  if (data.startsWith('skip_')) {
    const parts = data.split('_');
    const language = parts[1];
    const questionIndex = parseInt(parts[2]);
    const earnedSoFar = parseInt(parts[3]) || 0;
    const correctSoFar = parseInt(parts[4]) || 0;
    
    const questions = await getLessonQuestions(language, userId);
    
    bot.answerCallbackQuery(query.id, { text: '⏭️ Skipped' });
    
    sendQuestion(chatId, language, questionIndex + 1, questions, {
      earned: earnedSoFar,
      correct: correctSoFar
    });
    return;
  }
  
  // Progress
  if (data === 'progress') {
    const user = await getUser(userId);
    const level = Math.floor((user?.total_xp || 0) / 100) + 1;
    const nextLevel = (level * 100) - (user?.total_xp || 0);
    
    bot.sendMessage(chatId, `
📈 **Your Progress**

Level ${level} | ${user?.total_xp || 0} XP
Next level in: ${nextLevel} XP
Lessons today: ${user?.lessons_today || 0}
Total lessons: ${user?.total_lessons || 0}
Daily streak: ${user?.daily_streak || 0} days

Keep going! 🚀
`, { parse_mode: 'Markdown' });
    return;
  }
  
  // Dashboard
  if (data === 'dashboard') {
    bot.sendMessage(chatId, '📊 **Dashboard**\n\nSelect an option:', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎯 Daily Challenge', callback_data: 'daily_spanish' },
            { text: '🏆 Achievements', callback_data: 'achievements' }
          ],
          [{ text: '← Back', callback_data: 'menu' }]
        ]
      }
    });
    return;
  }
});

// ==================== HOURLY HEART REGENERATION ====================

setInterval(async () => {
  console.log('❤️ Regenerating hearts...');
  
  const { data: users } = await supabase
    .from('language_users')
    .select('telegram_id, hearts_remaining')
    .lt('hearts_remaining', 5);
  
  for (const user of users || []) {
    const newHearts = Math.min((user.hearts_remaining || 0) + 1, 5);
    await updateUser(user.telegram_id, { hearts_remaining: newHearts });
    
    if (user.hearts_remaining === 0) {
      bot.sendMessage(user.telegram_id, '❤️ +1 heart regenerated! Continue learning!');
    }
  }
}, 3600000); // Every hour

// ==================== DAILY RESET ====================

setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    console.log('🔄 Daily reset');
    
    await supabase
      .from('language_users')
      .update({ lessons_today: 0 })
      .gte('telegram_id', '0');
  }
}, 60000); // Check every minute

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

console.log('✅ Stateless bot ready!');
console.log('🚀 No sessions to expire');
console.log('⚡ All interactions self-contained');
console.log('📊 Duolingo-style architecture');