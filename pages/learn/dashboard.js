import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        const address = response.publicKey.toString();
        setWalletAddress(address);
        
        // Get user data from Supabase
        const { data: user, error } = await supabase
          .from('language_users')
          .select('*')
          .eq('wallet_address', address)
          .single();
          
        if (user) {
          setUserData(user);
        } else {
          router.push('/learn');
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        router.push('/learn');
      }
    } else {
      router.push('/learn');
    }
    setIsLoading(false);
  };

  const refillHearts = async () => {
    setShowPaymentModal(true);
  };

  const processHeartPurchase = async () => {
    setIsProcessingPayment(true);
    
    try {
      // This would integrate with Solana payment
      // For now, we'll simulate the payment
      alert('Payment processing would happen here - 0.01 SOL');
      
      // Update hearts in database
      const { data, error } = await supabase
        .from('language_users')
        .update({ hearts_remaining: 5 })
        .eq('wallet_address', walletAddress)
        .select()
        .single();
        
      if (data) {
        setUserData(data);
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const calculateLevel = (xp) => {
    return Math.floor(xp / 100) + 1;
  };

  const calculateProgress = (xp) => {
    return (xp % 100);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const level = calculateLevel(userData.total_xp);
  const progress = calculateProgress(userData.total_xp);

  return (
    <>
      <Head>
        <title>My Dashboard - PUMPIT Learn</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <Link href="/learn" className="back-btn">
            ← Back to Languages
          </Link>
          
          <h1>My Learning Dashboard</h1>
          
          <div className="wallet-display">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </div>
        </header>

        <main className="dashboard-main">
          {/* Stats Overview */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🏆</span>
              <h3>Level {level}</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p>{progress}/100 XP to next level</p>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">⭐</span>
              <h3>Total XP</h3>
              <p className="stat-value">{userData.total_xp}</p>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">🔥</span>
              <h3>Daily Streak</h3>
              <p className="stat-value">{userData.daily_streak} days</p>
            </div>
            
            <div className="stat-card hearts-card">
              <span className="stat-icon">❤️</span>
              <h3>Hearts</h3>
              <p className="stat-value">{userData.hearts_remaining}/5</p>
              {userData.hearts_remaining === 0 && (
                <button onClick={refillHearts} className="refill-btn">
                  Refill Hearts
                </button>
              )}
            </div>
          </div>

          {/* PUMPIT Balance */}
          <div className="balance-section">
            <h2>💎 PUMPIT Balance</h2>
            <p className="balance-value">{userData.pumpit_balance.toLocaleString()} PUMPIT</p>
            <p className="balance-info">Keep holding to maintain access!</p>
          </div>

          {/* Quick Actions */}
          <div className="actions-section">
            <h2>📚 Continue Learning</h2>
            <div className="language-buttons">
              <Link href="/learn/spanish" className="lang-btn">
                <span className="flag">🇪🇸</span>
                <span>Spanish</span>
              </Link>
              <Link href="/learn/french" className="lang-btn">
                <span className="flag">🇫🇷</span>
                <span>French</span>
              </Link>
              <Link href="/learn/german" className="lang-btn">
                <span className="flag">🇩🇪</span>
                <span>German</span>
              </Link>
            </div>
          </div>

          {/* Achievements Preview */}
          <div className="achievements-section">
            <h2>🏅 Recent Achievements</h2>
            <div className="achievements-grid">
              <div className="achievement">
                <span className="achievement-icon">🌟</span>
                <p>First Lesson</p>
              </div>
              <div className="achievement">
                <span className="achievement-icon">🔥</span>
                <p>3 Day Streak</p>
              </div>
              <div className="achievement locked">
                <span className="achievement-icon">🎯</span>
                <p>Level 5</p>
              </div>
            </div>
          </div>
        </main>

        {/* Heart Purchase Modal */}
        {showPaymentModal && (
          <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                ✕
              </button>
              
              <h2>❤️ Refill Hearts</h2>
              <p>Get 5 hearts to continue learning</p>
              
              <div className="price-info">
                <span className="price">0.01 SOL</span>
                <span className="hearts">= 5 ❤️</span>
              </div>
              
              <button 
                onClick={processHeartPurchase}
                disabled={isProcessingPayment}
                className="purchase-btn"
              >
                {isProcessingPayment ? 'Processing...' : 'Purchase Hearts'}
              </button>
              
              <p className="payment-note">
                Payment will be processed through your connected wallet
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #FFFF00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dashboard-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: white;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .back-btn {
          color: #FFFF00;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.3s;
        }

        .back-btn:hover {
          opacity: 0.8;
        }

        .dashboard-header h1 {
          font-size: 1.8rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .wallet-display {
          background: rgba(255, 255, 0, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 25px;
          border: 1px solid rgba(255, 255, 0, 0.3);
          font-family: monospace;
          font-size: 0.9rem;
        }

        .dashboard-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 0, 0.3);
        }

        .stat-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 1rem;
        }

        .stat-card h3 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: white;
        }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          margin: 1rem 0;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFFF00, #FFD700);
          transition: width 0.3s ease;
        }

        .hearts-card .refill-btn {
          margin-top: 1rem;
          background: linear-gradient(135deg, #FF69B4, #FF1493);
          color: white;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refill-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(255, 105, 180, 0.4);
        }

        .balance-section {
          background: rgba(255, 255, 0, 0.05);
          border: 1px solid rgba(255, 255, 0, 0.2);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          margin-bottom: 3rem;
        }

        .balance-section h2 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .balance-value {
          font-size: 2.5rem;
          font-weight: bold;
          color: #FFFF00;
          margin-bottom: 0.5rem;
        }

        .balance-info {
          color: #ccc;
        }

        .actions-section {
          margin-bottom: 3rem;
        }

        .actions-section h2 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
        }

        .language-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .lang-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 2rem;
          border-radius: 50px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .lang-btn:hover {
          background: rgba(255, 255, 0, 0.1);
          border-color: #FFFF00;
          transform: translateY(-2px);
        }

        .flag {
          font-size: 1.5rem;
        }

        .achievements-section h2 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .achievement {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .achievement:hover {
          transform: scale(1.05);
          border-color: #FFFF00;
        }

        .achievement.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .achievement-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .achievement p {
          font-size: 0.9rem;
          color: #ccc;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: rgba(20, 20, 20, 0.98);
          border: 2px solid #FFFF00;
          border-radius: 20px;
          padding: 3rem;
          max-width: 400px;
          width: 90%;
          position: relative;
          animation: modalAppear 0.3s ease;
        }

        @keyframes modalAppear {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: #FFFF00;
          font-size: 1.5rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .modal-close:hover {
          background: rgba(255, 255, 0, 0.1);
        }

        .modal h2 {
          color: #FFFF00;
          margin-bottom: 1rem;
          text-align: center;
        }

        .modal p {
          text-align: center;
          color: #ccc;
          margin-bottom: 2rem;
        }

        .price-info {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: rgba(255, 255, 0, 0.1);
          border-radius: 15px;
        }

        .price {
          font-size: 2rem;
          font-weight: bold;
          color: #FFFF00;
        }

        .hearts {
          font-size: 1.5rem;
        }

        .purchase-btn {
          width: 100%;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .purchase-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        .purchase-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .payment-note {
          font-size: 0.9rem;
          color: #999;
          text-align: center;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .language-buttons {
            flex-direction: column;
          }

          .lang-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}