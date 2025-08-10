// pages/api/premium-tools.js
// COMPLETE VERSION WITH CACHING, RATE LIMITING, AND FIXED IMAGE GENERATION

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const XAI_API_KEY = process.env.XAI_API_KEY;
console.log('API Key exists:', !!XAI_API_KEY);

// ============= CACHE SYSTEM =============
class GrokCache {
  constructor() {
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
  }

  getCacheKey(tool, params) {
    const paramString = JSON.stringify(params || {});
    return `${tool}:${paramString}`;
  }

  getCacheDuration(tool, isPremium = false, isEnterprise = false) {
    const durations = {
      free: {
        trending: 6 * 60 * 60 * 1000,      // 6 hours
        'analyze-token': 24 * 60 * 60 * 1000, // 24 hours
        'contract-meme': 12 * 60 * 60 * 1000, // 12 hours
        translate: 24 * 60 * 60 * 1000,    // 24 hours
        'trend-meme': 3 * 60 * 60 * 1000,  // 3 hours
        default: 6 * 60 * 60 * 1000        // 6 hours
      },
      premium: {
        trending: 1 * 60 * 60 * 1000,      // 1 hour
        'analyze-token': 6 * 60 * 60 * 1000,  // 6 hours
        'contract-meme': 3 * 60 * 60 * 1000,  // 3 hours
        translate: 12 * 60 * 60 * 1000,    // 12 hours
        'trend-meme': 30 * 60 * 1000,      // 30 minutes
        default: 1 * 60 * 60 * 1000        // 1 hour
      },
      enterprise: {
        trending: 5 * 60 * 1000,           // 5 minutes
        'analyze-token': 15 * 60 * 1000,   // 15 minutes
        'contract-meme': 10 * 60 * 1000,   // 10 minutes
        translate: 1 * 60 * 60 * 1000,     // 1 hour
        'trend-meme': 5 * 60 * 1000,       // 5 minutes
        default: 5 * 60 * 1000             // 5 minutes
      }
    };

    const tier = isEnterprise ? 'enterprise' : (isPremium ? 'premium' : 'free');
    return durations[tier][tool] || durations[tier].default;
  }

