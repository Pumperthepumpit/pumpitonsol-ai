// pages/api/grok-translate.js
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
    const { text, languages, username } = req.body;
    
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

    const translations = {};
    
    // Language mappings
    const langNames = {
      es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
      pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean',
      zh: 'Chinese', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
      nl: 'Dutch', pl: 'Polish', vi: 'Vietnamese', th: 'Thai',
      id: 'Indonesian', ms: 'Malay', tl: 'Filipino', he: 'Hebrew'
    };

    // Translate to each selected language
    for (const lang of languages) {
      const langName = langNames[lang];
      
      if (process.env.XAI_API_KEY) {
        // Use Grok for translation
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
                content: `You are a meme translator. Translate meme text while keeping the humor and cultural relevance. Adapt jokes to work in the target language.`
              },
              {
                role: 'user',
                content: `Translate this meme text to ${langName}, keep it funny and culturally relevant: "${text}"`
              }
            ],
            temperature: 0.7
          })
        });

        const data = await response.json();
        translations[lang] = data.choices[0].message.content;
      } else {
        // Mock translations
        translations[lang] = getMockTranslation(text, lang, langName);
      }
    }

    return res.status(200).json({ 
      success: true, 
      translations: translations
    });

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to translate' });
  }
}

function getMockTranslation(text, langCode, langName) {
  // Simple mock translations - in production, you'd use a real translation API
  const mockPrefixes = {
    es: '¡',
    fr: 'Le ',
    de: 'Der ',
    it: 'Il ',
    pt: 'O ',
    ru: 'Это ',
    ja: 'これは',
    ko: '이것은',
    zh: '这是',
    ar: 'هذا',
    hi: 'यह',
    tr: 'Bu',
    nl: 'Dit is',
    pl: 'To jest',
    vi: 'Đây là',
    th: 'นี่คือ',
    id: 'Ini',
    ms: 'Ini',
    tl: 'Ito ay',
    he: 'זה'
  };
  
  const mockSuffixes = {
    es: '! 🚀',
    fr: ' 🎨',
    de: ' 💪',
    it: ' 🍕',
    pt: ' 🎉',
    ru: ' 🐻',
    ja: ' です 🎌',
    ko: ' 입니다 🇰🇷',
    zh: ' 🐉',
    ar: ' 🌙',
    hi: ' है 🇮🇳',
    tr: ' 🇹🇷',
    nl: ' 🌷',
    pl: ' 🇵🇱',
    vi: ' 🇻🇳',
    th: ' 🇹🇭',
    id: ' 🇮🇩',
    ms: ' 🇲🇾',
    tl: ' 🇵🇭',
    he: ' 🇮🇱'
  };
  
  return `${mockPrefixes[langCode] || ''}${text}${mockSuffixes[langCode] || ''}`;
}