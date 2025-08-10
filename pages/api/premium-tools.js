// pages/api/premium-tools.js
// PART 1 OF 5 - IMPORTS AND MAIN HANDLER

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test if API key exists and log it (remove in production)
const XAI_API_KEY = process.env.XAI_API_KEY;
console.log('API Key exists:', !!XAI_API_KEY);

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
    
    // Just trim the username, don't add @
    let cleanUsername = username?.trim();
    
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
// PART 2 OF 5 - IMAGE GENERATION AND TRENDING

// Helper function to generate images with Grok/Aurora - ORIGINAL VERSION
async function generateGrokImage(prompt) {
  console.log('Attempting to generate image with prompt:', prompt);
  
  try {
    // Try Aurora image generation endpoint
    const response = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        model: "aurora" // or try "grok-2-image"
      })
    });
    
    console.log('Aurora response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Aurora response data:', JSON.stringify(data).substring(0, 200));
      
      if (data.data && data.data[0] && data.data[0].url) {
        return data.data[0].url;
      }
    } else {
      const errorData = await response.json();
      console.error('Aurora error:', errorData);
    }
  } catch (error) {
    console.error('Aurora generation failed:', error);
  }
  
  // Fallback to memegen.link if Aurora fails
  console.log('Falling back to memegen.link');
  const templates = ['drake', 'buzz', 'doge', 'success', 'disaster', 'fry', 'aliens', 'batman', 'oprah'];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  const topText = prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '');
  const bottomText = 'PUMPIT TO THE MOON';
  
  return `https://api.memegen.link/images/${randomTemplate}/${encodeURIComponent(topText)}/${encodeURIComponent(bottomText)}.png`;
}

