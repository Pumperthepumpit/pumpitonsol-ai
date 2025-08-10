// pages/api/viral-guarantee.js
// The Viral Guarantee System - Your $13/month killer feature

import { createClient } from '@supabase/supabase-js';
import cache from '../../lib/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const XAI_API_KEY = process.env.XAI_API_KEY;

// ============= VIRAL GUARANTEE SYSTEM =============
export default async function handler(req, res) {
  const { method } = req;
  
  switch (method) {
    case 'POST':
      return handleViralMemeCreation(req, res);
    case 'GET':
      return getViralStats(req, res);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Main viral meme creation with guarantee
async function handleViralMemeCreation(req, res) {
  try {
    const { 
      username, 
      situation, 
      targetLikes = 100,
      autoPost = true,
      xAccessToken 
    } = req.body;
    
    // Verify premium status
    const isPremium = await verifyPremium(username);
    if (!isPremium) {
      return res.status(403).json({ 
        success: false, 
        message: 'Premium required for Viral Guarantee' 
      });
    }
    
    // Step 1: Analyze optimal posting time
    const optimalTime = await analyzeOptimalPostingTime();
    
    // Step 2: Generate 5 meme variations
    const memeVariations = await generateViralMemes(situation);
    
    // Step 3: Pick best one using AI
    const bestMeme = await selectBestMeme(memeVariations, situation);
    
    // Step 4: Store in database with viral tracking
    const viralEntry = await supabase
      .from('viral_guarantees')
      .insert({
        username,
        situation,
        target_likes: targetLikes,
        meme_url: bestMeme.url,
        meme_caption: bestMeme.caption,
        variations: memeVariations,
        optimal_post_time: optimalTime,
        auto_post: autoPost,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    // Step 5: Schedule posting if auto-post enabled
    if (autoPost && xAccessToken) {
      await scheduleViralPost(viralEntry.data, xAccessToken);
    }
    
    return res.status(200).json({
      success: true,
      viralId: viralEntry.data.id,
      meme: bestMeme,
      optimalPostTime: optimalTime,
      guarantee: {
        targetLikes,
        retryEnabled: true,
        maxRetries: 3
      },
      variations: memeVariations,
      message: `Your meme will be posted at ${optimalTime} for maximum engagement!`
    });
    
  } catch (error) {
    console.error('Viral guarantee error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create viral meme',
      error: error.message 
    });
  }
}

// Generate 5 different meme styles for the same situation
async function generateViralMemes(situation) {
  const memeStyles = [
    { style: 'Drake', prompt: `Drake meme format: No to boring, Yes to ${situation}` },
    { style: 'Wojak', prompt: `Wojak crying then happy: Before/After ${situation}` },
    { style: 'Galaxy Brain', prompt: `Galaxy brain expanding meme about ${situation}` },
    { style: 'This is Fine', prompt: `"This is fine" dog meme but about ${situation}` },
    { style: 'PUMPIT Special', prompt: `$PUMPIT Pumper character reacting to ${situation}` }
  ];
  
  const memes = [];
  
  for (const style of memeStyles) {
    try {
      // Generate caption with Grok
      const caption = await generateViralCaption(situation, style.style);
      
      // Generate image
      const imageUrl = await generateMemeImage(style.prompt, caption);
      
      memes.push({
        style: style.style,
        url: imageUrl,
        caption: caption,
        prompt: style.prompt
      });
    } catch (error) {
      console.error(`Failed to generate ${style.style} meme:`, error);
    }
  }
  
  return memes;
}

// Use Grok to generate viral caption
async function generateViralCaption(situation, style) {
  if (!XAI_API_KEY) {
    return `${situation} - ${style} style meme`;
  }
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a viral meme creator for Crypto Twitter. Create captions that get massive engagement.'
          },
          {
            role: 'user',
            content: `Create a viral ${style} meme caption about: ${situation}
                     Requirements:
                     - Under 280 characters
                     - Include relevant emojis
                     - Make it relatable to crypto traders
                     - Add a call to action or question
                     - Include $PUMPIT if relevant`
          }
        ],
        temperature: 0.9,
        max_tokens: 100
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('Caption generation error:', error);
  }
  
  return `${situation} 🚀 #PUMPIT`;
}

// Generate meme image
async function generateMemeImage(prompt, caption) {
  if (XAI_API_KEY) {
    try {
      const response = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: `${prompt}. Caption: "${caption}"`,
          model: "grok-2-image",
          n: 1,
          response_format: "url"
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0]) {
          return data.data[0].url;
        }
      }
    } catch (error) {
      console.error('Image generation error:', error);
    }
  }
  
  // Fallback to memegen
  const templates = ['drake', 'buzz', 'doge', 'success', 'disaster'];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const topText = prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
  const bottomText = caption.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
  
  return `https://api.memegen.link/images/${template}/${encodeURIComponent(topText)}/${encodeURIComponent(bottomText)}.png`;
}

// AI selects the best meme from variations
async function selectBestMeme(variations, situation) {
  if (!XAI_API_KEY || variations.length === 0) {
    return variations[0] || { url: '', caption: situation };
  }
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at predicting viral content on Crypto Twitter.'
          },
          {
            role: 'user',
            content: `Which meme will get the most engagement for: "${situation}"
                     Options:
                     ${variations.map((v, i) => `${i+1}. ${v.style}: ${v.caption}`).join('\n')}
                     
                     Return just the number (1-${variations.length})`
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const choice = parseInt(data.choices[0].message.content) - 1;
      if (choice >= 0 && choice < variations.length) {
        return variations[choice];
      }
    }
  } catch (error) {
    console.error('Best meme selection error:', error);
  }
  
  // Default to PUMPIT style if available
  return variations.find(v => v.style === 'PUMPIT Special') || variations[0];
}