  async getFromMemory(key) {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Cache] Memory hit for ${key}`);
      return cached.data;
    }
    return null;
  }

  async getFromDatabase(key) {
    try {
      const { data, error } = await supabase
        .from('api_cache')
        .select('*')
        .eq('cache_key', key)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (data && !error) {
        console.log(`[Cache] Database hit for ${key}`);
        this.memoryCache.set(key, {
          data: data.response_data,
          expiresAt: new Date(data.expires_at).getTime()
        });
        return data.response_data;
      }
    } catch (error) {
      console.error('[Cache] Database read error:', error);
    }
    return null;
  }

  async get(tool, params, userTier = 'free') {
    const key = this.getCacheKey(tool, params);
    
    let cached = await this.getFromMemory(key);
    if (cached) return cached;

    cached = await this.getFromDatabase(key);
    if (cached) return cached;

    console.log(`[Cache] Miss for ${key}`);
    return null;
  }

  async set(tool, params, data, userTier = 'free') {
    const key = this.getCacheKey(tool, params);
    const isPremium = userTier === 'premium' || userTier === 'enterprise';
    const isEnterprise = userTier === 'enterprise';
    const duration = this.getCacheDuration(tool, isPremium, isEnterprise);
    const expiresAt = Date.now() + duration;

    this.memoryCache.set(key, {
      data: data,
      expiresAt: expiresAt
    });

    if (this.cacheTimers.has(key)) {
      clearTimeout(this.cacheTimers.get(key));
    }

    const timer = setTimeout(() => {
      this.memoryCache.delete(key);
      this.cacheTimers.delete(key);
    }, duration);
    this.cacheTimers.set(key, timer);

    try {
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: key,
          tool: tool,
          request_params: params,
          response_data: data,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'cache_key'
        });
      
      console.log(`[Cache] Stored ${key} for ${duration/1000/60} minutes`);
    } catch (error) {
      console.error('[Cache] Database write error:', error);
    }

    return data;
  }
}

const cache = new GrokCache();

// ============= RATE LIMITER =============
const rateLimiter = new Map();

function checkRateLimit(userId, tier = 'free') {
  const limits = {
    free: { requests: 1, window: 24 * 60 * 60 * 1000 },
    premium: { requests: 20, window: 24 * 60 * 60 * 1000 },
    enterprise: { requests: 1000, window: 24 * 60 * 60 * 1000 }
  };

  const limit = limits[tier];
  const now = Date.now();
  const userLimits = rateLimiter.get(userId) || { count: 0, resetAt: now + limit.window };

  if (now > userLimits.resetAt) {
    userLimits.count = 0;
    userLimits.resetAt = now + limit.window;
  }

  if (userLimits.count >= limit.requests) {
    return { allowed: false, remaining: 0, resetAt: userLimits.resetAt };
  }

  userLimits.count++;
  rateLimiter.set(userId, userLimits);

  return { 
    allowed: true, 
    remaining: limit.requests - userLimits.count,
    resetAt: userLimits.resetAt 
  };
}

// ============= MAIN HANDLER =============
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { tool, username, ...params } = req.body;
    
    if (!tool) {
      return res.status(400).json({ success: false, message: 'Tool parameter required' });
    }
    
    let cleanUsername = username?.trim();
    let userTier = 'free';
    let userId = cleanUsername || 'anonymous';
    
    // Check if user is premium
    if (cleanUsername) {
      const { data: premiumUser } = await supabase
        .from('premium_users')
        .select('*')
        .eq('telegram_username', cleanUsername)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (premiumUser) {
        userTier = premiumUser.tier || 'premium';
        userId = premiumUser.id || cleanUsername;
      }
    }
    
    // Check rate limits
    const rateLimit = checkRateLimit(userId, userTier);
    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000 / 60);
      return res.status(429).json({ 
        success: false, 
        message: `Rate limit exceeded. Try again in ${resetIn} minutes.`,
        resetAt: rateLimit.resetAt
      });
    }

    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetAt).toISOString());

    // Try cache first
    const cacheParams = { ...params, tool };
    const cachedResponse = await cache.get(tool, cacheParams, userTier);
    
    if (cachedResponse) {
      console.log(`[API] Serving cached response for ${tool}`);
      return res.status(200).json({
        ...cachedResponse,
        cached: true,
        tier: userTier
      });
    }

    // Free users get limited features
    if (userTier === 'free' && !cachedResponse) {
      if (tool === 'trending') {
        const staticTrending = {
          success: true,
          topics: [
            { name: 'Bitcoin Halving', tweet_count: '10K+' },
            { name: 'Solana Season', tweet_count: '5K+' },
            { name: '$PUMPIT Rising', tweet_count: '2K+' }
          ],
          source: 'static',
          message: 'Upgrade to Premium for real-time trends'
        };
        
        await cache.set(tool, cacheParams, staticTrending, userTier);
        return res.status(200).json(staticTrending);
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Premium required for this feature',
        upgrade_url: '/premium'
      });
    }

    // Premium/Enterprise get fresh data
    let response;
    
    switch(tool) {
      case 'trending':
        response = await handleTrending();
        break;
      case 'analyze-token':
        response = await handleAnalyzeToken(params.tokenAddress);
        break;
      case 'contract-meme':
        response = await handleContractMeme(params.contractCode);
        break;
      case 'translate':
        response = await handleTranslate(params.text, params.languages);
        break;
      case 'trend-meme':
        response = await handleTrendMeme(params.topic);
        break;
      case 'whitepaper-memes':
        response = await handleWhitepaperMemes(params.whitepaperContent);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid tool' });
    }
    
    if (response && response.success) {
      await cache.set(tool, cacheParams, response, userTier);
    }
    
    response.cached = false;
    response.tier = userTier;
    response.remaining = rateLimit.remaining;
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Premium tools error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process request',
      error: error.message 
    });
  }
}

// ============= IMAGE GENERATION HELPER =============
async function generateGrokImage(prompt) {
  console.log('Generating image with prompt:', prompt);
  
  // Try Grok's image generation if API key exists
  if (XAI_API_KEY) {
    try {
      const response = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          prompt: prompt,
          model: "grok-2-image", // Correct model name
          n: 1,
          response_format: "url"
        })
      });
      
      console.log('Grok image response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].url) {
          console.log('Successfully generated Grok image');
          return data.data[0].url;
        }
      } else {
        const errorText = await response.text();
        console.error('Grok image generation failed:', errorText);
      }
    } catch (error) {
      console.error('Grok image generation error:', error);
    }
  }
  
  // Fallback to memegen.link
  console.log('Using memegen.link fallback');
  const templates = ['drake', 'buzz', 'doge', 'success', 'disaster', 'fry', 'aliens', 'batman', 'oprah'];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  const topText = prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const bottomText = 'PUMPIT_TO_THE_MOON';
  
  return `https://api.memegen.link/images/${randomTemplate}/${topText}/${bottomText}.png`;
}

