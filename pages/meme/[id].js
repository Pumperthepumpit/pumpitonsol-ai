import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Server-side data fetching for meta tags
export async function getServerSideProps(context) {
  const { id } = context.params;
  
  try {
    const { data: meme, error } = await supabase
      .from('memes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !meme) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        meme,
      },
    };
  } catch (error) {
    console.error('Error fetching meme:', error);
    return {
      notFound: true,
    };
  }
}

export default function MemePage({ meme: initialMeme }) {
  const router = useRouter();
  const { id } = router.query;
  const [meme, setMeme] = useState(initialMeme);
  const [loading, setLoading] = useState(false);
  const [likedMemes, setLikedMemes] = useState([]);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    // Load liked memes from localStorage
    const stored = localStorage.getItem('likedMemes');
    if (stored) {
      setLikedMemes(JSON.parse(stored));
    }

    // Increment view count
    if (meme) {
      incrementViewCount();
    }
  }, [meme?.id]);

  const incrementViewCount = async () => {
    try {
      const newViewCount = (meme.views_count || 0) + 1;
      await supabase
        .from('memes')
        .update({ views_count: newViewCount })
        .eq('id', meme.id);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleLike = async () => {
    if (!meme) return;
    
    const isLiked = likedMemes.includes(meme.id);
    
    try {
      const newLikesCount = isLiked ? meme.likes_count - 1 : meme.likes_count + 1;
      
      const { error } = await supabase
        .from('memes')
        .update({ likes_count: newLikesCount })
        .eq('id', meme.id);
        
      if (error) throw error;
      
      // Update local state
      setMeme({ ...meme, likes_count: newLikesCount });
      
      if (isLiked) {
        const updated = likedMemes.filter(id => id !== meme.id);
        setLikedMemes(updated);
        localStorage.setItem('likedMemes', JSON.stringify(updated));
      } else {
        const updated = [...likedMemes, meme.id];
        setLikedMemes(updated);
        localStorage.setItem('likedMemes', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const shareOnTwitter = async () => {
    const creatorHandle = meme.creator_x_handle || 'anonymous';
    const topic = meme.topic || 'awesome meme';
    const text = `Check out this ${topic} by ${creatorHandle}! 🚀 @pumpitonsol\n\n#PUMPIT #Solana #MemeCoin #CryptoMemes`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    
    // Update share count
    if (meme) {
      try {
        const newShareCount = (meme.shares_count || 0) + 1;
        await supabase
          .from('memes')
          .update({ shares_count: newShareCount })
          .eq('id', meme.id);
        
        setMeme({ ...meme, shares_count: newShareCount });
      } catch (error) {
        console.error('Error updating share count:', error);
      }
    }
  };

  const shareOnTelegram = async () => {
    const creatorHandle = meme.creator_x_handle || 'anonymous';
    const topic = meme.topic || 'PUMPIT meme';
    const text = `🚀 ${topic} by ${creatorHandle}\n\nJoin the PUMPIT movement!\n\n💛 letspumpit.com\n📱 @Pumpetcto`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    
    // Update share count
    if (meme) {
      try {
        const newShareCount = (meme.shares_count || 0) + 1;
        await supabase
          .from('memes')
          .update({ shares_count: newShareCount })
          .eq('id', meme.id);
        
        setMeme({ ...meme, shares_count: newShareCount });
      } catch (error) {
        console.error('Error updating share count:', error);
      }
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const downloadMeme = () => {
    const link = document.createElement('a');
    link.href = meme.image_url;
    link.download = `pumpit-meme-${meme.id}.png`;
    link.target = '_blank';
    link.click();
  };

  if (!meme) {
    return (
      <div className="error-container">
        <h1>Meme not found</h1>
        <a href="/">Go back to homepage</a>
      </div>
    );
  }

  // SEO data
  const siteUrl = 'https://letspumpit.com';
  const pageUrl = `${siteUrl}/meme/${meme.id}`;
  const memeTitle = meme.topic ? `${meme.topic} - PUMPIT Meme #${meme.id}` : `PUMPIT Meme #${meme.id}`;
  const memeDescription = meme.description || `${meme.topic || 'Epic'} PUMPIT meme created by ${meme.creator_x_handle || 'community'}. Join Solana's fastest growing memecoin community! 🚀 #PUMPIT #Solana`;
  const keywords = `PUMPIT, Solana, meme, crypto, memecoin, ${meme.topic || ''}, ${meme.creator_x_handle || ''}, blockchain, web3`;
  
  // Ensure full URL for image
  let fullImageUrl = meme.image_url;
  if (!fullImageUrl.startsWith('http://') && !fullImageUrl.startsWith('https://')) {
    if (fullImageUrl.startsWith('/')) {
      fullImageUrl = `${siteUrl}${fullImageUrl}`;
    } else {
      fullImageUrl = `https://${fullImageUrl}`;
    }
  }

  return (
    <>
      <Head>
        <title>{memeTitle}</title>
        <meta name="description" content={memeDescription} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={pageUrl} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pumpitonsol" />
        <meta name="twitter:creator" content={`@${meme.creator_x_handle || 'pumpitonsol'}`} />
        <meta name="twitter:title" content={memeTitle} />
        <meta name="twitter:description" content={memeDescription} />
        <meta name="twitter:image" content={fullImageUrl} />
        <meta name="twitter:image:alt" content={`${meme.topic || 'PUMPIT'} meme`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={memeTitle} />
        <meta property="og:description" content={memeDescription} />
        <meta property="og:image" content={fullImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />
        <meta property="og:site_name" content="PUMPIT - Solana's Meme Revolution" />
        <meta property="article:author" content={meme.creator_x_handle || 'PUMPIT Community'} />
        <meta property="article:published_time" content={meme.created_at} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content={meme.creator_x_handle || 'PUMPIT Community'} />
      </Head>

      <div className="meme-page">
        <header className="mini-header">
          <a href="/" className="logo">$PUMPIT</a>
          <div className="header-buttons">
            <a href="https://jup.ag/swap/SOL-PUMPIT" target="_blank" rel="noopener noreferrer" className="buy-button">
              🚀 Buy $PUMPIT
            </a>
            <a href="https://t.me/pumpermemebot" target="_blank" rel="noopener noreferrer" className="bot-button">
              🤖 Telegram Bot
            </a>
          </div>
        </header>

        <main className="meme-container">
          <div className="meme-display">
            <div className="meme-image-section">
              <img src={meme.image_url} alt={`${meme.topic || 'PUMPIT'} meme by ${meme.creator_x_handle}`} />
              {meme.from_telegram_bot && (
                <div className="telegram-badge">
                  🤖 Made with Telegram Bot!
                </div>
              )}
            </div>
            
            <div className="meme-details">
              <h1>{meme.topic || `PUMPIT Meme #${meme.id}`}</h1>
              <p className="creator">Created by <span className="creator-handle">@{meme.creator_x_handle || 'anonymous'}</span></p>
              
              {meme.description && (
                <p className="meme-description">{meme.description}</p>
              )}
              
              <div className="meme-stats">
                <button 
                  onClick={handleLike}
                  className={`like-button ${likedMemes.includes(meme.id) ? 'liked' : ''}`}
                >
                  ❤️ {meme.likes_count || 0} likes
                </button>
                <span className="stat-item">🔄 {meme.shares_count || 0} shares</span>
                <span className="stat-item">👀 {meme.views_count || 0} views</span>
              </div>
              
              <div className="share-section">
                <h3>Share this meme:</h3>
                <div className="share-buttons">
                  <button onClick={shareOnTwitter} className="share-btn twitter">
                    𝕏 Share on X
                  </button>
                  <button onClick={shareOnTelegram} className="share-btn telegram">
                    📱 Telegram
                  </button>
                  <button onClick={copyLink} className="share-btn copy">
                    {showCopied ? '✅ Copied!' : '🔗 Copy Link'}
                  </button>
                  <button onClick={downloadMeme} className="share-btn download">
                    📥 Download
                  </button>
                </div>
              </div>

              <div className="cta-section">
                <h2>Create Your Own $PUMPIT Meme!</h2>
                <p>Join thousands creating viral memes daily</p>
                <div className="cta-buttons">
                  <a href="/#generator" className="create-button">
                    🎨 Web Generator
                  </a>
                  <a href="https://t.me/pumpermemebot" target="_blank" className="create-button telegram">
                    🤖 Telegram Bot
                  </a>
                </div>
              </div>

              <div className="pumpit-info">
                <h3>🚀 What is PUMPIT?</h3>
                <p>The most fun memecoin on Solana! Join our community:</p>
                <ul>
                  <li>📈 Contract: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk</li>
                  <li>💛 Website: <a href="https://letspumpit.com">letspumpit.com</a></li>
                  <li>🐦 Twitter: <a href="https://twitter.com/pumpitonsol">@pumpitonsol</a></li>
                  <li>📱 Telegram: <a href="https://t.me/Pumpetcto">@Pumpetcto</a></li>
                </ul>
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

        .buy-button, .bot-button {
          padding: 0.8rem 1.5rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .bot-button {
          background: linear-gradient(135deg, #0088cc, #0077b3);
          color: white;
        }

        .buy-button:hover, .bot-button:hover {
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

        .meme-image-section {
          position: relative;
        }

        .meme-display img {
          width: 100%;
          height: auto;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .telegram-badge {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: #0088cc;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-size: 0.9rem;
          font-weight: bold;
          box-shadow: 0 4px 15px rgba(0, 136, 204, 0.5);
        }

        .meme-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .meme-details h1 {
          font-size: 2.5rem;
          color: #FFFF00;
          line-height: 1.2;
        }

        .creator {
          font-size: 1.2rem;
          color: #999;
        }

        .creator-handle {
          color: #FFFF00;
          font-weight: bold;
        }

        .meme-description {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #ccc;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          border-left: 3px solid #FFFF00;
        }

        .meme-stats {
          display: flex;
          gap: 1.5rem;
          font-size: 1.1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .like-button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0.6rem 1.2rem;
          border-radius: 30px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .like-button:hover {
          background: rgba(255, 255, 0, 0.2);
          transform: scale(1.05);
        }

        .like-button.liked {
          background: rgba(255, 255, 0, 0.3);
          color: #FFFF00;
        }

        .stat-item {
          color: #999;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .share-section {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 0, 0.2);
        }

        .share-section h3 {
          margin-bottom: 1rem;
          color: #FFFF00;
        }

        .share-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
        }

        .share-btn {
          padding: 0.9rem 1.5rem;
          border: none;
          border-radius: 50px;
          font-size: 0.95rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .share-btn.twitter {
          background: #1DA1F2;
        }

        .share-btn.telegram {
          background: #0088cc;
        }

        .share-btn.copy {
          background: #666;
        }

        .share-btn.download {
          background: #4CAF50;
        }

        .share-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .cta-section {
          background: rgba(255, 255, 0, 0.05);
          padding: 2rem;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 0, 0.2);
          text-align: center;
        }

        .cta-section h2 {
          margin-bottom: 0.5rem;
          color: #FFFF00;
        }

        .cta-section p {
          margin-bottom: 1.5rem;
          color: #ccc;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .create-button {
          display: inline-block;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .create-button.telegram {
          background: linear-gradient(135deg, #0088cc, #0077b3);
          color: white;
        }

        .create-button:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.5);
        }

        .pumpit-info {
          background: rgba(255, 255, 0, 0.05);
          padding: 1.5rem;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 0, 0.2);
        }

        .pumpit-info h3 {
          color: #FFFF00;
          margin-bottom: 0.8rem;
        }

        .pumpit-info ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pumpit-info li {
          font-size: 0.95rem;
          color: #ccc;
        }

        .pumpit-info a {
          color: #FFFF00;
          text-decoration: none;
        }

        .pumpit-info a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .meme-display {
            grid-template-columns: 1fr;
          }

          .mini-header {
            flex-direction: column;
            gap: 1rem;
          }

          .header-buttons {
            width: 100%;
            justify-content: center;
          }

          .meme-details h1 {
            font-size: 1.8rem;
          }

          .share-buttons {
            grid-template-columns: 1fr;
          }

          .cta-buttons {
            flex-direction: column;
            width: 100%;
          }

          .create-button {
            width: 100%;
          }

          .meme-stats {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}