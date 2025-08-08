// pages/api/generate-blog-post.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug logging
  console.log('=== API ENDPOINT CALLED ===');
  console.log('API Provider:', process.env.AI_PROVIDER || 'not set');
  console.log('Has DeepSeek Key:', !!process.env.DEEPSEEK_API_KEY);
  console.log('Has OpenAI Key:', !!process.env.OPENAI_API_KEY);
  
  const { type, customTopic, featuredMemes, memeDetails } = req.body;
  console.log('Blog type requested:', type);
  console.log('Featured memes count:', featuredMemes?.length || 0);

  // Choose AI provider based on environment variable
  const aiProvider = process.env.AI_PROVIDER || 'deepseek';
  
  try {
    let generatedContent;
    
    if (aiProvider === 'deepseek') {
      console.log('Using DeepSeek API...');
      generatedContent = await generateWithDeepSeek(type, customTopic, memeDetails);
    } else if (aiProvider === 'openai') {
      console.log('Using OpenAI API...');
      generatedContent = await generateWithOpenAI(type, customTopic, memeDetails);
    } else {
      console.log('No AI provider configured, using fallback...');
      generatedContent = generateFallbackPost(type, customTopic, memeDetails);
    }

    console.log('Blog post generated successfully!');
    res.status(200).json(generatedContent);
  } catch (error) {
    console.error('=== MAIN ERROR ===');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Return fallback content instead of error
    const fallback = generateFallbackPost(type, customTopic, memeDetails);
    res.status(200).json(fallback);
  }
}

async function generateWithDeepSeek(type, customTopic, memeDetails) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  
  if (!DEEPSEEK_API_KEY) {
    console.error('DeepSeek API key is missing!');
    throw new Error('DeepSeek API key not configured');
  }
  
  console.log('DeepSeek key first 10 chars:', DEEPSEEK_API_KEY.substring(0, 10) + '...');
  
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  // Build context about featured memes
  let memeContext = '';
  if (memeDetails && memeDetails.length > 0) {
    memeContext = `\n\nFeatured memes to include:\n`;
    memeDetails.forEach((meme, index) => {
      memeContext += `${index + 1}. Topic: ${meme.topic || 'Untitled'}, Creator: ${meme.creator_x_handle || 'anonymous'}, Likes: ${meme.likes_count}, Shares: ${meme.shares_count}\n`;
    });
  }

  // Create prompts based on blog type
  const prompts = {
    'daily-roundup': `Write an engaging blog post for the PUMPIT memecoin community. This is a daily roundup of the best memes created today. 
    
    Include:
    - Catchy title with emojis
    - Brief intro about today's meme highlights
    - Showcase the featured memes with commentary
    - Community shoutouts to creators
    - Call-to-action to create more memes
    
    Tone: Fun, energetic, community-focused. Use meme language and crypto slang appropriately.
    ${memeContext}`,
    
    'creator-spotlight': `Write a creator spotlight blog post for the PUMPIT community featuring top meme creators.
    
    Include:
    - Engaging title highlighting the creator
    - Story about their best memes
    - Tips from the creator (make them up based on meme style)
    - Showcase their featured memes
    - Encourage others to follow them
    
    Tone: Celebratory, inspiring, personal
    ${memeContext}`,
    
    'tutorial': `Write a how-to guide for the PUMPIT meme generator.
    
    Include:
    - Clear, actionable title
    - Step-by-step instructions
    - Pro tips for viral memes
    - Examples from the community
    - Technical tips for using the AI generator
    
    Tone: Helpful, clear, encouraging
    ${memeContext}`,
    
    'market-update': `Write a market update blog post for PUMPIT token holders.
    
    Include:
    - Market-focused title
    - Current sentiment analysis
    - Meme trends affecting price
    - Community growth metrics
    - Bullish outlook and next steps
    
    Tone: Professional but optimistic, data-driven but accessible
    ${memeContext}`,
    
    'custom': `Write a blog post about: ${customTopic}
    
    This is for the PUMPIT memecoin community. Include relevant memes if provided.
    Make it engaging, SEO-friendly, and community-focused.
    ${memeContext}`
  };

  const systemPrompt = `You are a content writer for PUMPIT, a Solana memecoin project. 
  You write engaging, SEO-optimized blog posts that build community and drive engagement.
  Always include emojis, be positive, and encourage meme creation.
  Format your response as a JSON object with these fields:
  - title: The blog post title
  - content: The full HTML content (use <p>, <h2>, <h3>, <ul>, <strong> tags)
  - excerpt: A 1-2 sentence summary
  - metaDescription: SEO meta description (155 chars max)
  - keywords: Comma-separated keywords
  - featuredImage: null (we'll add this later)`;

  const userPrompt = prompts[type] || prompts['custom'];

  try {
    console.log('Calling DeepSeek API...');
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      })
    });

    console.log('DeepSeek response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error response:', errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('DeepSeek response received, parsing...');
    
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid DeepSeek response structure:', data);
      throw new Error('Invalid response from DeepSeek');
    }
    
    const content = JSON.parse(data.choices[0].message.content);
    console.log('Content parsed successfully');
    
    return content;
  } catch (error) {
    console.error('=== DEEPSEEK ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Return fallback instead of throwing
    return generateFallbackPost(type, customTopic, memeDetails);
  }
}

