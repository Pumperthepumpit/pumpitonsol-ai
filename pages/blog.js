import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter posts based on type and search
  const filteredPosts = posts.filter(post => {
    const matchesFilter = filter === 'all' || post.type === filter;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get featured post (most recent or highest views)
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const regularPosts = posts.length > 1 ? posts.slice(1) : [];

  // Extract unique post types for filter buttons
  const postTypes = [...new Set(posts.map(post => post.type).filter(Boolean))];

  return (
    <>
      <Head>
        <title>PUMPIT Blog - Daily Meme Updates & Solana Insights</title>
        <meta name="description" content="Daily updates from the PUMPIT community. Top memes, creator spotlights, trading insights, and Solana memecoin news." />
        <meta name="keywords" content="PUMPIT, Solana, memes, crypto blog, memecoin news, daily memes, trading insights" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://letspumpit.com/blog" />
        
        {/* Open Graph */}
        <meta property="og:title" content="PUMPIT Blog - Daily Meme Updates" />
        <meta property="og:description" content="Your daily dose of PUMPIT memes, Solana insights, and community updates." />
        <meta property="og:image" content="https://letspumpit.com/pumper.png" />
        <meta property="og:url" content="https://letspumpit.com/blog" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pumpitonsol" />
        <meta name="twitter:title" content="PUMPIT Blog - Daily Meme Updates" />
        <meta name="twitter:description" content="Your daily dose of PUMPIT memes, Solana insights, and community updates." />
        <meta name="twitter:image" content="https://letspumpit.com/pumper.png" />
      </Head>

      <div className="container">
        <header className="blog-header">
          <div className="header-top">
            <Link href="/">
              <a className="back-home">← Back to Home</a>
            </Link>
            <div className="header-actions">
              <a href="https://t.me/pumpermemebot" target="_blank" rel="noopener noreferrer" className="telegram-bot-btn">
                🤖 Telegram Bot
              </a>
              <a href="https://jup.ag/swap/SOL-PUMPIT" target="_blank" rel="noopener noreferrer" className="buy-btn">
                🚀 Buy $PUMPIT
              </a>
            </div>
          </div>
          
          <div className="hero-section">
            <div className="pumper-float">
              <img src="/pumper.png" alt="Pumper mascot" />
            </div>
            <h1>PUMPIT Blog</h1>
            <p>Daily memes, insights, and Solana alpha from the PUMPIT community</p>
          </div>
        </header>

        <main className="blog-main">
          {/* Search and Filter Section */}
          <div className="controls-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All Posts
              </button>
              {postTypes.map(type => (
                <button 
                  key={type}
                  className={`filter-btn ${filter === type ? 'active' : ''}`}
                  onClick={() => setFilter(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading latest posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="no-posts">
              <p>No posts found. Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featuredPost && filter === 'all' && !searchTerm && (
                <div className="featured-section">
                  <h2>Featured Post</h2>
                  <Link href={`/blog/${featuredPost.slug}`}>
                    <a className="featured-card">
                      <div className="featured-image">
                        {featuredPost.featured_image ? (
                          <img src={featuredPost.featured_image} alt={featuredPost.title} />
                        ) : (
                          <div className="placeholder-image">
                            <img src="/pumper.png" alt="PUMPIT" />
                          </div>
                        )}
                        <div className="featured-badge">Featured</div>
                      </div>
                      <div className="featured-content">
                        <h3>{featuredPost.title}</h3>
                        <p>{featuredPost.excerpt}</p>
                        <div className="featured-meta">
                          <span className="date">
                            {new Date(featuredPost.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="views">👀 {featuredPost.views || 0} views</span>
                          {featuredPost.type && <span className="category">{featuredPost.type}</span>}
                        </div>
                      </div>
                    </a>
                  </Link>
                </div>
              )}

              {/* Regular Posts Grid */}
              <div className="posts-section">
                <h2>Latest Posts</h2>
                <div className="posts-grid">
                  {(filter === 'all' && !searchTerm ? regularPosts : filteredPosts).map((post) => (
                    <article key={post.id} className="post-card">
                      <Link href={`/blog/${post.slug}`}>
                        <a>
                          <div className="post-image">
                            {post.featured_image ? (
                              <img src={post.featured_image} alt={post.title} />
                            ) : (
                              <div className="placeholder-image">
                                <img src="/pumper.png" alt="PUMPIT" />
                              </div>
                            )}
                            {post.type && (
                              <div className="post-category">{post.type}</div>
                            )}
                          </div>
                          <div className="post-content">
                            <h3>{post.title}</h3>
                            <p>{post.excerpt}</p>
                            <div className="post-meta">
                              <span className="date">
                                {new Date(post.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="views">👀 {post.views || 0}</span>
                              <span className="read-more">Read More →</span>
                            </div>
                          </div>
                        </a>
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Newsletter Signup */}
          <div className="newsletter-section">
            <h3>🚀 Stay Updated</h3>
            <p>Get the latest PUMPIT news and memes delivered to your inbox</p>
            <div className="newsletter-links">
              <a href="https://twitter.com/pumpitonsol" target="_blank" rel="noopener noreferrer" className="social-link twitter">
                Follow on X
              </a>
              <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer" className="social-link telegram">
                Join Telegram
              </a>
            </div>
          </div>
        </main>

        <footer className="blog-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>$PUMPIT</h4>
              <p>Making Solana smile, one meme at a time</p>
              <p className="contract">CA: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <Link href="/"><a>Home</a></Link>
              <Link href="/#generator"><a>Create Meme</a></Link>
              <a href="https://jup.ag/swap/SOL-PUMPIT" target="_blank">Buy $PUMPIT</a>
            </div>
            <div className="footer-section">
              <h4>Community</h4>
              <a href="https://twitter.com/pumpitonsol" target="_blank">Twitter</a>
              <a href="https://t.me/Pumpetcto" target="_blank">Telegram</a>
              <a href="https://t.me/pumpermemebot" target="_blank">Meme Bot</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 PumpItOnSol. Powered by memes and dreams. 🎨🚀</p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .container {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
          overflow-x: hidden;
        }

        /* Background gradient effect */
        .container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(255, 255, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(255, 255, 0, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 1;
        }

        /* Header Styles */
        .blog-header {
          position: relative;
          z-index: 2;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-top {
          max-width: 1200px;
          margin: 0 auto 3rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .telegram-bot-btn, .buy-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .telegram-bot-btn {
          background: #0088cc;
          color: white;
        }

        .telegram-bot-btn:hover {
          background: #0077b3;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 136, 204, 0.4);
        }

        .buy-btn {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
        }

        .buy-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 255, 0, 0.4);
        }

        /* Hero Section */
        .hero-section {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
          position: relative;
        }

        .pumper-float {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          filter: blur(2px);
          z-index: 0;
        }

        .pumper-float img {
          width: 300px;
          height: 300px;
        }

        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-20px); }
        }

        .hero-section h1 {
          font-size: 3.5rem;
          font-weight: 900;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }

        .hero-section p {
          font-size: 1.2rem;
          color: #ccc;
          position: relative;
          z-index: 1;
        }

        /* Main Content */
        .blog-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 2rem;
          position: relative;
          z-index: 2;
        }

        /* Controls Section */
        .controls-section {
          display: flex;
          gap: 2rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 250px;
        }

        .search-input {
          width: 100%;
          padding: 0.8rem 3rem 0.8rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: #FFFF00;
          background: rgba(255, 255, 255, 0.08);
        }

        .search-input::placeholder {
          color: #666;
        }

        .search-icon {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.2rem;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.6rem 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 25px;
          color: #ccc;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.9rem;
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .filter-btn.active {
          background: rgba(255, 255, 0, 0.1);
          border-color: #FFFF00;
          color: #FFFF00;
        }

        /* Loading State */
        .loading-container {
          text-align: center;
          padding: 5rem 0;
        }

        .loading-spinner {
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

        .loading-container p {
          color: #FFFF00;
          font-size: 1.1rem;
        }

        .no-posts {
          text-align: center;
          padding: 5rem 0;
          color: #666;
          font-size: 1.1rem;
        }

        /* Featured Section */
        .featured-section {
          margin-bottom: 4rem;
        }

        .featured-section h2 {
          font-size: 2rem;
          color: #FFFF00;
          margin-bottom: 2rem;
        }

        .featured-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          overflow: hidden;
          text-decoration: none;
          transition: all 0.3s;
          border: 1px solid rgba(255, 255, 0, 0.1);
        }

        .featured-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          border-color: rgba(255, 255, 0, 0.3);
        }

        .featured-image {
          position: relative;
          height: 400px;
          overflow: hidden;
        }

        .featured-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .featured-card:hover .featured-image img {
          transform: scale(1.05);
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .placeholder-image img {
          width: 150px;
          height: 150px;
          opacity: 0.3;
        }

        .featured-badge {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .featured-content {
          padding: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .featured-content h3 {
          font-size: 2rem;
          color: #FFFF00;
          margin-bottom: 1rem;
          line-height: 1.3;
        }

        .featured-content p {
          color: #e0e0e0;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .featured-meta {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .featured-meta span {
          color: #999;
          font-size: 0.95rem;
        }

        .featured-meta .category {
          background: rgba(255, 255, 0, 0.1);
          color: #FFFF00;
          padding: 0.3rem 0.8rem;
          border-radius: 15px;
        }

        /* Posts Section */
        .posts-section h2 {
          font-size: 2rem;
          color: #FFFF00;
          margin-bottom: 2rem;
        }

        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .post-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          overflow: hidden;
          transition: all 0.3s;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .post-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
          border-color: rgba(255, 255, 0, 0.2);
        }

        .post-card a {
          text-decoration: none;
          color: inherit;
        }

        .post-image {
          position: relative;
          height: 200px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.5);
        }

        .post-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .post-card:hover .post-image img {
          transform: scale(1.05);
        }

        .post-category {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 0, 0.9);
          color: black;
          padding: 0.3rem 0.8rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .post-content {
          padding: 1.5rem;
        }

        .post-content h3 {
          color: #FFFF00;
          font-size: 1.3rem;
          margin-bottom: 0.8rem;
          line-height: 1.3;
        }

        .post-content p {
          color: #ccc;
          line-height: 1.5;
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: #999;
        }

        .post-meta .date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .post-meta .views {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .post-meta .read-more {
          color: #FFFF00;
          font-weight: 500;
        }

        /* Newsletter Section */
        .newsletter-section {
          margin-top: 5rem;
          padding: 3rem;
          background: linear-gradient(135deg, rgba(255, 255, 0, 0.05), rgba(255, 215, 0, 0.05));
          border-radius: 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 0, 0.1);
        }

        .newsletter-section h3 {
          font-size: 2rem;
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .newsletter-section p {
          color: #ccc;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .newsletter-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .social-link {
          padding: 0.8rem 2rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }

        .social-link.twitter {
          background: #1DA1F2;
          color: white;
        }

        .social-link.telegram {
          background: #0088cc;
          color: white;
        }

        .social-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        /* Footer */
        .blog-footer {
          background: rgba(0, 0, 0, 0.8);
          padding: 3rem 2rem 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 2;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 3rem;
          margin-bottom: 2rem;
        }

        .footer-section h4 {
          color: #FFFF00;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }

        .footer-section p {
          color: #999;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        .footer-section .contract {
          font-family: monospace;
          font-size: 0.8rem;
          word-break: break-all;
          color: #666;
        }

        .footer-section a {
          display: block;
          color: #ccc;
          text-decoration: none;
          padding: 0.3rem 0;
          transition: color 0.3s;
        }

        .footer-section a:hover {
          color: #FFFF00;
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: #666;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .hero-section h1 {
            font-size: 2.5rem;
          }

          .hero-section p {
            font-size: 1rem;
          }

          .header-top {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .header-actions {
            justify-content: center;
          }

          .controls-section {
            flex-direction: column;
          }

          .filter-buttons {
            justify-content: center;
          }

          .featured-card {
            grid-template-columns: 1fr;
          }

          .featured-image {
            height: 250px;
          }

          .featured-content {
            padding: 2rem;
          }

          .featured-content h3 {
            font-size: 1.5rem;
          }

          .posts-grid {
            grid-template-columns: 1fr;
          }

          .newsletter-links {
            flex-direction: column;
            align-items: center;
          }

          .social-link {
            width: 200px;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}