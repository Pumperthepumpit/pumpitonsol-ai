// pages/api/grok-trending.js
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
    const { username } = req.body;
    
    // Clean the username - ensure it has @ at the beginning
    let cleanUsername = username?.trim();
    if (!cleanUsername?.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    
    // Verify premium
    const { data: premiumUser } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_username', cleanUsername)  // Now checking WITH @ symbol
      .gte('expires_at', new Date().toISOString())
      .single();
    if (!premiumUser) {
      return res.status(403).json({ success: false, message: 'Premium required' });
    }

    // Check if Grok API key exists
    if (!process.env.XAI_API_KEY) {
      console.log('XAI_API_KEY not configured, returning mock data');
      
      // Return mock trending data for now
      const mockTopics = [
        { name: '$PUMPIT', tweet_count: '12.5K' },
        { name: 'Solana ATH', tweet_count: '8.3K' },
        { name: 'Meme Season', tweet_count: '6.7K' },
        { name: 'Crypto Bull Run', tweet_count: '5.2K' },
        { name: 'DeFi Summer', tweet_count: '4.8K' },
        { name: 'NFT Revival', tweet_count: '3.9K' },
        { name: 'Bitcoin 100K', tweet_count: '3.5K' },
        { name: 'Ethereum Merge', tweet_count: '2.8K' },
        { name: 'Layer 2s', tweet_count: '2.3K' },
        { name: 'AI Tokens', tweet_count: '1.9K' }
      ];
      
      return res.status(200).json({ 
        success: true, 
        topics: mockTopics,
        source: 'mock'
      });
    }

    // If Grok API is configured, make the real call
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
            content: 'You have real-time access to X/Twitter. List the top 10 trending topics right now in crypto/memes. Return as JSON array with format: [{name: "topic", tweet_count: "number"}]'
          },
          {
            role: 'user',
            content: 'What are the current trending topics on X related to crypto and memes?'
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const trendsText = data.choices[0].message.content;
    
    // Try to parse as JSON, fallback to mock if parsing fails
    let topics;
    try {
      topics = JSON.parse(trendsText);
    } catch (e) {
      // If Grok doesn't return valid JSON, use mock data
      topics = [
        { name: '$PUMPIT', tweet_count: '12.5K' },
        { name: 'Solana ATH', tweet_count: '8.3K' },
        { name: 'Meme Season', tweet_count: '6.7K' }
      ];
    }

    return res.status(200).json({ 
      success: true, 
      topics: topics
    });

  } catch (error) {
    console.error('Trending error:', error);
    
    // Return mock data on error
    return res.status(200).json({ 
      success: true, 
      topics: [
        { name: '$PUMPIT', tweet_count: '12.5K' },
        { name: 'Trending Meme', tweet_count: '5.2K' },
        { name: 'Crypto News', tweet_count: '3.8K' }
      ],
      source: 'fallback'
    });
  }
}