async function generateWithOpenAI(type, customTopic, memeDetails) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing!');
    throw new Error('OpenAI API key not configured');
  }
  
  console.log('OpenAI key first 10 chars:', OPENAI_API_KEY.substring(0, 10) + '...');
  
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  // Build context about featured memes
  let memeContext = '';
  if (memeDetails && memeDetails.length > 0) {
    memeContext = `\n\nFeatured memes to include:\n`;
    memeDetails.forEach((meme, index) => {
      memeContext += `${index + 1}. Topic: ${meme.topic || 'Untitled'}, Creator: ${meme.creator_x_handle || 'anonymous'}, Likes: ${meme.likes_count}, Shares: ${meme.shares_count}\n`;
    });
  }

  // Same prompts as DeepSeek
  const prompts = {
    'daily-roundup': `Write an engaging blog post for the PUMPIT memecoin community. This is a daily roundup of the best memes created today. Include: catchy title with emojis, brief intro, showcase featured memes, community shoutouts, call-to-action. Tone: Fun, energetic, community-focused.${memeContext}`,
    'creator-spotlight': `Write a creator spotlight for PUMPIT featuring top meme creators. Include: engaging title, creator story, tips, showcase memes, encourage follows. Tone: Celebratory, inspiring.${memeContext}`,
    'tutorial': `Write a how-to guide for the PUMPIT meme generator. Include: clear title, step-by-step instructions, pro tips, examples, technical tips. Tone: Helpful, clear.${memeContext}`,
    'market-update': `Write a market update for PUMPIT token holders. Include: market title, sentiment analysis, meme trends, growth metrics, outlook. Tone: Professional but optimistic.${memeContext}`,
    'custom': `Write a blog post about: ${customTopic}. For PUMPIT memecoin community. Make it engaging and SEO-friendly.${memeContext}`
  };

  const systemPrompt = `You are a content writer for PUMPIT, a Solana memecoin. Write engaging, SEO-optimized blog posts. Use emojis, be positive, encourage meme creation. Return JSON with: title, content (HTML), excerpt, metaDescription (155 chars), keywords, featuredImage (null).`;

  try {
    console.log('Calling OpenAI API...');
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompts[type] || prompts['custom'] }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      })
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received, parsing...');
    
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI');
    }
    
    const content = JSON.parse(data.choices[0].message.content);
    console.log('Content parsed successfully');
    
    return content;
  } catch (error) {
    console.error('=== OPENAI ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Return fallback instead of throwing
    return generateFallbackPost(type, customTopic, memeDetails);
  }
}

// Fallback function if AI APIs fail
function generateFallbackPost(type, customTopic, memeDetails) {
  console.log('=== USING FALLBACK POST GENERATOR ===');
  
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const titles = {
    'daily-roundup': `🔥 Daily PUMPIT Memes - ${date}`,
    'creator-spotlight': '🌟 Creator Spotlight: Amazing PUMPIT Memes',
    'tutorial': '📚 How to Create Viral PUMPIT Memes',
    'market-update': '📈 PUMPIT Market Update & Community Growth',
    'custom': customTopic || 'PUMPIT Community Update'
  };

  const title = titles[type];
  
  let content = `<p>Welcome to today's PUMPIT blog post! Our community continues to grow stronger every day with amazing memes and incredible creators.</p>`;
  
  if (memeDetails && memeDetails.length > 0) {
    content += `<h2>Featured Memes</h2>`;
    content += `<p>Check out these amazing memes from our community:</p>`;
    content += `<ul>`;
    memeDetails.forEach(meme => {
      content += `<li><strong>${meme.topic || 'Untitled Meme'}</strong> by ${meme.creator_x_handle || 'anonymous'} - ${meme.likes_count} likes, ${meme.shares_count} shares</li>`;
    });
    content += `</ul>`;
  }
  
  content += `<h2>Join the Movement</h2>`;
  content += `<p>Create your own PUMPIT memes using our AI-powered generator! Visit our website and start creating today.</p>`;
  content += `<p><strong>Remember:</strong> Every meme helps grow our community. The more we create and share, the stronger PUMPIT becomes!</p>`;
  content += `<h2>Get Started Now</h2>`;
  content += `<p>🎨 Use our <a href="/#generator">Web Generator</a> for advanced editing</p>`;
  content += `<p>🤖 Try our <a href="https://t.me/pumpermemebot">Telegram Bot</a> for instant memes</p>`;
  content += `<p>💎 Buy $PUMPIT on <a href="https://jup.ag/swap/SOL-PUMPIT">Jupiter</a></p>`;
  
  return {
    title,
    content,
    excerpt: 'Latest updates from the PUMPIT community, featuring the best memes and creator highlights.',
    metaDescription: 'Daily PUMPIT memes, creator spotlights, and community updates. Join Solana\'s fastest growing memecoin community!',
    keywords: 'PUMPIT, Solana, memes, crypto, memecoin, daily update, community',
    featuredImage: null
  };
}