import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  console.log('Link API called with method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, walletAddress } = req.body;
  console.log('Received code:', code, 'wallet:', walletAddress);

  if (!code || !walletAddress) {
    return res.status(400).json({ error: 'Missing code or wallet address' });
  }

  try {
    // Find the link code
    console.log('Searching for code in database...');
    const { data: linkData, error: linkError } = await supabase
      .from('account_links')
      .select('*')
      .eq('link_code', code)
      .eq('used', false)
      .single();

    console.log('Link data result:', linkData);
    console.log('Link error:', linkError);

    if (linkError) {
      console.error('Database error finding code:', linkError);
      return res.status(400).json({ 
        error: 'Invalid or expired code',
        details: linkError.message 
      });
    }

    if (!linkData) {
      return res.status(400).json({ error: 'Code not found' });
    }

    // Check if code is expired
    if (new Date(linkData.expires_at) < new Date()) {
      console.log('Code expired:', linkData.expires_at);
      return res.status(400).json({ error: 'Code has expired' });
    }

    console.log('Updating user with telegram_id:', linkData.telegram_id);

    // Update the user's wallet address
    const { data: updateData, error: updateError } = await supabase
      .from('language_users')
      .update({
        wallet_address: walletAddress,
        primary_wallet: walletAddress,
        linked_at: new Date().toISOString()
      })
      .eq('telegram_id', linkData.telegram_id)
      .select();

    console.log('Update result:', updateData);
    console.log('Update error:', updateError);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return res.status(500).json({ 
        error: 'Failed to link account',
        details: updateError.message 
      });
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

    console.log('Final user data:', userData);

    return res.status(200).json({ 
      success: true,
      message: 'Account linked successfully!',
      user: userData
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}