// ============= HANDLER FUNCTIONS =============
async function handleTrending() {
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
          model: 'grok-2-1212',
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
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
          const cleanContent = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
          const topics = JSON.parse(cleanContent);
          
          return { 
            success: true, 
            topics: topics,
            source: 'grok-live',
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          console.log('Failed to parse Grok response');
        }
      }
    }
  } catch (error) {
    console.error('Grok trending error:', error);
  }
  
  // Fallback topics
  return { 
    success: true, 
    topics: [
      { name: 'Bitcoin ETF Approved', tweet_count: '45.2K' },
      { name: 'Solana Memecoins', tweet_count: '23.1K' },
      { name: '$PUMPIT Mooning', tweet_count: '12.5K' },
      { name: 'Base Chain TVL ATH', tweet_count: '8.9K' },
      { name: 'Trump Crypto Policy', tweet_count: '7.2K' }
    ],
    source: 'fallback',
    timestamp: new Date().toISOString()
  };
}

async function handleAnalyzeToken(tokenAddress) {
  if (!tokenAddress) {
    throw new Error('Token address required');
  }
  
  console.log('Analyzing token:', tokenAddress);
  
  let analysis = {
    summary: '',
    riskLevel: 'Unknown',
    details: {},
    memeUrl: null,
    timestamp: new Date().toISOString()
  };
  
  // Get real token data from DexScreener
  try {
    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
    const dexData = await dexResponse.json();
    
    if (dexData.pairs && dexData.pairs.length > 0) {
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
      
      // Use Grok for analysis
      if (XAI_API_KEY) {
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
                content: 'You are a crypto token analyst. Analyze tokens for rugpull risks and provide honest assessments.'
              },
              {
                role: 'user',
                content: `Analyze this Solana token:
                  Address: ${tokenAddress}
                  Price: $${analysis.details.price}
                  Market Cap: $${analysis.details.marketCap?.toLocaleString() || '0'}
                  Liquidity: $${analysis.details.liquidity?.toLocaleString() || '0'}
                  24h Volume: $${analysis.details.volume24h?.toLocaleString() || '0'}
                  
                  Provide a brief risk assessment.`
              }
            ],
            temperature: 0.7,
            max_tokens: 400
          })
        });
        
        if (grokResponse.ok) {
          const grokData = await grokResponse.json();
          analysis.summary = grokData.choices[0].message.content;
          
          // Determine risk level
          const summary = analysis.summary.toLowerCase();
          if (summary.includes('rugpull') || summary.includes('scam')) {
            analysis.riskLevel = 'RUGPULL';
          } else if (summary.includes('high risk')) {
            analysis.riskLevel = 'HIGH';
          } else if (summary.includes('medium risk')) {
            analysis.riskLevel = 'MEDIUM';
          } else {
            analysis.riskLevel = 'LOW';
          }
        }
      } else {
        // Basic analysis without Grok
        if (analysis.details.liquidity < 1000) {
          analysis.riskLevel = 'RUGPULL';
          analysis.summary = `Extremely low liquidity ($${analysis.details.liquidity}). High rugpull risk.`;
        } else if (analysis.details.liquidity < 10000) {
          analysis.riskLevel = 'HIGH';
          analysis.summary = `Low liquidity ($${analysis.details.liquidity}). Be careful.`;
        } else if (analysis.details.liquidity < 50000) {
          analysis.riskLevel = 'MEDIUM';
          analysis.summary = `Moderate liquidity ($${analysis.details.liquidity}). Some risk.`;
        } else {
          analysis.riskLevel = 'LOW';
          analysis.summary = `Good liquidity ($${analysis.details.liquidity}). Lower risk.`;
        }
      }
    } else {
      analysis.details = { tokenAddress, error: 'No trading data found' };
      analysis.summary = 'Unable to find trading data for this token';
    }
  } catch (e) {
    console.error('Token analysis error:', e);
    analysis.summary = 'Unable to analyze token at this time';
  }
  
  return { success: true, analysis };
}

