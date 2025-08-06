import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, walletAddress } = req.body;

  if (!code || !walletAddress) {
    return res.status(400).json({ error: 'Missing code or wallet address' });
  }

  try {
    // Find the link code
    const { data: linkData, error: linkError } = await supabase
      .from('account_links')
      .select('*')
      .eq('link_code', code)
      .eq('used', false)
      .single();

    if (linkError || !linkData) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Check if code is expired
    if (new Date(linkData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code has expired' });
    }

    // Update the user's wallet address
    const { error: updateError } = await supabase
      .from('language_users')
      .update({
        wallet_address: walletAddress,
        primary_wallet: walletAddress,
        linked_at: new Date().toISOString()
      })
      .eq('telegram_id', linkData.telegram_id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to link account' });
    }

    // Mark the code as used
    await supabase
      .from('account_links')
      .update({ 
        used: true,
        linked_wallet: walletAddress 
      })
      .eq('id', linkData.id);

    // Get the updated user data
    const { data: userData } = await supabase
      .from('language_users')
      .select('*')
      .eq('telegram_id', linkData.telegram_id)
      .single();

    return res.status(200).json({ 
      success: true,
      message: 'Account linked successfully!',
      user: userData
    });

  } catch (error) {
    console.error('Link account error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}