// TRENDING TOPICS
async function handleTrending(res) {
  console.log('Fetching trending topics...');
  
  try {
    if (XAI_API_KEY) {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-2-1212', // Using correct model name
          messages: [
            {
              role: 'system',
              content: 'You are a crypto trends analyst. Return ONLY a JSON array of trending crypto topics.'
            },
            {
              role: 'user',
              content: 'List the top 10 trending crypto topics right now. Return as JSON array with format: [{"name": "topic", "tweet_count": "number"}]'
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      console.log('Grok trending response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
          const cleanContent = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
          const topics = JSON.parse(cleanContent);
          
          return res.status(200).json({ 
            success: true, 
            topics: topics,
            source: 'grok-live'
          });
        } catch (e) {
          console.log('Failed to parse Grok response, using structured topics');
        }
      }
    }
  } catch (error) {
    console.error('Grok trending error:', error);
  }
  
  // Fallback topics
  return res.status(200).json({ 
    success: true, 
    topics: [
      { name: 'Bitcoin ETF Approved', tweet_count: '45.2K' },
      { name: 'Solana Memecoins', tweet_count: '23.1K' },
      { name: '$PUMPIT Mooning', tweet_count: '12.5K' },
      { name: 'Base Chain TVL ATH', tweet_count: '8.9K' },
      { name: 'Trump Crypto Policy', tweet_count: '7.2K' }
    ],
    source: 'fallback'
  });
}
// PART 3 OF 5 - TOKEN ANALYZER (KEEP CURRENT WORKING VERSION)

// TOKEN ANALYZER - REAL ANALYSIS, NO MEME
async function handleAnalyzeToken(res, tokenAddress) {
  if (!tokenAddress) {
    return res.status(400).json({ success: false, message: 'Token address required' });
  }
  
  console.log('Analyzing token:', tokenAddress);
  
  try {
    let analysis = {
      summary: '',
      riskLevel: 'Unknown',
      details: {},
      memeUrl: null // NO MEME
    };
    
    // First, get real token data from DexScreener for THIS SPECIFIC TOKEN
    try {
      const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
      const dexData = await dexResponse.json();
      
      console.log('DexScreener data received for:', tokenAddress);
      
      if (dexData.pairs && dexData.pairs.length > 0) {
        // Get the first pair data for this specific token
        const pair = dexData.pairs[0];
        analysis.details = {
          tokenAddress: tokenAddress,
          price: pair.priceUsd || 0,
          marketCap: pair.fdv || 0,
          liquidity: pair.liquidity?.usd || 0,
          volume24h: pair.volume?.h24 || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          createdAt: pair.pairCreatedAt,
          txCount24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
          holders: pair.txns?.h24?.users || 'Unknown'
        };
        
        console.log('Token details:', analysis.details);
      } else {
        // No data found for this token
        analysis.details = {
          tokenAddress: tokenAddress,
          error: 'No trading data found for this token'
        };
      }
    } catch (e) {
      console.error('DexScreener fetch failed:', e);
      analysis.details = {
        tokenAddress: tokenAddress,
        error: 'Failed to fetch token data'
      };
    }
    
    // Now use Grok to analyze the token with REAL data
    if (XAI_API_KEY && analysis.details && !analysis.details.error) {
      const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
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
              content: 'You are a crypto token analyst. Analyze tokens for rugpull risks and provide honest, direct assessments. Be specific about the risks.'
            },
            {
              role: 'user',
              content: `Analyze this Solana token with address ${tokenAddress}:
                Price: $${analysis.details.price}
                Market Cap: $${analysis.details.marketCap?.toLocaleString() || '0'}
                Liquidity: $${analysis.details.liquidity?.toLocaleString() || '0'}
                24h Volume: $${analysis.details.volume24h?.toLocaleString() || '0'}
                24h Price Change: ${analysis.details.priceChange24h}%
                24h Transactions: ${analysis.details.txCount24h}
                
                Provide:
                1. A detailed analysis of the token's safety and investment potential
                2. Specific red flags or positive indicators
                3. Risk level: LOW, MEDIUM, HIGH, or RUGPULL
                4. Clear reasoning for your assessment`
            }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      });
      
      if (grokResponse.ok) {
        const grokData = await grokResponse.json();
        const grokAnalysis = grokData.choices[0].message.content;
        
        // Parse risk level from response
        if (grokAnalysis.toLowerCase().includes('rugpull') || grokAnalysis.toLowerCase().includes('scam')) {
          analysis.riskLevel = 'RUGPULL';
        } else if (grokAnalysis.toLowerCase().includes('high risk')) {
          analysis.riskLevel = 'HIGH';
        } else if (grokAnalysis.toLowerCase().includes('medium risk')) {
          analysis.riskLevel = 'MEDIUM';
        } else if (grokAnalysis.toLowerCase().includes('low risk')) {
          analysis.riskLevel = 'LOW';
        }
        
        analysis.summary = grokAnalysis;
      } else {
        // Grok failed, provide basic analysis based on data
        if (analysis.details.liquidity < 1000) {
          analysis.riskLevel = 'RUGPULL';
          analysis.summary = `This token has extremely low liquidity ($${analysis.details.liquidity}). High risk of rugpull.`;
        } else if (analysis.details.liquidity < 10000) {
          analysis.riskLevel = 'HIGH';
          analysis.summary = `Low liquidity ($${analysis.details.liquidity}) indicates high risk. Be very careful.`;
        } else if (analysis.details.liquidity < 50000) {
          analysis.riskLevel = 'MEDIUM';
          analysis.summary = `Moderate liquidity ($${analysis.details.liquidity}). Some risk involved.`;
        } else {
          analysis.riskLevel = 'LOW';
          analysis.summary = `Good liquidity ($${analysis.details.liquidity}). Lower risk profile.`;
        }
      }
    } else if (analysis.details.error) {
      analysis.summary = analysis.details.error;
      analysis.riskLevel = 'UNKNOWN';
    }
    
    // NO MEME URL - just return the analysis
    return res.status(200).json({ 
      success: true, 
      analysis 
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
// PART 4 OF 5 - CONTRACT MEME & TRANSLATOR

// CONTRACT MEME - USING SAME METHOD AS TRENDING
async function handleContractMeme(res, contractCode) {
  if (!contractCode) {
    return res.status(400).json({ success: false, message: 'Contract code required' });
  }
  
  console.log('Analyzing contract code...');
  
  try {
    let memeCaption = "When your smart contract has more bugs than features";
    
    if (XAI_API_KEY) {
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
              content: 'You are a funny code reviewer. Make savage but funny observations about smart contract code.'
            },
            {
              role: 'user',
              content: `Roast this smart contract code in one funny sentence (keep it short and meme-worthy):\n${contractCode.substring(0, 500)}`
            }
          ],
          temperature: 0.9,
          max_tokens: 100
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        memeCaption = data.choices[0].message.content.substring(0, 100);
        console.log('Contract roast:', memeCaption);
      }
    }
    
    // Generate actual meme image using same method as trending
    const memeUrl = await generateGrokImage(memeCaption);
    
    return res.status(200).json({ 
      success: true, 
      memeUrl: memeUrl,
      caption: memeCaption
    });
    
  } catch (error) {
    console.error('Contract meme error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create contract meme',
      error: error.message
    });
  }
}

