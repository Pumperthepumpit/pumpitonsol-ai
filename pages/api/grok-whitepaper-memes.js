// pages/api/grok-whitepaper-memes.js
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Parse the uploaded file
    const form = new formidable.IncomingForm();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    const username = Array.isArray(fields.username) ? fields.username[0] : fields.username;
    const file = Array.isArray(files.whitepaper) ? files.whitepaper[0] : files.whitepaper;
    
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

    // Read the whitepaper content
    let content = '';
    try {
      // For now, just read as text (you'd need pdf-parse for PDFs)
      content = fs.readFileSync(file.filepath, 'utf8').substring(0, 10000); // Limit to 10k chars
    } catch (e) {
      content = 'Unable to read file content';
    }

    let summaryPoints = [];
    
    if (process.env.XAI_API_KEY) {
      // Use Grok to summarize
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
              content: 'Summarize this whitepaper in exactly 5 key points. Each point should be one sentence that would make a good meme caption. Return as JSON array.'
            },
            {
              role: 'user',
              content: `Summarize this whitepaper in 5 meme-worthy points: ${content}`
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      try {
        summaryPoints = JSON.parse(data.choices[0].message.content);
      } catch (e) {
        summaryPoints = getMockSummaryPoints();
      }
    } else {
      summaryPoints = getMockSummaryPoints();
    }

    // Generate 5 memes (placeholders for now)
    const memes = [];
    for (let i = 0; i < 5; i++) {
      const memeUrl = `https://via.placeholder.com/1024x1024/FFD700/000000?text=${encodeURIComponent(`Part ${i+1}`)}`;
      
      memes.push({
        url: memeUrl,
        caption: summaryPoints[i] || `Key Point ${i+1}`
      });

      // Save each meme to database
      await supabase
        .from('memes')
        .insert({
          image_url: memeUrl,
          creator_x_handle: username,
          topic: `Whitepaper Part ${i+1}/5`,
          description: summaryPoints[i] || `Key Point ${i+1}`,
          source: 'grok-whitepaper',
          from_telegram_bot: false,
          is_premium: true,
          likes_count: 0,
          shares_count: 0,
          views_count: 0
        });
    }

    return res.status(200).json({ 
      success: true, 
      memes: memes
    });

  } catch (error) {
    console.error('Whitepaper meme error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process whitepaper' });
  }
}

function getMockSummaryPoints() {
  return [
    'Revolutionary blockchain technology that will change everything',
    'Tokenomics designed to go to the moon',
    'Community-driven governance for maximum decentralization',
    'Partnerships with major players coming soon',
    'Roadmap includes world domination by Q4'
  ];
}