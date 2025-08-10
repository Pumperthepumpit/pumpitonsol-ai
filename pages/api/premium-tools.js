// pages/api/premium-tools.js
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
    const { tool, username, ...params } = req.body;
    
    if (!tool) {
      return res.status(400).json({ success: false, message: 'Tool parameter required' });
    }
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }
    
    // Clean the username - ensure it has @ at the beginning
    let cleanUsername = username?.trim();
    if (!cleanUsername?.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    
    // Verify premium
    const { data: premiumUser } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_username', cleanUsername)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (!premiumUser) {
      return res.status(403).json({ success: false, message: 'Premium required' });
    }
    
    // Route to appropriate tool function
    switch(tool) {
      case 'trending':
        return await handleTrending(res);
      case 'analyze-token':
        return await handleAnalyzeToken(res, params.tokenAddress);
      case 'contract-meme':
        return await handleContractMeme(res, params.contractCode);
      case 'translate':
        return await handleTranslate(res, params.text, params.languages);
      case 'trend-meme':
        return await handleTrendMeme(res, params.topic);
      case 'whitepaper-memes':
        return await handleWhitepaperMemes(res, params.whitepaperContent);
      default:
        return res.status(400).json({ success: false, message: 'Invalid tool specified' });
    }
    
  } catch (error) {
    console.error('Premium tools error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process request',
      error: error.message 
    });
  }
}

// TRENDING TOPICS
async function handleTrending(res) {
  if (!process.env.XAI_API_KEY) {
    console.log('XAI_API_KEY not configured, returning mock data');
    
    const mockTopics = [
      { name: '$PUMPIT', tweet_count: '12.5K' },
      { name: 'Solana ATH', tweet_count: '8.3K' },
      { name: 'Meme Season', tweet_count: '6.7K' },
      { name: 'Crypto Bull Run', tweet_count: '5.2K' },
      { name: 'DeFi Summer', tweet_count: '4.8K' }
    ];
    
    return res.status(200).json({ 
      success: true, 
      topics: mockTopics,
      source: 'mock'
    });
  }
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4',
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
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Grok API error');
    }
    
    try {
  const content = data.choices[0].message.content;
  const topics = JSON.parse(content);
  
  return res.status(200).json({ 
    success: true, 
    topics: topics,
    source: 'grok'
  });
} catch (parseError) {
  console.error('Parse error:', parseError);
  console.error('Raw content:', data.choices[0].message.content);
  // Return mock data if parsing fails
  return res.status(200).json({ 
    success: true, 
    topics: [
      { name: 'Bitcoin Rally', tweet_count: '45.2K' },
      { name: 'Solana Season', tweet_count: '23.1K' },
      { name: '$PUMPIT Trending', tweet_count: '12.5K' }
    ],
    source: 'mock-parse-error'
  });
}
  } catch (error) {
    console.error('Grok API error:', error);
    return res.status(200).json({ 
      success: true, 
      topics: [],
      error: error.message,
      source: 'error'
    });
  }

// TOKEN ANALYZER
async function handleAnalyzeToken(res, tokenAddress) {
  if (!tokenAddress) {
    return res.status(400).json({ success: false, message: 'Token address required' });
  }
  
  if (!process.env.XAI_API_KEY) {
    return res.status(200).json({ 
      success: true, 
      analysis: {
        summary: 'Mock analysis: This token appears to be a standard SPL token on Solana.',
        riskLevel: 'Medium',
        memeUrl: 'https://via.placeholder.com/1024x1024/FFD700/000000?text=Token+Analysis'
      }
    });
  }
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [
          {
            role: 'system',
            content: 'Analyze this Solana token address and provide insights about potential risks, tokenomics, and create a funny meme concept about it.'
          },
          {
            role: 'user',
            content: `Analyze token: ${tokenAddress}`
          }
        ],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Grok API error');
    }
    
    return res.status(200).json({ 
      success: true, 
      analysis: {
        summary: data.choices[0].message.content,
        memeUrl: 'https://via.placeholder.com/1024x1024/FFD700/000000?text=Token+Analyzed'
      }
    });
  } catch (error) {
    console.error('Token analysis error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze token',
      error: error.message 
    });
  }
}

// CONTRACT MEME
async function handleContractMeme(res, contractCode) {
  if (!contractCode) {
    return res.status(400).json({ success: false, message: 'Contract code required' });
  }
  
  return res.status(200).json({ 
    success: true, 
    memeUrl: 'https://via.placeholder.com/1024x1024/FFD700/000000?text=Smart+Contract+Meme',
    caption: 'When your smart contract has more bugs than features'
  });
}

// TRANSLATOR
async function handleTranslate(res, text, languages) {
  if (!text || !languages || languages.length === 0) {
    return res.status(400).json({ success: false, message: 'Text and languages required' });
  }
  
  const translations = {};
  languages.forEach(lang => {
    translations[lang] = `[${lang}] ${text}`; // Mock translation
  });
  
  return res.status(200).json({ 
    success: true, 
    translations 
  });
}

// TREND MEME
async function handleTrendMeme(res, topic) {
  if (!topic) {
    return res.status(400).json({ success: false, message: 'Topic required' });
  }
  
  const memeId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  return res.status(200).json({ 
    success: true, 
    memeUrl: `https://via.placeholder.com/1024x1024/FFD700/000000?text=${encodeURIComponent(topic.title || 'Trend')}`,
    memeId: memeId,
    caption: `Trending: ${topic.title || 'Hot topic'}`
  });
}

// WHITEPAPER MEMES
async function handleWhitepaperMemes(res, whitepaperContent) {
  if (!whitepaperContent) {
    return res.status(400).json({ success: false, message: 'Whitepaper content required' });
  }
  
  const memes = [
    {
      url: 'https://via.placeholder.com/1024x1024/FFD700/000000?text=Whitepaper+Meme+1',
      topic: 'Introduction',
      caption: 'When the whitepaper starts with "revolutionary"'
    },
    {
      url: 'https://via.placeholder.com/1024x1024/FFD700/000000?text=Whitepaper+Meme+2',
      topic: 'Tokenomics',
      caption: 'The tokenomics section be like'
    }
  ];
  
  return res.status(200).json({ 
    success: true, 
    memes 
  });
}