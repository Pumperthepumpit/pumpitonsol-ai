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
    
    // Clean the username - ensure it has @ at the beginning
    let cleanUsername = username.trim();
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    
    console.log('Checking premium for username:', cleanUsername);
    
    // Check if user has active premium subscription
    const { data: premiumUser, error } = await supabase
      .from('premium_users')
      .select('*')
      .eq('telegram_username', cleanUsername)  // Now checking WITH @ symbol
      .gte('expires_at', new Date().toISOString())
      .single();
    
    console.log('Database query result:', { premiumUser, error });
    
    if (error) {
      console.log('Database error:', error);
      
      // Check if it's a "no rows" error vs actual error
      if (error.code === 'PGRST116') {
        return res.status(200).json({ 
          success: true, 
          isPremium: false,
          message: 'No active premium subscription found'
        });
      }
      
      // For other errors
      return res.status(200).json({ 
        success: true, 
        isPremium: false,
        message: 'No active premium subscription'
      });
    }
    
    if (!premiumUser) {
      return res.status(200).json({ 
        success: true, 
        isPremium: false,
        message: 'No active premium subscription'
      });
    }
    
    // Check if subscription is actually active (not expired)
    const expiryDate = new Date(premiumUser.expires_at);
    const now = new Date();
    
    if (expiryDate < now) {
      return res.status(200).json({ 
        success: true, 
        isPremium: false,
        message: 'Premium subscription has expired'
      });
    }
    
    // User has active premium
    return res.status(200).json({ 
      success: true, 
      isPremium: true,
      expiresAt: premiumUser.expires_at,
      message: 'Premium subscription active',
      username: cleanUsername
    });
    
  } catch (error) {
    console.error('Premium verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to verify premium status',
      error: error.message 
    });
  }
}