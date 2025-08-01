import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function MemePage() {
  const router = useRouter();
  const { id } = router.query;
  const [meme, setMeme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMeme();
    }
  }, [id]);

  const fetchMeme = async () => {
    try {
      const { data, error } = await supabase
        .from('memes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setMeme(data);
    } catch (error) {
      console.error('Error fetching meme:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareOnTwitter = () => {
    const text = `Check out my $PUMPIT meme! 🚀\n\nJoin the movement: `;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}&hashtags=PUMPIT,Solana,PumpItOnSol`;
    window.open(twitterUrl, '_blank');
  };

  const shareOnTelegram = () => {
    const text = `Check out my $PUMPIT meme! 🚀\n\nJoin us at @Pumpetcto`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading meme...</p>
      </div>
    );
  }

  if (!meme) {
    return (
      <div className="error-container">
        <h1>Meme not found</h1>
        <a href="/">Go back to homepage</a>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>$PUMPIT Meme by {meme.creator_x_handle}</title>
        <meta name="description" content={`Check out this $PUMPIT meme created by ${meme.creator_x_handle}!`} />
        
        {/* Open Graph for social media previews */}
        <meta property="og:title" content={`$PUMPIT Meme by ${meme.creator_x_handle}`} />
        <meta property="og:description" content="Join the $PUMPIT movement on Solana!" />
        <meta property="og:image" content={meme.image_url} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`$PUMPIT Meme by ${meme.creator_x_handle}`} />
        <meta name="twitter:description" content="Join the $PUMPIT movement on Solana!" />
        <meta name="twitter:image" content={meme.image_url} />
      </Head>

      <div className="meme-page">
        <header className="mini-header">
          <a href="/" className="logo">$PUMPIT</a>
          <div className="header-buttons">
            <a href="https://jup.ag" target="_blank" rel="noopener noreferrer" className="buy-button">
              🚀 Buy $PUMPIT
            </a>
          </div>
        </header>

        <main className="meme-container">
          <div className="meme-display">
            <img src={meme.image_url} alt={`Meme by ${meme.creator_x_handle}`} />
            
            <div className="meme-details">
              <h1>Created by {meme.creator_x_handle}</h1>
              <div className="meme-stats">
                <span>❤️ {meme.likes_count || 0} likes</span>
                <span>🔄 {meme.shares_count || 0} shares</span>
              </div>
              
              <div className="share-section">
                <h3>Share this meme:</h3>
                <div className="share-buttons">
                  <button onClick={shareOnTwitter} className="share-btn twitter">
                    🐦 Share on X
                  </button>
                  <button onClick={shareOnTelegram} className="share-btn telegram">
                    💬 Share on Telegram
                  </button>
                </div>
              </div>

              <div className="cta-section">
                <h2>Create Your Own $PUMPIT Meme!</h2>
                <a href="/#generator" className="create-button">
                  🎨 Open Meme Generator
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          color: #ffffff;
          min-height: 100vh;
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 2rem;
        }

        .error-container a {
          color: #FFFF00;
          text-decoration: none;
          padding: 1rem 2rem;
          border: 2px solid #FFFF00;
          border-radius: 50px;
          transition: all 0.3s ease;
        }

        .error-container a:hover {
          background: #FFFF00;
          color: black;
        }

        .meme-page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 50%, rgba(255, 255, 0, 0.1) 0%, transparent 50%);
        }

        .mini-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo {
          font-size: 2rem;
          font-weight: 900;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-decoration: none;
        }

        .header-buttons {
          display: flex;
          gap: 1rem;
        }

        .buy-button {
          padding: 0.8rem 1.5rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .buy-button:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.5);
        }

        .meme-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .meme-display {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: start;
        }

        .meme-display img {
          width: 100%;
          height: auto;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .meme-details {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .meme-details h1 {
          font-size: 2.5rem;
          color: #FFFF00;
        }

        .meme-stats {
          display: flex;
          gap: 2rem;
          font-size: 1.2rem;
          color: #999;
        }

        .share-section {
          background: rgba(255, 255, 255, 0.05);
          padding: 2rem;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 0, 0.2);
        }

        .share-section h3 {
          margin-bottom: 1rem;
          color: #FFFF00;
        }

        .share-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .share-btn {
          padding: 1rem 2rem;
          border: none;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
        }

        .share-btn.twitter {
          background: #1DA1F2;
        }

        .share-btn.twitter:hover {
          background: #1a8cd8;
          transform: translateY(-2px);
        }

        .share-btn.telegram {
          background: #0088cc;
        }

        .share-btn.telegram:hover {
          background: #0077b3;
          transform: translateY(-2px);
        }

        .cta-section {
          background: rgba(255, 255, 0, 0.05);
          padding: 2rem;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 0, 0.2);
          text-align: center;
        }

        .cta-section h2 {
          margin-bottom: 1.5rem;
          color: #FFFF00;
        }

        .create-button {
          display: inline-block;
          padding: 1rem 3rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }

        .create-button:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.5);
        }

        @media (max-width: 768px) {
          .meme-display {
            grid-template-columns: 1fr;
          }

          .mini-header {
            flex-direction: column;
            gap: 1rem;
          }

          .meme-details h1 {
            font-size: 1.8rem;
          }

          .share-buttons {
            flex-direction: column;
          }

          .share-btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}