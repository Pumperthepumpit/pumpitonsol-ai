// pages/api/viral-guarantee.js
// SIMPLIFIED VERSION - One custom meme, user's exact description

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const XAI_API_KEY = process.env.XAI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      username, 
      situation,  // This is now the EXACT image description
      targetLikes = 100,
      autoPost = false,
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
    
    // Step 1: Generate the EXACT meme the user wants
    console.log('Generating meme with exact description:', situation);
    const memeUrl = await generateCustomMeme(situation);
    
    // Step 2: Create a viral caption for sharing (optional)
    const shareCaption = await generateViralCaption(situation);
    
    // Step 3: Analyze optimal posting time
    const optimalTime = analyzeOptimalPostingTime();
    
    // Step 4: Store in database
    const { data: viralEntry, error } = await supabase
      .from('viral_guarantees')
      .insert({
        username,
        situation,
        target_likes: targetLikes,
        meme_url: memeUrl,
        meme_caption: shareCaption,
        optimal_post_time: optimalTime,
        auto_post: autoPost,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
    }
    
    return res.status(200).json({
      success: true,
      viralId: viralEntry?.id,
      meme: {
        url: memeUrl,
        caption: shareCaption,
        userDescription: situation  // Keep original description
      },
      optimalPostTime: optimalTime,
      guarantee: {
        targetLikes,
        message: 'Your custom meme is ready!'
      }
    });
    
  } catch (error) {
    console.error('Viral guarantee error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate meme',
      error: error.message 
    });
  }
}

// Generate EXACTLY what the user describes
async function generateCustomMeme(userDescription) {
  console.log('Generating custom meme:', userDescription);
  
  if (XAI_API_KEY) {
    try {
      // Try Grok image generation with user's EXACT description
      const response = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: userDescription,  // Use EXACT user description
          model: "grok-2-image",
          n: 1,
          response_format: "url"
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].url) {
          console.log('Successfully generated custom meme');
          return data.data[0].url;
        }
      } else {
        const errorText = await response.text();
        console.error('Grok image generation failed:', errorText);
      }
    } catch (error) {
      console.error('Grok image error:', error);
    }
  }
  
  // Fallback to memegen with user's text
  console.log('Using memegen.link fallback');
  const templates = ['drake', 'buzz', 'doge', 'success', 'disaster', 'batman'];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Split description into top and bottom text
  const words = userDescription.split(' ');
  const midPoint = Math.floor(words.length / 2);
  const topText = words.slice(0, midPoint).join(' ').substring(0, 50);
  const bottomText = words.slice(midPoint).join(' ').substring(0, 50);
  
  return `https://api.memegen.link/images/${template}/${encodeURIComponent(topText)}/${encodeURIComponent(bottomText)}.png`;
}

// Generate a viral caption for sharing (but not change the image)
async function generateViralCaption(description) {
  if (!XAI_API_KEY) {
    return `Check out my $PUMPIT meme! 🚀 ${description.substring(0, 100)}`;
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
            content: 'Create a short, viral tweet caption for sharing a meme. Include emojis and make it engaging.'
          },
          {
            role: 'user',
            content: `Create a viral tweet for this meme: "${description}". Keep it under 200 characters. Include $PUMPIT.`
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
  
  return `Check out this $PUMPIT meme! 🚀 #PUMPIT #Solana`;
}

// Analyze best time to post
function analyzeOptimalPostingTime() {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Peak engagement times (UTC)
  const peakTimes = [
    { hour: 13, label: '9 AM EST' },  
    { hour: 17, label: '1 PM EST' },  
    { hour: 21, label: '5 PM EST' },
    { hour: 1, label: '9 PM EST' }
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