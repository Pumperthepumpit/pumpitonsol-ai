// pages/admin/blog-generator.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

export default function BlogGenerator() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [topMemes, setTopMemes] = useState([]);
  const [selectedMemes, setSelectedMemes] = useState([]);
  const [blogType, setBlogType] = useState('daily-roundup');
  const [customTopic, setCustomTopic] = useState('');
  const [generatedPost, setGeneratedPost] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Simple password protection
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('blog_admin_auth');
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
      fetchTopMemes();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    // You should change this password!
    if (password === 'pumpit2025admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('blog_admin_auth', 'authenticated');
      fetchTopMemes();
    } else {
      setError('Invalid password');
    }
  };

  const fetchTopMemes = async () => {
    try {
      console.log('Fetching top memes...');
      // Get top memes from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('memes')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('likes_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      console.log('Fetched memes:', data?.length || 0);
      setTopMemes(data || []);
    } catch (error) {
      console.error('Error fetching memes:', error);
      setError('Failed to fetch memes: ' + error.message);
    }
  };

  const toggleMemeSelection = (memeId) => {
    setSelectedMemes(prev => 
      prev.includes(memeId) 
        ? prev.filter(id => id !== memeId)
        : [...prev, memeId]
    );
  };

  const generateBlogPost = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');
    setGeneratedPost(null);

    try {
      console.log('=== STARTING BLOG GENERATION ===');
      console.log('Blog type:', blogType);
      console.log('Custom topic:', customTopic);
      console.log('Selected memes count:', selectedMemes.length);
      console.log('Selected meme IDs:', selectedMemes);
      
      const requestBody = {
        type: blogType,
        customTopic,
        featuredMemes: selectedMemes,
        memeDetails: topMemes.filter(m => selectedMemes.includes(m.id))
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      console.log('Calling API endpoint...');
      
      // Call our API endpoint to generate content
      const response = await fetch('/api/generate-blog-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Get response as text first to debug
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, responseText);
        throw new Error(`API returned ${response.status}: ${responseText}`);
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Invalid JSON response from API');
      }

      // Validate the response has expected fields
      if (!data.title || !data.content) {
        console.error('Invalid response structure:', data);
        throw new Error('Response missing required fields (title or content)');
      }
      
      setGeneratedPost(data);
      setSuccess('Blog post generated successfully!');
      console.log('=== BLOG GENERATION SUCCESS ===');
    } catch (error) {
      console.error('=== BLOG GENERATION ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      setError('Failed to generate blog post: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveBlogPost = async () => {
    if (!generatedPost) return;

    try {
      console.log('Saving blog post...');
      const slug = generatedPost.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          title: generatedPost.title,
          slug: slug,
          content: generatedPost.content,
          excerpt: generatedPost.excerpt,
          type: blogType,
          featured_memes: selectedMemes.length > 0 ? selectedMemes : null,
          meta_description: generatedPost.metaDescription,
          keywords: generatedPost.keywords,
          featured_image: generatedPost.featuredImage || null
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Blog post saved:', data);
      setSuccess(`Blog post saved! View at: /blog/${slug}`);
      
      // Reset form
      setGeneratedPost(null);
      setSelectedMemes([]);
      setCustomTopic('');
      
      // Redirect to the new post after 2 seconds
      setTimeout(() => {
        router.push(`/blog/${slug}`);
      }, 2000);

    } catch (error) {
      console.error('Error saving post:', error);
      setError('Failed to save blog post: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <Head>
          <title>Blog Admin - PUMPIT</title>
        </Head>
        <div className="login-container">
          <h1>🔐 Admin Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
        <style jsx>{`
          .admin-login {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0a0a;
            color: white;
          }
          .login-container {
            background: rgba(255, 255, 255, 0.05);
            padding: 3rem;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 0, 0.3);
            max-width: 400px;
            width: 90%;
          }
          h1 {
            text-align: center;
            color: #FFFF00;
            margin-bottom: 2rem;
          }
          input {
            width: 100%;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 0, 0.3);
            border-radius: 10px;
            color: white;
            margin-bottom: 1rem;
            font-size: 1rem;
          }
          button {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #FFFF00, #FFD700);
            color: black;
            border: none;
            border-radius: 50px;
            font-weight: bold;
            cursor: pointer;
            font-size: 1rem;
          }
          button:hover {
            transform: scale(1.05);
          }
          .error {
            color: #ff6666;
            text-align: center;
            margin-top: 1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AI Blog Generator - PUMPIT Admin</title>
      </Head>

      <div className="admin-container">
        <header className="admin-header">
          <h1>🤖 AI Blog Generator</h1>
          <nav>
            <a href="/">← Back to Site</a>
            <a href="/blog">View Blog</a>
            <button 
              onClick={() => {
                sessionStorage.removeItem('blog_admin_auth');
                setIsAuthenticated(false);
              }}
              className="logout-btn"
            >
              Logout
            </button>
          </nav>
        </header>

        <main className="admin-main">
          {/* Debug Info */}
          <div className="debug-info">
            <p>Memes loaded: {topMemes.length}</p>
            <p>Selected: {selectedMemes.length}</p>
          </div>

          {/* Blog Type Selection */}
          <section className="section">
            <h2>1. Choose Blog Post Type</h2>
            <div className="type-selector">
              <label>
                <input
                  type="radio"
                  value="daily-roundup"
                  checked={blogType === 'daily-roundup'}
                  onChange={(e) => setBlogType(e.target.value)}
                />
                <span>📅 Daily Meme Roundup</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="creator-spotlight"
                  checked={blogType === 'creator-spotlight'}
                  onChange={(e) => setBlogType(e.target.value)}
                />
                <span>🌟 Creator Spotlight</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="tutorial"
                  checked={blogType === 'tutorial'}
                  onChange={(e) => setBlogType(e.target.value)}
                />
                <span>📚 How-To Guide</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="market-update"
                  checked={blogType === 'market-update'}
                  onChange={(e) => setBlogType(e.target.value)}
                />
                <span>📈 Market Update</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="custom"
                  checked={blogType === 'custom'}
                  onChange={(e) => setBlogType(e.target.value)}
                />
                <span>✏️ Custom Topic</span>
              </label>
            </div>

            {blogType === 'custom' && (
              <input
                type="text"
                placeholder="Enter your custom topic..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="custom-topic-input"
              />
            )}
          </section>

          {/* Meme Selection */}
          <section className="section">
            <h2>2. Select Featured Memes (Optional)</h2>
            <div className="meme-grid">
              {topMemes.length === 0 ? (
                <p>No recent memes found. You can still generate a blog post without featured memes.</p>
              ) : (
                topMemes.map(meme => (
                  <div 
                    key={meme.id}
                    className={`meme-card ${selectedMemes.includes(meme.id) ? 'selected' : ''}`}
                    onClick={() => toggleMemeSelection(meme.id)}
                  >
                    <img src={meme.image_url} alt={meme.topic || 'Meme'} />
                    <div className="meme-info">
                      <p>{meme.topic || 'Untitled'}</p>
                      <small>by {meme.creator_x_handle || 'anonymous'}</small>
                      <div className="stats">
                        ❤️ {meme.likes_count || 0} | 🔄 {meme.shares_count || 0}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="selected-count">
              {selectedMemes.length} meme{selectedMemes.length !== 1 ? 's' : ''} selected
            </p>
          </section>

          {/* Generate Button */}
          <section className="section">
            <button 
              onClick={generateBlogPost}
              disabled={isGenerating || (blogType === 'custom' && !customTopic)}
              className="generate-button"
            >
              {isGenerating ? '⏳ Generating with AI...' : '🚀 Generate Blog Post'}
            </button>
            <p className="info-text">
              {blogType === 'custom' && !customTopic && 'Please enter a custom topic first'}
            </p>
          </section>

          {/* Error/Success Messages */}
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}

          {/* Generated Post Preview */}
          {generatedPost && (
            <section className="section preview-section">
              <h2>3. Preview Generated Post</h2>
              <div className="preview">
                <h3>{generatedPost.title}</h3>
                <p className="excerpt">{generatedPost.excerpt}</p>
                <div className="content" dangerouslySetInnerHTML={{ __html: generatedPost.content }} />
                <div className="metadata">
                  <p><strong>Keywords:</strong> {generatedPost.keywords}</p>
                  <p><strong>Meta Description:</strong> {generatedPost.metaDescription}</p>
                </div>
              </div>
              <div className="action-buttons">
                <button onClick={saveBlogPost} className="save-button">
                  💾 Save & Publish
                </button>
                <button 
                  onClick={() => setGeneratedPost(null)} 
                  className="cancel-button"
                >
                  ❌ Discard
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      <style jsx>{`
        .admin-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: white;
          padding: 2rem;
        }

        .admin-header {
          max-width: 1200px;
          margin: 0 auto 3rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }

        .admin-header h1 {
          color: #FFFF00;
          font-size: 2rem;
        }

        .admin-header nav {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .admin-header a, .logout-btn {
          color: #FFFF00;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border: 1px solid rgba(255, 255, 0, 0.3);
          border-radius: 25px;
          transition: all 0.3s;
          background: transparent;
          cursor: pointer;
          font-size: 1rem;
        }

        .admin-header a:hover, .logout-btn:hover {
          background: rgba(255, 255, 0, 0.1);
        }

        .debug-info {
          max-width: 1200px;
          margin: 0 auto 2rem;
          padding: 1rem;
          background: rgba(0, 100, 255, 0.1);
          border-radius: 10px;
          font-family: monospace;
        }

        .admin-main {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 0, 0.1);
        }

        .section h2 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .type-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .type-selector label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .type-selector label:hover {
          background: rgba(255, 255, 0, 0.1);
        }

        .type-selector input[type="radio"] {
          margin: 0;
        }

        .custom-topic-input {
          width: 100%;
          padding: 1rem;
          margin-top: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 0, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }

        .meme-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .meme-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .meme-card:hover {
          transform: scale(1.05);
        }

        .meme-card.selected {
          border-color: #FFFF00;
          box-shadow: 0 0 20px rgba(255, 255, 0, 0.3);
        }

        .meme-card img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .meme-info {
          padding: 0.5rem;
          font-size: 0.85rem;
        }

        .meme-info p {
          margin: 0;
          color: #FFFF00;
          font-weight: bold;
        }

        .meme-info small {
          color: #999;
        }

        .stats {
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.75rem;
        }

        .selected-count {
          text-align: center;
          color: #FFFF00;
          font-weight: bold;
        }

        .generate-button {
          width: 100%;
          padding: 1.5rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          border-radius: 50px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }

        .generate-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .info-text {
          text-align: center;
          color: #999;
          margin-top: 1rem;
          font-size: 0.9rem;
        }

        .error-message {
          background: rgba(255, 0, 0, 0.1);
          color: #ff6666;
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 0, 0, 0.3);
        }

        .success-message {
          background: rgba(0, 255, 0, 0.1);
          color: #66ff66;
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          border: 1px solid rgba(0, 255, 0, 0.3);
        }

        .preview-section {
          background: rgba(255, 255, 0, 0.02);
          border-color: rgba(255, 255, 0, 0.2);
        }

        .preview {
          background: rgba(0, 0, 0, 0.3);
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
        }

        .preview h3 {
          color: #FFFF00;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .preview .excerpt {
          color: #ccc;
          font-size: 1.1rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .preview .content {
          line-height: 1.8;
          color: #e0e0e0;
        }

        .preview .content :global(h2),
        .preview .content :global(h3) {
          color: #FFFF00;
          margin: 1.5rem 0 1rem;
        }

        .preview .content :global(p) {
          margin-bottom: 1rem;
        }

        .metadata {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.9rem;
          color: #999;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .save-button {
          flex: 1;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #00ff00, #00cc00);
          color: white;
          border: none;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          font-size: 1.1rem;
        }

        .save-button:hover {
          transform: scale(1.05);
        }

        .cancel-button {
          flex: 1;
          padding: 1rem 2rem;
          background: rgba(255, 0, 0, 0.2);
          color: #ff6666;
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          font-size: 1.1rem;
        }

        .cancel-button:hover {
          background: rgba(255, 0, 0, 0.3);
        }

        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            gap: 1rem;
          }

          .type-selector {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}