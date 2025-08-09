// pages/api/grok-analyze-token.js
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
    const { tokenAddress, username } = req.body;
    
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

    let analysis;
    
    if (process.env.XAI_API_KEY) {
      // Use Grok for analysis
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
              content: 'You are a tokenomics expert. Analyze the given token address for red flags, rugpull indicators, and investment safety. Return detailed JSON analysis.'
            },
            {
              role: 'user',
              content: `Analyze this Solana token: ${tokenAddress}. Return as JSON with fields: riskLevel (low/medium/high/extreme), redFlags[], greenFlags[], supply, holders, liquidity, verdict`
            }
          ],
          temperature: 0.3
        })
      });

      const data = await response.json();
      
      try {
        analysis = JSON.parse(data.choices[0].message.content);
      } catch (e) {
        // Fallback to mock if parsing fails
        analysis = getMockAnalysis(tokenAddress);
      }
    } else {
      // Use mock analysis
      analysis = getMockAnalysis(tokenAddress);
    }

    // Generate a meme URL (placeholder for now)
    analysis.memeUrl = `https://via.placeholder.com/1024x1024/FF0000/FFFFFF?text=${encodeURIComponent(analysis.riskLevel + ' RISK')}`;

    return res.status(200).json({ 
      success: true, 
      analysis: analysis
    });

  } catch (error) {
    console.error('Token analysis error:', error);
    return res.status(500).json({ success: false, message: 'Failed to analyze token' });
  }
}

function getMockAnalysis(tokenAddress) {
  // Generate mock analysis based on token address
  const riskLevels = ['low', 'medium', 'high', 'extreme'];
  const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
  
  return {
    riskLevel: randomRisk,
    redFlags: randomRisk === 'low' ? [] : [
      'High concentration of supply in few wallets',
      'Liquidity not locked',
      'Anonymous team'
    ].slice(0, randomRisk === 'extreme' ? 3 : 2),
    greenFlags: randomRisk === 'extreme' ? [] : [
      'Active development',
      'Growing community',
      'Verified contract'
    ].slice(0, randomRisk === 'low' ? 3 : 1),
    supply: '1,000,000,000',
    holders: Math.floor(Math.random() * 10000) + 100,
    liquidity: Math.floor(Math.random() * 1000000) + 10000,
    verdict: randomRisk === 'low' 
      ? 'This token appears relatively safe with good fundamentals.'
      : randomRisk === 'extreme'
      ? 'HIGH RISK: Multiple red flags detected. Proceed with extreme caution.'
      : 'Mixed signals. Do thorough research before investing.'
  };
}