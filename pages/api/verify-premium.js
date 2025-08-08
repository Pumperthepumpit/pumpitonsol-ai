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
    
    // Check if user has active premium subscription
    const { data: premiumUser, error } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_username', username.replace('@', ''))
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error || !premiumUser) {
      return res.status(200).json({ 
        success: true, 
        isPremium: false,
        message: 'No active premium subscription'
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      isPremium: true,
      expiresAt: premiumUser.expires_at,
      message: 'Premium subscription active'
    });
    
  } catch (error) {
    console.error('Premium verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to verify premium status' 
    });
  }
}