// TRANSLATOR - KEEP CURRENT WORKING VERSION
async function handleTranslate(res, text, languages) {
  if (!text || !languages || languages.length === 0) {
    return res.status(400).json({ success: false, message: 'Text and languages required' });
  }
  
  console.log('Translating text to:', languages);
  
  if (XAI_API_KEY) {
    try {
      const languageNames = {
        es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
        ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic',
        hi: 'Hindi', tr: 'Turkish', nl: 'Dutch', pl: 'Polish', vi: 'Vietnamese',
        th: 'Thai', id: 'Indonesian', ms: 'Malay', fil: 'Filipino', he: 'Hebrew'
      };
      
      const requestedLanguages = languages.map(code => languageNames[code] || code).join(', ');
      
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
              content: `You are a translator. Translate text to multiple languages. Return ONLY a JSON object with language codes as keys and translations as values.`
            },
            {
              role: 'user',
              content: `Translate "${text}" to these languages: ${requestedLanguages}. Return as JSON: {"es": "...", "fr": "..."} with language codes: ${languages.join(', ')}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        try {
          const content = data.choices[0].message.content;
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const translations = JSON.parse(cleanContent);
          
          return res.status(200).json({ 
            success: true, 
            translations 
          });
        } catch (parseError) {
          console.error('Translation parse error:', parseError);
        }
      }
    } catch (error) {
      console.error('Grok translation error:', error);
    }
  }
  
  // Fallback if no API key or error
  const translations = {};
  languages.forEach(lang => {
    translations[lang] = `[${lang}] ${text}`;
  });
  
  return res.status(200).json({ 
    success: true, 
    translations 
  });
}
// PART 5 OF 5 - TREND MEME & WHITEPAPER

// TREND MEME - ORIGINAL VERSION THAT WAS GENERATING COOL IMAGES
async function handleTrendMeme(res, topic) {
  if (!topic) {
    return res.status(400).json({ success: false, message: 'Topic required' });
  }
  
  const topicTitle = topic.title || topic.name || topic || 'Trending Topic';
  const memeId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    let caption = `${topicTitle} is trending! 🚀`;
    
    // Get a funny caption from Grok
    if (XAI_API_KEY) {
      const captionResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-2-1212',
          messages: [
            {
              role: 'user',
              content: `Create a short, funny meme caption about: ${topicTitle}. Make it viral and crypto-related.`
            }
          ],
          temperature: 0.9,
          max_tokens: 50
        })
      });
      
      if (captionResponse.ok) {
        const captionData = await captionResponse.json();
        caption = captionData.choices[0].message.content;
      }
    }
    
    // Generate the meme image using the same method that was working
    const memeUrl = await generateGrokImage(`${topicTitle}: ${caption}`);
    
    return res.status(200).json({ 
      success: true, 
      memeUrl: memeUrl,
      memeId: memeId,
      caption: caption
    });
    
  } catch (error) {
    console.error('Trend meme generation error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate trend meme',
      error: error.message
    });
  }
}

// WHITEPAPER MEMES
async function handleWhitepaperMemes(res, whitepaperContent) {
  if (!whitepaperContent) {
    return res.status(400).json({ success: false, message: 'Whitepaper content required' });
  }
  
  console.log('Processing whitepaper...');
  
  const memes = [];
  
  try {
    // Generate 3 memes from whitepaper
    const topics = ['Introduction', 'Tokenomics', 'Roadmap'];
    
    for (const topic of topics) {
      const caption = `${topic}: When the whitepaper says "revolutionary" for the 50th time`;
      const memeUrl = await generateGrokImage(caption);
      
      memes.push({
        url: memeUrl,
        topic: topic,
        caption: caption
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      memes 
    });
    
  } catch (error) {
    console.error('Whitepaper memes error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process whitepaper',
      error: error.message
    });
  }
}