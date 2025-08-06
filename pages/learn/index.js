import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '../../lib/supabase';

// PUMPIT Token Address
const PUMPIT_TOKEN_ADDRESS = 'B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk';

export default function LearnPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [pumpitBalance, setPumpitBalance] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if wallet already connected from main site
    checkExistingWallet();
  }, []);

  const checkExistingWallet = async () => {
    if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        setWalletAddress(response.publicKey.toString());
        await checkPumpitBalance(response.publicKey.toString());
      } catch (error) {
        console.log('No wallet connected yet');
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.solana) {
      try {
        setIsChecking(true);
        setError('');
        const response = await window.solana.connect();
        const address = response.publicKey.toString();
        setWalletAddress(address);
        await checkPumpitBalance(address);
      } catch (error) {
        console.error('Wallet connection failed:', error);
        setError('Failed to connect wallet. Please try again.');
      } finally {
        setIsChecking(false);
      }
    } else {
      setError('Please install a Solana wallet like Phantom or Solflare');
    }
  };

  const checkPumpitBalance = async (address) => {
    try {
      setIsChecking(true);
      
      // Call our API to check PUMPIT balance
      const response = await fetch('/api/check-pumpit-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      
      if (data.balance > 0) {
        setHasAccess(true);
        setPumpitBalance(data.balance);
        
        // Save user to database
        await saveUser(address, data.balance);
      } else {
        setHasAccess(false);
        setPumpitBalance(0);
      }
    } catch (error) {
      console.error('Balance check failed:', error);
      setError('Failed to check PUMPIT balance. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const saveUser = async (address, balance) => {
    try {
      const { data, error } = await supabase
        .from('language_users')
        .upsert({
          wallet_address: address,
          pumpit_balance: balance,
          last_verified: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });
        
      if (error) console.error('Error saving user:', error);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  return (
    <>
      <Head>
        <title>PUMPIT Language Learning - Learn & Earn</title>
        <meta name="description" content="Exclusive language learning for PUMPIT holders. Learn Spanish, French, German and more!" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="learn-container">
        <header className="learn-header">
          <Link href="/" className="back-home">
            ← Back to PUMPIT
          </Link>
          {walletAddress && (
            <div className="wallet-display">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </div>
          )}
        </header>

        <main className="learn-main">
          <div className="hero-section">
            <div className="pumper-learn">
              <img src="/pumper.png" alt="Pumper" className="pumper-mascot" />
              <div className="graduation-cap">🎓</div>
            </div>
            
            <h1>PUMPIT Language Learning</h1>
            <p className="tagline">Exclusive for $PUMPIT holders • Learn & Earn</p>
            
            {!walletAddress ? (
              <div className="access-card">
                <h2>🔐 Holder Access Required</h2>
                <p>Connect your wallet to verify PUMPIT holdings</p>
                <button 
                  onClick={connectWallet}
                  className="connect-btn"
                  disabled={isChecking}
                >
                  {isChecking ? 'Checking...' : 'Connect Wallet'}
                </button>
              </div>
            ) : isChecking ? (
              <div className="checking-status">
                <div className="spinner"></div>
                <p>Verifying PUMPIT holdings...</p>
              </div>
            ) : hasAccess ? (
              <div className="access-granted">
                <div className="success-message">
                  <h2>✅ Access Granted!</h2>
                  <p>You hold {pumpitBalance.toLocaleString()} PUMPIT</p>
                </div>
                
                <div className="language-grid">
                  <Link href="/learn/spanish" className="language-card">
                    <span className="flag">🇪🇸</span>
                    <h3>Spanish</h3>
                    <p>Start learning español</p>
                    <div className="difficulty">Beginner</div>
                  </Link>
                  
                  <Link href="/learn/french" className="language-card">
                    <span className="flag">🇫🇷</span>
                    <h3>French</h3>
                    <p>Apprendre le français</p>
                    <div className="difficulty">Beginner</div>
                  </Link>
                  
                  <Link href="/learn/german" className="language-card">
                    <span className="flag">🇩🇪</span>
                    <h3>German</h3>
                    <p>Deutsch lernen</p>
                    <div className="difficulty">Beginner</div>
                  </Link>
                  
                  <div className="language-card coming-soon">
                    <span className="flag">🇯🇵</span>
                    <h3>Japanese</h3>
                    <p>Coming soon</p>
                    <div className="difficulty">Advanced</div>
                  </div>
                  
                  <div className="language-card coming-soon">
                    <span className="flag">🇰🇷</span>
                    <h3>Korean</h3>
                    <p>Coming soon</p>
                    <div className="difficulty">Advanced</div>
                  </div>
                  
                  <div className="language-card coming-soon">
                    <span className="flag">🇨🇳</span>
                    <h3>Chinese</h3>
                    <p>Coming soon</p>
                    <div className="difficulty">Advanced</div>
                  </div>
                </div>
                
                <div className="features-section">
                  <h2>📚 How It Works</h2>
                  <div className="features-grid">
                    <div className="feature">
                      <span className="icon">❤️</span>
                      <h3>Heart System</h3>
                      <p>5 hearts daily. Make mistakes? Buy more with SOL</p>
                    </div>
                    <div className="feature">
                      <span className="icon">🔥</span>
                      <h3>Daily Streaks</h3>
                      <p>Build streaks, earn rewards, compete globally</p>
                    </div>
                    <div className="feature">
                      <span className="icon">🏆</span>
                      <h3>Leaderboards</h3>
                      <p>Top learners win SOL from reward pool</p>
                    </div>
                    <div className="feature">
                      <span className="icon">🎖️</span>
                      <h3>NFT Certificates</h3>
                      <p>Mint achievement NFTs as you progress</p>
                    </div>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <Link href="/learn/dashboard" className="dashboard-btn">
                    📊 My Dashboard
                  </Link>
                  <Link href="/learn/leaderboard" className="leaderboard-btn">
                    🏆 Leaderboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="no-access">
                <h2>❌ No PUMPIT Tokens Found</h2>
                <p>You need to hold PUMPIT tokens to access language learning</p>
                
                <div className="buy-instructions">
                  <h3>How to get access:</h3>
                  <ol>
                    <li>Buy any amount of $PUMPIT tokens</li>
                    <li>Keep them in your connected wallet</li>
                    <li>Refresh this page to verify</li>
                  </ol>
                  
                  <a 
                    href="https://jup.ag/swap/SOL-PUMPIT" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="buy-pumpit-btn"
                  >
                    🚀 Buy PUMPIT on Jupiter
                  </a>
                  
                  <button 
                    onClick={() => checkPumpitBalance(walletAddress)}
                    className="recheck-btn"
                    disabled={isChecking}
                  >
                    🔄 Check Again
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .learn-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
        }

        .learn-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 30% 50%, rgba(255, 255, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 20%, rgba(255, 255, 0, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }

        .learn-header {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .back-home {
          color: #FFFF00;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.3s;
        }

        .back-home:hover {
          opacity: 0.8;
        }

        .wallet-display {
          background: rgba(255, 255, 0, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 25px;
          border: 1px solid rgba(255, 255, 0, 0.3);
          font-family: monospace;
          font-size: 0.9rem;
        }

        .learn-main {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .hero-section {
          text-align: center;
        }

        .pumper-learn {
          position: relative;
          display: inline-block;
          margin-bottom: 2rem;
        }

        .pumper-mascot {
          width: 150px;
          height: 150px;
          filter: drop-shadow(0 0 30px rgba(255, 255, 0, 0.5));
        }

        .graduation-cap {
          position: absolute;
          top: -10px;
          right: -10px;
          font-size: 3rem;
          transform: rotate(-15deg);
        }

        h1 {
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }

        .tagline {
          font-size: 1.2rem;
          color: #ccc;
          margin-bottom: 3rem;
        }

        .access-card {
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 0, 0.2);
          border-radius: 20px;
          padding: 3rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .access-card h2 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .access-card p {
          color: #ccc;
          margin-bottom: 2rem;
        }

        .connect-btn {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 3rem;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .connect-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        .connect-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .checking-status {
          padding: 3rem;
          text-align: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #FFFF00;
          border-radius: 50%;
          margin: 0 auto 2rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .checking-status p {
          color: #FFFF00;
          font-size: 1.1rem;
        }

        .access-granted {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success-message {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 15px;
          padding: 2rem;
          margin-bottom: 3rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .success-message h2 {
          color: #00FF00;
          margin-bottom: 0.5rem;
        }

        .success-message p {
          color: #ccc;
        }

        .language-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 4rem;
        }

        .language-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .language-card:hover:not(.coming-soon) {
          transform: translateY(-5px);
          border-color: #FFFF00;
          box-shadow: 0 15px 40px rgba(255, 255, 0, 0.2);
        }

        .language-card.coming-soon {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .language-card .flag {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        .language-card h3 {
          font-size: 1.5rem;
          color: #FFFF00;
          margin-bottom: 0.5rem;
        }

        .language-card p {
          color: #ccc;
          margin-bottom: 1rem;
        }

        .difficulty {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 0, 0.1);
          padding: 0.3rem 0.8rem;
          border-radius: 15px;
          font-size: 0.8rem;
          color: #FFFF00;
        }

        .features-section {
          margin-bottom: 3rem;
        }

        .features-section h2 {
          color: #FFFF00;
          margin-bottom: 2rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .feature {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          padding: 1.5rem;
          text-align: center;
        }

        .feature .icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 1rem;
        }

        .feature h3 {
          color: #FFFF00;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .feature p {
          color: #ccc;
          font-size: 0.9rem;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .dashboard-btn, .leaderboard-btn {
          padding: 1rem 2rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .dashboard-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .dashboard-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .leaderboard-btn {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: black;
        }

        .leaderboard-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
        }

        .no-access {
          background: rgba(255, 0, 0, 0.05);
          border: 2px solid rgba(255, 0, 0, 0.2);
          border-radius: 20px;
          padding: 3rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .no-access h2 {
          color: #FF6666;
          margin-bottom: 1rem;
        }

        .no-access p {
          color: #ccc;
          margin-bottom: 2rem;
        }

        .buy-instructions {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          padding: 2rem;
        }

        .buy-instructions h3 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .buy-instructions ol {
          text-align: left;
          margin: 0 auto 2rem;
          max-width: 300px;
          color: #ccc;
        }

        .buy-instructions li {
          margin-bottom: 0.5rem;
        }

        .buy-pumpit-btn {
          display: inline-block;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          padding: 1rem 2rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: bold;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .buy-pumpit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        .recheck-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.8rem 2rem;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .recheck-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .recheck-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(255, 0, 0, 0.1);
          color: #ff6666;
          padding: 1rem;
          border-radius: 10px;
          margin-top: 2rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 2rem;
          }

          .tagline {
            font-size: 1rem;
          }

          .language-grid {
            grid-template-columns: 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
            align-items: center;
          }

          .dashboard-btn, .leaderboard-btn {
            width: 200px;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}