// Analyze best time to post based on engagement patterns
async function analyzeOptimalPostingTime() {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Peak engagement times (UTC)
  const peakTimes = [
    { hour: 13, score: 10 }, // 9 AM EST
    { hour: 17, score: 9 },  // 1 PM EST  
    { hour: 21, score: 8 },  // 5 PM EST
    { hour: 1, score: 7 },   // 9 PM EST
  ];
  
  // Find next peak time
  let nextPeak = peakTimes.find(t => t.hour > hour);
  if (!nextPeak) {
    nextPeak = peakTimes[0]; // Next day's first peak
  }
  
  const optimalTime = new Date();
  if (nextPeak.hour > hour) {
    optimalTime.setUTCHours(nextPeak.hour, 0, 0, 0);
  } else {
    optimalTime.setDate(optimalTime.getDate() + 1);
    optimalTime.setUTCHours(nextPeak.hour, 0, 0, 0);
  }
  
  return optimalTime.toISOString();
}

// Schedule post for optimal time
async function scheduleViralPost(viralEntry, xAccessToken) {
  // Store in scheduled posts table
  await supabase
    .from('scheduled_posts')
    .insert({
      viral_guarantee_id: viralEntry.id,
      scheduled_time: viralEntry.optimal_post_time,
      x_access_token: xAccessToken,
      status: 'scheduled',
      meme_url: viralEntry.meme_url,
      caption: viralEntry.meme_caption
    });
  
  // In production, you'd use a cron job or queue service
  // For now, we'll use a timeout (not ideal for production)
  const delay = new Date(viralEntry.optimal_post_time) - new Date();
  
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
    setTimeout(async () => {
      await postToX(viralEntry, xAccessToken);
      await checkViralPerformance(viralEntry.id);
    }, delay);
  }
}

// Post to X/Twitter
async function postToX(viralEntry, accessToken) {
  try {
    const response = await fetch('/api/x-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken,
        text: viralEntry.meme_caption,
        mediaUrl: viralEntry.meme_url
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Update database with post ID
      await supabase
        .from('viral_guarantees')
        .update({
          x_post_id: data.postId,
          posted_at: new Date().toISOString(),
          status: 'posted'
        })
        .eq('id', viralEntry.id);
    }
  } catch (error) {
    console.error('Failed to post to X:', error);
  }
}

// Check performance and retry if needed
async function checkViralPerformance(viralId) {
  // Wait 24 hours then check engagement
  setTimeout(async () => {
    const { data: viral } = await supabase
      .from('viral_guarantees')
      .select('*')
      .eq('id', viralId)
      .single();
    
    if (viral && viral.status === 'posted') {
      // Get engagement metrics from X API
      const likes = await getPostLikes(viral.x_post_id);
      
      if (likes < viral.target_likes && viral.retry_count < 3) {
        // Didn't hit target, generate new version
        console.log(`Meme got ${likes} likes, target was ${viral.target_likes}. Retrying...`);
        
        // Generate new variation
        const newMemes = await generateViralMemes(viral.situation);
        const bestMeme = await selectBestMeme(newMemes, viral.situation);
        
        // Update and repost
        await supabase
          .from('viral_guarantees')
          .update({
            retry_count: viral.retry_count + 1,
            status: 'retrying',
            meme_url: bestMeme.url,
            meme_caption: bestMeme.caption
          })
          .eq('id', viralId);
        
        // Post new version
        await postToX({
          ...viral,
          meme_url: bestMeme.url,
          meme_caption: bestMeme.caption + ' (Take 2 🔥)'
        }, viral.x_access_token);
        
        // Check again in 24 hours
        checkViralPerformance(viralId);
      } else if (likes >= viral.target_likes) {
        // Success!
        await supabase
          .from('viral_guarantees')
          .update({
            status: 'viral',
            final_likes: likes,
            went_viral_at: new Date().toISOString()
          })
          .eq('id', viralId);
        
        console.log(`🎉 Meme went viral with ${likes} likes!`);
      }
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Get post engagement (mock - replace with real X API)
async function getPostLikes(postId) {
  // In production, call X API to get real metrics
  // For now, return mock data
  return Math.floor(Math.random() * 200) + 50;
}

// Get viral stats for user
async function getViralStats(req, res) {
  const { username } = req.query;
  
  try {
    const { data: stats } = await supabase
      .from('viral_guarantees')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false });
    
    const summary = {
      totalAttempts: stats.length,
      viralSuccess: stats.filter(s => s.status === 'viral').length,
      averageLikes: stats.reduce((sum, s) => sum + (s.final_likes || 0), 0) / stats.length,
      bestPerformer: stats.sort((a, b) => (b.final_likes || 0) - (a.final_likes || 0))[0],
      recentMemes: stats.slice(0, 5)
    };
    
    return res.status(200).json({
      success: true,
      stats: summary
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get stats' 
    });
  }
}

// Verify premium status
async function verifyPremium(username) {
  if (!username) return false;
  
  const { data } = await supabase
    .from('premium_users')
    .select('*')
    .eq('telegram_username', username)
    .gte('expires_at', new Date().toISOString())
    .single();
  
  return !!data;
}