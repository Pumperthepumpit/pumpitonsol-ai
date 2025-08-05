import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Server-side data fetching for SEO
export async function getServerSideProps(context) {
  const { slug } = context.params;
  
  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !post) {
      return {
        notFound: true,
      };
    }

    // Fetch featured memes if any
    let featuredMemes = [];
    if (post.featured_memes && post.featured_memes.length > 0) {
      const { data: memes } = await supabase
        .from('memes')
        .select('*')
        .in('id', post.featured_memes);
      
      featuredMemes = memes || [];
    }

    return {
      props: {
        post,
        featuredMemes,
      },
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return {
      notFound: true,
    };
  }
}

export default function BlogPostPage({ post, featuredMemes }) {
  const router = useRouter();
  const [relatedPosts, setRelatedPosts] = useState([]);

  useEffect(() => {
    if (post) {
      incrementViews();
      fetchRelatedPosts();
    }
  }, [post?.id]);

  async function incrementViews() {
    try {
      const newViews = (post.views || 0) + 1;
      await supabase
        .from('blog_posts')
        .update({ views: newViews })
        .eq('id', post.id);
    } catch (error) {
      console.error('Error updating views:', error);
    }
  }

  async function fetchRelatedPosts() {
    try {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, created_at')
        .neq('id', post.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setRelatedPosts(data || []);
    } catch (error) {
      console.error('Error fetching related posts:', error);
    }
  }

  if (!post) {
    return (
      <div className="error-container">
        <h1>Blog post not found</h1>
        <Link href="/blog">
          <a>Back to blog</a>
        </Link>
      </div>
    );
  }

  // Format content with proper HTML
  const formattedContent = post.content
    .split('\n\n')
    .map(paragraph => {
      // Check if it's a heading
      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
        return `<h3>${paragraph.replace(/\*\*/g, '')}</h3>`;
      }
      // Check if it's a list item
      if (paragraph.startsWith('- ') || paragraph.startsWith('• ')) {
        return `<ul><li>${paragraph.substring(2)}</li></ul>`;
      }
      // Check for numbered lists
      if (/^\d+\.\s/.test(paragraph)) {
        return `<ol><li>${paragraph.substring(3)}</li></ol>`;
      }
      // Regular paragraph
      return `<p>${paragraph}</p>`;
    })
    .join('\n')
    // Convert markdown links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Convert **bold** text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* text
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const publishDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <Head>
        <title>{post.title} | PUMPIT Blog</title>
        <meta name="description" content={post.meta_description || post.excerpt} />
        <meta name="keywords" content={post.keywords || 'PUMPIT, Solana, memes, crypto'} />
        <link rel="canonical" href={`https://letspumpit.com/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt} />
        <meta property="og:url" content={`https://letspumpit.com/blog/${post.slug}`} />
        {post.featured_image && <meta property="og:image" content={post.featured_image} />}
        <meta property="article:published_time" content={post.created_at} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pumpitonsol" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description || post.excerpt} />
        {post.featured_image && <meta name="twitter:image" content={post.featured_image} />}
      </Head>

      <div className="blog-post-page">
        <header className="blog-header">
          <Link href="/">
            <a className="logo">$PUMPIT</a>
          </Link>
          <nav>
            <Link href="/"><a>Home</a></Link>
            <Link href="/blog"><a>Blog</a></Link>
            <Link href="/#generator"><a>Create Meme</a></Link>
          </nav>
        </header>

        <main className="post-container">
          <article className="post-content">
            <div className="post-meta">
              <Link href="/blog">
                <a className="back-link">← Back to Blog</a>
              </Link>
              <time dateTime={post.created_at}>{publishDate}</time>
            </div>

            <h1>{post.title}</h1>

            {post.featured_image && (
              <div className="featured-image">
                <img src={post.featured_image} alt={post.title} />
              </div>
            )}

            <div 
              className="post-body"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />

            {featuredMemes.length > 0 && (
              <div className="featured-memes">
                <h3>Featured Memes</h3>
                <div className="memes-grid">
                  {featuredMemes.map(meme => (
                    <Link key={meme.id} href={`/meme/${meme.id}`}>
                      <a className="meme-card">
                        <img src={meme.image_url} alt={meme.topic || 'PUMPIT meme'} />
                        <p>{meme.topic || `Meme #${meme.id}`}</p>
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="post-footer">
              <div className="cta-section">
                <h3>Create Your Own PUMPIT Meme!</h3>
                <p>Join thousands creating viral memes daily</p>
                <div className="cta-buttons">
                  <Link href="/#generator">
                    <a className="cta-button primary">Web Generator</a>
                  </Link>
                  <a href="https://t.me/pumpermemebot" target="_blank" className="cta-button secondary">
                    Telegram Bot
                  </a>
                </div>
              </div>

              <div className="share-section">
                <h4>Share this post:</h4>
                <div className="share-buttons">
                  <a 
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://letspumpit.com/blog/${post.slug}`)}`}
                    target="_blank"
                    rel="noopener"
                    className="share-btn twitter"
                  >
                    Share on X
                  </a>
                  <a 
                    href={`https://t.me/share/url?url=${encodeURIComponent(`https://letspumpit.com/blog/${post.slug}`)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener"
                    className="share-btn telegram"
                  >
                    Share on Telegram
                  </a>
                </div>
              </div>
            </div>
          </article>

          <aside className="sidebar">
            <div className="sidebar-section">
              <h3>Join the Movement</h3>
              <a href="https://jup.ag/swap/SOL-PUMPIT" target="_blank" className="buy-button">
                🚀 Buy $PUMPIT
              </a>
              <p className="contract">CA: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk</p>
            </div>

            {relatedPosts.length > 0 && (
              <div className="sidebar-section">
                <h3>Recent Posts</h3>
                <div className="related-posts">
                  {relatedPosts.map(related => (
                    <Link key={related.id} href={`/blog/${related.slug}`}>
                      <a className="related-post">
                        <h4>{related.title}</h4>
                        <p>{related.excerpt}</p>
                        <time>{new Date(related.created_at).toLocaleDateString()}</time>
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="sidebar-section">
              <h3>Connect</h3>
              <div className="social-links">
                <a href="https://twitter.com/pumpitonsol" target="_blank">Twitter</a>
                <a href="https://t.me/Pumpetcto" target="_blank">Telegram</a>
                <a href="https://t.me/pumpermemebot" target="_blank">Meme Bot</a>
              </div>
            </div>
          </aside>
        </main>
      </div>

      <style jsx>{`
        .blog-post-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
        }

        .error-container {
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
        }

        .blog-header {
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

        nav {
          display: flex;
          gap: 2rem;
        }

        nav a {
          color: #fff;
          text-decoration: none;
          transition: color 0.3s;
        }

        nav a:hover {
          color: #FFFF00;
        }

        .post-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 2rem;
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 3rem;
        }

        .post-content {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          color: #999;
        }

        .back-link {
          color: #FFFF00;
          text-decoration: none;
          transition: opacity 0.3s;
        }

        .back-link:hover {
          opacity: 0.8;
        }

        h1 {
          font-size: 2.5rem;
          line-height: 1.2;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .featured-image {
          margin-bottom: 2rem;
          border-radius: 10px;
          overflow: hidden;
        }

        .featured-image img {
          width: 100%;
          height: auto;
        }

        .post-body {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #e0e0e0;
        }

        .post-body :global(p) {
          margin-bottom: 1.5rem;
        }

        .post-body :global(h3) {
          font-size: 1.6rem;
          color: #FFFF00;
          margin: 2rem 0 1rem;
        }

        .post-body :global(ul),
        .post-body :global(ol) {
          margin-bottom: 1.5rem;
          padding-left: 2rem;
        }

        .post-body :global(li) {
          margin-bottom: 0.5rem;
        }

        .post-body :global(a) {
          color: #FFFF00;
          text-decoration: none;
          border-bottom: 1px solid rgba(255, 255, 0, 0.3);
        }

        .post-body :global(a:hover) {
          border-bottom-color: #FFFF00;
        }

        .post-body :global(strong) {
          color: #fff;
          font-weight: 600;
        }

        .featured-memes {
          margin: 3rem 0;
          padding: 2rem;
          background: rgba(255, 255, 0, 0.05);
          border-radius: 10px;
        }

        .featured-memes h3 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
        }

        .memes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .meme-card {
          display: block;
          text-decoration: none;
          transition: transform 0.3s;
        }

        .meme-card:hover {
          transform: scale(1.05);
        }

        .meme-card img {
          width: 100%;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .meme-card p {
          color: #ccc;
          font-size: 0.9rem;
          text-align: center;
        }

        .post-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cta-section {
          background: rgba(255, 255, 0, 0.05);
          padding: 2rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 2rem;
        }

        .cta-section h3 {
          color: #FFFF00;
          margin-bottom: 0.5rem;
        }

        .cta-section p {
          color: #ccc;
          margin-bottom: 1.5rem;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .cta-button {
          padding: 0.8rem 2rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: bold;
          transition: all 0.3s;
        }

        .cta-button.primary {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: #000;
        }

        .cta-button.secondary {
          background: #0088cc;
          color: #fff;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 255, 0, 0.3);
        }

        .share-section h4 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .share-buttons {
          display: flex;
          gap: 1rem;
        }

        .share-btn {
          padding: 0.6rem 1.5rem;
          border-radius: 25px;
          text-decoration: none;
          color: #fff;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .share-btn.twitter {
          background: #1DA1F2;
        }

        .share-btn.telegram {
          background: #0088cc;
        }

        .share-btn:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }

        .sidebar {
          position: sticky;
          top: 2rem;
          height: fit-content;
        }

        .sidebar-section {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sidebar-section h3 {
          color: #FFFF00;
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }

        .buy-button {
          display: block;
          text-align: center;
          padding: 1rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: #000;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          margin-bottom: 1rem;
          transition: all 0.3s;
        }

        .buy-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 255, 0, 0.3);
        }

        .contract {
          font-size: 0.8rem;
          color: #666;
          word-break: break-all;
          font-family: monospace;
        }

        .related-posts {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .related-post {
          display: block;
          text-decoration: none;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          transition: all 0.3s;
        }

        .related-post:hover {
          background: rgba(255, 255, 0, 0.05);
        }

        .related-post h4 {
          color: #FFFF00;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .related-post p {
          color: #999;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .related-post time {
          color: #666;
          font-size: 0.8rem;
        }

        .social-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .social-links a {
          color: #ccc;
          text-decoration: none;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
          text-align: center;
          transition: all 0.3s;
        }

        .social-links a:hover {
          background: rgba(255, 255, 0, 0.1);
          color: #FFFF00;
        }

        @media (max-width: 768px) {
          .blog-header {
            flex-direction: column;
            gap: 1rem;
          }

          nav {
            flex-wrap: wrap;
            justify-content: center;
          }

          .post-container {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 2rem;
          }

          .cta-buttons {
            flex-direction: column;
          }

          .share-buttons {
            flex-direction: column;
          }

          .sidebar {
            position: static;
          }
        }
      `}</style>
    </>
  );
}