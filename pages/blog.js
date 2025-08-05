// auto-blog-generator.js
// This script runs daily to generate blog posts

require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Initialize services
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Get top memes from last 24 hours
async function getTopMemes(limit = 5) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data, error } = await supabase
    .from('memes')
    .select('*')
    .gte('created_at', yesterday.toISOString())
    .order('likes_count', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

// Get trending topics
async function getTrendingTopics() {
  const { data, error } = await supabase
    .from('memes')
    .select('topic')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('likes_count', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  
  // Count topic frequency
  const topicCounts = {};
  data.forEach(meme => {
    if (meme.topic) {
      const words = meme.topic.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          topicCounts[word] = (topicCounts[word] || 0) + 1;
        }
      });
    }
  });
  
  // Get top 5 trending words
  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

// Generate blog post types
const blogTypes = [
  'daily_roundup',
  'trending_analysis',
  'creator_spotlight',
  'weekly_recap',
  'meme_tutorial'
];

// Generate daily roundup post
async function generateDailyRoundup(memes) {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const prompt = `Write an engaging blog post about today's top PUMPIT memes. 
  Include:
  - Catchy introduction about the day's meme trends
  - Brief description of each top meme
  - What made them popular
  - Community reactions
  - Call to action to create their own
  
  Top memes today:
  ${memes.map((m, i) => `${i+1}. "${m.topic}" - ${m.likes_count} likes`).join('\n')}
  
  Make it fun, engaging, and under 500 words. Include relevant crypto/meme terminology.`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800
  });
  
  const content = response.choices[0].message.content;
  
  return {
    title: `Top PUMPIT Memes Today - ${today}`,
    content: content,
    excerpt: content.substring(0, 150) + '...',
    type: 'daily_roundup',
    featured_memes: memes.map(m => m.id)
  };
}

// Generate trending analysis post
async function generateTrendingAnalysis(trends, memes) {
  const prompt = `Write an analytical blog post about trending topics in PUMPIT memes.
  
  Trending topics: ${trends.join(', ')}
  
  Include:
  - Why these topics are trending
  - Examples from recent memes
  - What this says about the community
  - Predictions for next trends
  
  Make it insightful but fun, around 400 words.`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600
  });
  
  const content = response.choices[0].message.content;
  
  return {
    title: `Why "${trends[0]}" Memes Are Taking Over PUMPIT`,
    content: content,
    excerpt: content.substring(0, 150) + '...',
    type: 'trending_analysis',
    featured_memes: memes.slice(0, 3).map(m => m.id)
  };
}

// Generate meme creation tutorial
async function generateTutorial() {
  const topics = [
    "How to Create Viral PUMPIT Memes",
    "5 Tips for Better Meme Prompts",
    "PUMPIT Meme Styles Guide",
    "From Idea to Viral: Meme Creation Process",
    "Common Meme Mistakes to Avoid"
  ];
  
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  const prompt = `Write a helpful tutorial blog post: "${topic}"
  
  Include:
  - Step-by-step instructions
  - Pro tips
  - Examples
  - How to use the PUMPIT bot
  
  Make it practical and actionable, around 400 words.`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600
  });
  
  const content = response.choices[0].message.content;
  
  return {
    title: topic,
    content: content + '\n\n**Ready to create your own meme?** Use our [Telegram Bot](https://t.me/pumpermemebot) or [Web Generator](https://letspumpit.com/#generator)!',
    excerpt: content.substring(0, 150) + '...',
    type: 'tutorial'
  };
}

// Main blog generation function
async function generateBlogPost() {
  try {
    console.log('🚀 Starting blog generation...');
    
    // Get data
    const memes = await getTopMemes(5);
    const trends = await getTrendingTopics();
    
    // Decide which type of post to generate
    const dayOfWeek = new Date().getDay();
    let post;
    
    if (dayOfWeek === 1) { // Monday - Weekly recap
      post = await generateDailyRoundup(memes);
      post.title = `PUMPIT Weekly Recap - ${new Date().toLocaleDateString()}`;
    } else if (dayOfWeek === 3) { // Wednesday - Trending analysis
      post = await generateTrendingAnalysis(trends, memes);
    } else if (dayOfWeek === 5) { // Friday - Tutorial
      post = await generateTutorial();
    } else { // Other days - Daily roundup
      post = await generateDailyRoundup(memes);
    }
    
    // Add SEO elements
    post.slug = generateSlug(post.title);
    post.meta_description = post.excerpt;
    post.keywords = `PUMPIT, Solana, memes, ${trends.join(', ')}, crypto memes, daily memes`;
    
    // Set featured image (use top meme if available)
    if (memes.length > 0 && memes[0].image_url) {
      post.featured_image = memes[0].image_url;
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(post)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Blog post generated:', data.title);
    
    // Share on social media (optional)
    await shareToSocials(data);
    
    return data;
  } catch (error) {
    console.error('❌ Error generating blog post:', error);
    throw error;
  }
}

// Share to social media
async function shareToSocials(post) {
  // This can be expanded to actually post to Twitter/Telegram
  console.log(`📢 Ready to share: ${post.title}`);
  console.log(`🔗 Link: https://letspumpit.com/blog/${post.slug}`);
  
  // TODO: Implement actual social sharing
  // - Twitter API integration
  // - Telegram channel posting
}

// Schedule daily blog generation
function scheduleBlogGeneration() {
  // Run every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled blog generation...');
    try {
      await generateBlogPost();
    } catch (error) {
      console.error('Scheduled blog generation failed:', error);
    }
  });
  
  console.log('📅 Blog generation scheduled for 9 AM daily');
}

// Manual generation (for testing)
async function generateNow() {
  try {
    const post = await generateBlogPost();
    console.log('Generated post:', post);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Export functions
module.exports = {
  generateBlogPost,
  scheduleBlogGeneration,
  generateNow
};

// If running directly, generate one post now
if (require.main === module) {
  generateNow();
}