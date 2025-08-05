import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <Head>
        <title>PUMPIT Blog - Daily Meme Updates & Solana News</title>
        <meta name="description" content="Daily updates from the PUMPIT community. Top memes, creator spotlights, and Solana memecoin news." />
        <meta name="keywords" content="PUMPIT, Solana, memes, crypto blog, memecoin news, daily memes" />
        <link rel="canonical" href="https://letspumpit.com/blog" />
      </Head>

      <div className="blog-page">
        <header className="blog-header">
          <Link href="/">
            <a className="logo">$PUMPIT</a>
          </Link>
          <nav>
            <Link href="/"><a>Home</a></Link>
            <Link href="/#generator"><a>Create Meme</a></Link>
            <a href="https://t.me/pumpermemebot" target="_blank">Telegram Bot</a>
          </nav>
        </header>

        <main className="blog-container">
          <div className="blog-hero">
            <h1>PUMPIT Daily Blog</h1>
            <p>Your daily dose of memes, trends, and Solana insights</p>
          </div>

          {loading ? (
            <div className="loading">Loading latest posts...</div>
          ) : (
            <div className="posts-grid">
              {posts.length === 0 ? (
                <p>No posts yet. Check back soon!</p>
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="post-card">
                    <Link href={`/blog/${post.slug}`}>
                      <a>
                        <div className="post-image">
                          {post.featured_image && (
                            <img src={post.featured_image} alt={post.title} />
                          )}
                          <div className="post-date">
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="post-content">
                          <h2>{post.title}</h2>
                          <p>{post.excerpt}</p>
                          <div className="post-meta">
                            <span className="read-more">Read More →</span>
                            <span className="views">{post.views || 0} views</span>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </article>
                ))
              )}
            </div>
          )}
        </main>

        <footer className="blog-footer">
          <div className="footer-content">
            <h3>Join the PUMPIT Movement</h3>
            <div className="footer-links">
              <a href="https://jup.ag/swap/SOL-PUMPIT" target="_blank">Buy $PUMPIT</a>
              <a href="https://twitter.com/pumpitonsol" target="_blank">Twitter</a>
              <a href="https://t.me/Pumpetcto" target="_blank">Telegram</a>
            </div>
            <p className="contract">CA: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk</p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        [COPY THE FULL STYLE SECTION FROM THE ARTIFACT]
      `}</style>
    </>
  );
}