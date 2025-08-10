// pages/api/verify-premium.js
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
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }
    
    // Clean the username - ensure it has @ at the beginning (SAME AS premium-tools.js)
    let cleanUsername = username?.trim();
    if (!cleanUsername?.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    
    console.log('Verifying premium for cleaned username:', cleanUsername);
    
    // Check if user has active premium
    const { data: premiumUser, error } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_username', cleanUsername)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return res.status(200).json({ 
        success: false, 
        isPremium: false,
        message: 'No active premium subscription found'
      });
    }
    
    if (premiumUser) {
      return res.status(200).json({ 
        success: true, 
        isPremium: true,
        expiresAt: premiumUser.expires_at,
        tier: premiumUser.tier || 'premium'
      });
    }
    
    return res.status(200).json({ 
      success: false, 
      isPremium: false,
      message: 'No active premium subscription found'
    });
    
  } catch (error) {
    console.error('Verify premium error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to verify premium status',
      error: error.message 
    });
  }
}