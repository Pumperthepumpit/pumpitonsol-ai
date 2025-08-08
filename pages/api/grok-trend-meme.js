// pages/api/grok-trend-meme.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { topic, username } = req.body;
    
    // Verify premium
    const { data: premiumUser } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_username', username?.replace('@', ''))
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!premiumUser) {
      return res.status(403).json({ success: false, message: 'Premium required' });
    }

    let memeUrl;
    
    // Check if we have Grok API configured
    if (process.env.XAI_API_KEY) {
      // Use Grok to generate meme idea first
      const ideaResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: 'You are a meme creator. Create a funny meme concept about the given trending topic.'
            },
            {
              role: 'user',
              content: `Create a viral meme concept about "${topic.name}" which is trending with ${topic.tweet_count} posts. Make it funny and relevant to crypto community.`
            }
          ],
          temperature: 0.9
        })
      });

      const ideaData = await ideaResponse.json();
      const memeIdea = ideaData.choices[0].message.content;
      
      // For now, we'll use a placeholder image since Grok doesn't generate images yet
      // You could integrate DALL-E here if you have OpenAI API
      memeUrl = `https://via.placeholder.com/1024x1024/FFD700/000000?text=${encodeURIComponent(topic.name)}`;
      
    } else {
      // Fallback to placeholder
      memeUrl = `https://via.placeholder.com/1024x1024/FFD700/000000?text=${encodeURIComponent(topic.name)}`;
    }

    // Save to database
    const { data: memeData, error: dbError } = await supabase
      .from('memes')
      .insert({
        image_url: memeUrl,
        creator_x_handle: username,
        topic: `Trending: ${topic.name}`,
        description: `Meme about trending topic ${topic.name} with ${topic.tweet_count} posts`,
        source: 'grok-trending',
        from_telegram_bot: false,
        is_premium: true,
        likes_count: 0,
        shares_count: 0,
        views_count: 0
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return res.status(200).json({ 
      success: true, 
      memeUrl: memeUrl,
      memeId: memeData?.id
    });

  } catch (error) {
    console.error('Trend meme error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate meme' });
  }
}