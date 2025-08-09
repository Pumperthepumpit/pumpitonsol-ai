// pages/api/grok-contract-meme.js
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
    const { contractCode, username } = req.body;
    
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

    let explanation = 'This smart contract handles token transfers and liquidity pools';
    
    if (process.env.XAI_API_KEY) {
      // Use Grok to understand the contract
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
              content: 'You are a smart contract expert. Explain this contract in simple terms that a 5-year-old would understand.'
            },
            {
              role: 'user',
              content: `Explain this smart contract in one simple sentence: ${contractCode.substring(0, 2000)}`
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      explanation = data.choices[0].message.content;
    } else {
      // Mock explanation
      const mockExplanations = [
        'This contract is like a robot banker that helps people trade tokens safely',
        'This is a digital vending machine for cryptocurrency',
        'This contract automatically manages money for a group of people',
        'This is like a piggy bank that multiple people can use together',
        'This contract helps tokens move from one wallet to another automatically'
      ];
      explanation = mockExplanations[Math.floor(Math.random() * mockExplanations.length)];
    }

    // Generate meme URL (placeholder)
    const memeUrl = `https://via.placeholder.com/1024x1024/00FF00/000000?text=${encodeURIComponent('Smart Contract Explained')}`;

    // Save to database
    const { data: memeData, error: dbError } = await supabase
      .from('memes')
      .insert({
        image_url: memeUrl,
        creator_x_handle: username,
        topic: 'Smart Contract Explained',
        description: explanation,
        source: 'grok-contract',
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
      explanation: explanation,
      memeId: memeData?.id
    });

  } catch (error) {
    console.error('Contract meme error:', error);
    return res.status(500).json({ success: false, message: 'Failed to memeify contract' });
  }
}