async function handleContractMeme(contractCode) {
  if (!contractCode) {
    throw new Error('Contract code required');
  }
  
  console.log('Analyzing contract code...');
  
  let memeCaption = "When your smart contract has more bugs than features";
  
  if (XAI_API_KEY) {
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
    } catch (error) {
      console.error('Grok caption error:', error);
    }
  }
  
  // Generate meme image
  const memeUrl = await generateGrokImage(memeCaption);
  
  return { 
    success: true, 
    memeUrl: memeUrl,
    caption: memeCaption,
    timestamp: new Date().toISOString()
  };
}

async function handleTranslate(text, languages) {
  if (!text || !languages || languages.length === 0) {
    throw new Error('Text and languages required');
  }
  
  console.log('Translating text to:', languages);
  
  const translations = {};
  
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
              content: 'You are a translator. Return ONLY a JSON object with language codes as keys and translations as values.'
            },
            {
              role: 'user',
              content: `Translate "${text}" to these languages: ${requestedLanguages}. Return as JSON with codes: ${languages.join(', ')}`
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
          const parsed = JSON.parse(cleanContent);
          Object.assign(translations, parsed);
        } catch (parseError) {
          console.error('Translation parse error:', parseError);
        }
      }
    } catch (error) {
      console.error('Grok translation error:', error);
    }
  }
  
  // Fallback if no translations
  if (Object.keys(translations).length === 0) {
    languages.forEach(lang => {
      translations[lang] = `[${lang}] ${text}`;
    });
  }
  
  return { 
    success: true, 
    translations,
    timestamp: new Date().toISOString()
  };
}

async function handleTrendMeme(topic) {
  if (!topic) {
    throw new Error('Topic required');
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
    
    // Generate the meme image
    const memeUrl = await generateGrokImage(`${topicTitle}: ${caption}`);
    
    return { 
      success: true, 
      memeUrl: memeUrl,
      memeId: memeId,
      caption: caption,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Trend meme generation error:', error);
    // Return fallback meme
    const fallbackUrl = await generateGrokImage(`${topicTitle} TO THE MOON`);
    return { 
      success: true, 
      memeUrl: fallbackUrl,
      memeId: memeId,
      caption: `${topicTitle} is pumping! 🚀`,
      timestamp: new Date().toISOString()
    };
  }
}

async function handleWhitepaperMemes(whitepaperContent) {
  if (!whitepaperContent) {
    throw new Error('Whitepaper content required');
  }
  
  console.log('Processing whitepaper...');
  
  const memes = [];
  const topics = ['Introduction', 'Tokenomics', 'Roadmap'];
  
  try {
    for (const topic of topics) {
      let caption = `${topic}: When the whitepaper says "revolutionary" for the 50th time`;
      
      if (XAI_API_KEY) {
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
                  role: 'user',
                  content: `Make a funny meme caption about the ${topic} section of a crypto whitepaper. Keep it short.`
                }
              ],
              temperature: 0.9,
              max_tokens: 50
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            caption = data.choices[0].message.content;
          }
        } catch (e) {
          console.error('Caption generation error:', e);
        }
      }
      
      const memeUrl = await generateGrokImage(caption);
      
      memes.push({
        url: memeUrl,
        topic: topic,
        caption: caption
      });
    }
    
    return { 
      success: true, 
      memes,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Whitepaper memes error:', error);
    return { 
      success: false, 
      message: 'Failed to process whitepaper',
      error: error.message
    };
  }
}