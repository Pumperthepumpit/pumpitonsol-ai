import { Connection, PublicKey } from '@solana/web3.js';

// PUMPIT Token Mint Address
const PUMPIT_MINT = 'B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    // Create connection to Solana mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Get wallet public key
    const walletPubkey = new PublicKey(walletAddress);
    
    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    // Find PUMPIT token account
    let pumpitBalance = 0;
    
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const mintAddress = parsedInfo.mint;
      
      if (mintAddress === PUMPIT_MINT) {
        pumpitBalance = parsedInfo.tokenAmount.uiAmount || 0;
        break;
      }
    }

    return res.status(200).json({ 
      balance: pumpitBalance,
      hasAccess: pumpitBalance > 0,
      walletAddress: walletAddress
    });

  } catch (error) {
    console.error('Error checking PUMPIT balance:', error);
    return res.status(500).json({ 
      error: 'Failed to check balance',
      details: error.message 
    });
  }
}