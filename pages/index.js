import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('/pumper.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [tokenPrice, setTokenPrice] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [xHandle, setXHandle] = useState('');
  const [showXForm, setShowXForm] = useState(false);
  const [communityMemes, setCommunityMemes] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    vision: false,
    about: false
  });
  const [jupiterLoaded, setJupiterLoaded] = useState(false);
  
  // New states for draggable overlays
  const [showOverlays, setShowOverlays] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Separate springs for each overlay with initial positions
  const [{ lipX, lipY, lipScale, lipRotation }, lipApi] = useSpring(() => ({
    lipX: 0,
    lipY: 0,
    lipScale: 1,
    lipRotation: 0,
    config: { tension: 200, friction: 30 }
  }));
  
  const [{ excX, excY, excScale, excRotation }, excApi] = useSpring(() => ({
    excX: 0,
    excY: 0,
    excScale: 1,
    excRotation: 0,
    config: { tension: 200, friction: 30 }
  }));
  
  // Refs for overlay bounds
  const containerRef = useRef(null);
  const lipRef = useRef(null);
  const exclamationRef = useRef(null);
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);

  // Gesture handlers for lips
  const bindLip = useGesture({
    onDrag: ({ movement: [mx, my], active }) => {
      lipApi.start({ 
        lipX: mx, 
        lipY: my,
        immediate: active
      });
      setIsDragging(active);
    },
    onPinch: ({ offset: [s], da: [distance, angle] }) => {
      lipApi.start({
        lipScale: s,
        lipRotation: angle
      });
    },
    onWheel: ({ event, delta: [, dy] }) => {
      event.preventDefault();
      lipApi.start({
        lipScale: Math.max(0.5, Math.min(3, lipScale.get() - dy * 0.001))
      });
    }
  }, {
    target: lipRef,
    drag: { 
      from: () => [lipX.get(), lipY.get()],
      bounds: containerRef
    },
    pinch: { 
      scaleBounds: { min: 0.5, max: 3 },
      rubberband: true 
    }
  });

  // Gesture handlers for exclamation
  const bindExclamation = useGesture({
    onDrag: ({ movement: [mx, my], active }) => {
      excApi.start({ 
        excX: mx, 
        excY: my,
        immediate: active
      });
      setIsDragging(active);
    },
    onPinch: ({ offset: [s], da: [distance, angle] }) => {
      excApi.start({
        excScale: s,
        excRotation: angle
      });
    },
    onWheel: ({ event, delta: [, dy] }) => {
      event.preventDefault();
      excApi.start({
        excScale: Math.max(0.5, Math.min(3, excScale.get() - dy * 0.001))
      });
    }
  }, {
    target: exclamationRef,
    drag: { 
      from: () => [excX.get(), excY.get()],
      bounds: containerRef
    },
    pinch: { 
      scaleBounds: { min: 0.5, max: 3 },
      rubberband: true 
    }
  });

  useEffect(() => {
    const checkJupiter = setInterval(() => {
      if (window.Jupiter) {
        setJupiterLoaded(true);
        clearInterval(checkJupiter);
      }
    }, 100);
    return () => clearInterval(checkJupiter);
  }, []);

  useEffect(() => {
    if (window.Jupiter && walletAddress) {
      window.Jupiter.init({
        displayMode: 'integrated',
        integratedTargetId: 'integrated-terminal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        formProps: {
          initialInputMint: 'So11111111111111111111111111111111111111112',
          initialOutputMint: 'B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk',
          fixedInputMint: false,
          fixedOutputMint: true,
        },
      });
    }
  }, [walletAddress]);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setIsLoadingPrice(true);
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/GWp5365zCuwbPRWnMRCaQp9bEcTjf6xTZa4HKDPbasFK');
        const data = await response.json();
        
        if (data.pair) {
          const pair = data.pair;
          setTokenPrice(parseFloat(pair.priceUsd));
          setPriceChange24h(pair.priceChange.h24);
          setTokenData({
            marketCap: pair.fdv,
            volume24h: pair.volume.h24,
            liquidity: pair.liquidity.usd,
            holders: pair.txns.h24.buys + pair.txns.h24.sells
          });
        }
      } catch (error) {
        console.error('Error fetching token data:', error);
        setTokenPrice(0.000042);
        setPriceChange24h(15.7);
        setTokenData({
          marketCap: 42000,
          volume24h: 8500,
          holders: 150,
          liquidity: 25000
        });
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchTokenData();
    const interval = setInterval(fetchTokenData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply gesture bindings after overlays are shown
  useEffect(() => {
    if (showOverlays && lipRef.current && exclamationRef.current) {
      bindLip();
      bindExclamation();
    }
  }, [showOverlays]);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.solana) {
      try {
        const response = await window.solana.connect();
        setWalletAddress(response.publicKey.toString());
      } catch (error) {
        console.error('Wallet connection failed:', error);
        setError('Failed to connect wallet');
      }
    } else {
      setError('Please install a Solana wallet');
    }
  };

  const handleBuyClick = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    
    window.open('https://jup.ag', '_blank');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Modern drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect({ target: { files } });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');
    setGeneratedMeme(null);
    setShowOverlays(false);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    if (!xHandle) {
      setShowXForm(true);
    }
  };

  const handleXHandleSubmit = (e) => {
    e.preventDefault();
    if (xHandle && xHandle.trim()) {
      setShowXForm(false);
    }
  };

  const generateMeme = async () => {
    if (!selectedFile) {
      setError('Please select an image first!');
      return;
    }

    if (!xHandle) {
      setShowXForm(true);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Try Gemini detection
      console.log('🤖 Attempting Gemini AI detection...');
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl
        })
      });

      let positionData = null;
      
      if (response.ok) {
        positionData = await response.json();
      }

      // Default positions if AI fails
      if (!positionData || !positionData.faces || positionData.faces.length === 0) {
        console.log('Using default center positions');
        positionData = {
          faces: [{
            mouthPosition: { centerX: 0.5, centerY: 0.6 },
            exclamationPosition: { centerX: 0.5, centerY: 0.3 },
            faceSize: 0.3
          }]
        };
      }

      // Get container dimensions
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const face = positionData.faces[0];
        
        // Position overlays based on AI or defaults
        const lipX = (face.mouthPosition.centerX - 0.5) * rect.width;
        const lipY = (face.mouthPosition.centerY - 0.5) * rect.height;
        const exclamationX = (face.exclamationPosition.centerX - 0.5) * rect.width;
        const exclamationY = (face.exclamationPosition.centerY - 0.5) * rect.height;
        
        // Reset to initial positions
        lipApi.start({ lipX: 0, lipY: 0, lipScale: 1, lipRotation: 0 });
        excApi.start({ excX: 0, excY: 0, excScale: 1, excRotation: 0 });
        
        // Then animate to detected positions
        setTimeout(() => {
          lipApi.start({ lipX, lipY });
          excApi.start({ excX: exclamationX, excY: exclamationY });
        }, 100);
      }

      setShowOverlays(true);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Meme generation failed:', error);
      setError(`Meme generation failed: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const downloadMeme = async () => {
    if (!selectedFile || !showOverlays) return;
    
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load base image
      const img = new Image();
      img.src = preview;
      await new Promise(resolve => img.onload = resolve);
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Load overlay images
      const [lipImage, exclamationImage] = await Promise.all([
        loadImage('/meme-assets/lips.png'),
        loadImage('/meme-assets/exclamation.png')
      ]);
      
      // Get current positions and transforms
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // Calculate relative positions
      const scaleX = img.width / containerRect.width;
      const scaleY = img.height / containerRect.height;
      
      // Draw lips
      ctx.save();
      const lipCenterX = (containerRect.width / 2 + lipX.get()) * scaleX;
      const lipCenterY = (containerRect.height / 2 + lipY.get()) * scaleY;
      ctx.translate(lipCenterX, lipCenterY);
      ctx.rotate(lipRotation.get() * Math.PI / 180);
      ctx.scale(lipScale.get(), lipScale.get());
      ctx.drawImage(
        lipImage,
        -lipImage.width / 2,
        -lipImage.height / 2
      );
      ctx.restore();
      
      // Draw exclamation
      ctx.save();
      const exclamationCenterX = (containerRect.width / 2 + excX.get()) * scaleX;
      const exclamationCenterY = (containerRect.height / 2 + excY.get()) * scaleY;
      ctx.translate(exclamationCenterX, exclamationCenterY);
      ctx.rotate(excRotation.get() * Math.PI / 180);
      ctx.scale(excScale.get(), excScale.get());
      ctx.drawImage(
        exclamationImage,
        -exclamationImage.width / 2,
        -exclamationImage.height / 2
      );
      ctx.restore();
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pumpit-meme-${Date.now()}.png`;
        a.click();
        
        // Save to community memes
        setCommunityMemes(prev => [{
          url: url,
          creator: xHandle,
          timestamp: Date.now()
        }, ...prev].slice(0, 6));
        
        setGeneratedMeme(url);
      }, 'image/png');
      
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download meme');
    }
  };

  // Helper function to load images
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  return (
    <>
      <Head>
        <title>PumpItOnSol - AI-Powered Meme Generator</title>
        <meta name="description" content="Transform any photo into $PUMPIT memes!" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://terminal.jup.ag/main-v2.js" data-preload></script>
      </Head>

      <div className="desktop-social-buttons">
        <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer" className="social-button">
          🐦 X
        </a>
        <a href="https://www.tiktok.com/@pumper.the.pumpit" target="_blank" rel="noopener noreferrer" className="social-button">
          🎵 TikTok
        </a>
        <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer" className="social-button">
          💬 Telegram
        </a>
        {walletAddress ? (
          <button className="social-button wallet-button">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </button>
        ) : (
          <button onClick={connectWallet} className="social-button wallet-button">
            Connect Wallet
          </button>
        )}
        <button 
          onClick={handleBuyClick}
          className="social-button buy-button"
        >
          🚀 Buy $PUMPIT
        </button>
      </div>

      <div className="mobile-top-buttons">
        {walletAddress ? (
          <button className="social-button wallet-button">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </button>
        ) : (
          <button onClick={connectWallet} className="social-button wallet-button">
            Connect Wallet
          </button>
        )}
        <button 
          onClick={handleBuyClick}
          className="social-button buy-button"
        >
          🚀 Buy $PUMPIT
        </button>
      </div>

      <div className="container">
        <header>
          <div className="pumper-float">
            <img src="/pumper.png" alt="Pumper - PumpItOnSol Mascot" />
          </div>
          <div className="header-content">
            <h1>$PUMPIT</h1>
            <p>Solana's most recognized meme</p>
            <div className="mobile-social-icons">
              <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer" title="X/Twitter">
                🐦
              </a>
              <a href="https://www.tiktok.com/@pumper.the.pumpit" target="_blank" rel="noopener noreferrer" title="TikTok">
                🎵
              </a>
              <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer" title="Telegram">
                💬
              </a>
            </div>
          </div>
        </header>

        <nav className="main-nav">
          <div className="nav-container">
            <a href="#vision">Vision</a>
            <a href="#token-info">Token</a>
            <a href="#about">About</a>
            <a href="#generator">Generate</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#social">Social</a>
          </div>
        </nav>

        <main>
          <section id="vision" className="reveal">
            <h2>Our Vision</h2>
            <div className={`expandable-content ${expandedSections.vision ? 'expanded' : ''}`}>
              <p className="preview-text">
                <strong>$PUMPIT. Created with one purpose: to become the most recognized meme on Solana.</strong>
                {!expandedSections.vision && '...'}
              </p>
              {expandedSections.vision && (
                <div className="full-content">
                  <p>
                    Launched on Bonk, $PUMPIT is focused on real growth. Pumper has the ability to adapt — 
                    changing his face to support other strong tokens and communities he believes are the best ones to be in.
                  </p>
                </div>
              )}
              <button onClick={() => toggleSection('vision')} className="read-more-btn">
                {expandedSections.vision ? 'Show Less' : 'Read More'}
              </button>
            </div>
            
            <div className="token-stats">
              <h3>📊 Token Stats</h3>
              <p>Contract Address: B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk</p>
              <p>Total Supply: 1,000,000,000 $PUMPIT</p>
              <a 
                href="https://letsbonk.fun/token/B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="token-link"
              >
                View on LetsBonk.fun →
              </a>
            </div>
          </section>

          <section id="token-info" className="reveal token-info-section">
            <h2>💎 $PUMPIT Live Data</h2>
            <div className="token-grid">
              <div className="token-card">
                <h4>Price</h4>
                {isLoadingPrice ? (
                  <p className="loading">Loading...</p>
                ) : (
                  <>
                    <p className="price">${tokenPrice?.toFixed(6) || '0.000000'}</p>
                    <p className={`price-change ${priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                      {priceChange24h >= 0 ? '+' : ''}{priceChange24h?.toFixed(2)}% (24h)
                    </p>
                  </>
                )}
              </div>
              
              <div className="token-card">
                <h4>Market Cap</h4>
                <p className="value">
                  ${tokenData?.marketCap?.toLocaleString() || '0'}
                </p>
              </div>
              
              <div className="token-card">
                <h4>24h Volume</h4>
                <p className="value">
                  ${tokenData?.volume24h?.toLocaleString() || '0'}
                </p>
              </div>
              
              <div className="token-card">
                <h4>Liquidity</h4>
                <p className="value">
                  ${tokenData?.liquidity?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            
            <div className="buy-section">
              <button 
                onClick={handleBuyClick}
                className="buy-button-large"
              >
                🚀 Buy $PUMPIT Now
              </button>
              <p className="buy-info">
                Buy directly with SOL using Jupiter DEX aggregator
              </p>
            </div>
          </section>

          <section id="about" className="reveal">
            <h2>About Us</h2>
            <div className={`expandable-content ${expandedSections.about ? 'expanded' : ''}`}>
              <p className="preview-text">
                <strong>Yes — $PUMPIT faced setbacks before. We've been rugged. Not once, but twice.</strong>
                {!expandedSections.about && '...'}
              </p>
              {expandedSections.about && (
                <div className="full-content">
                  <p>
                    But here's the difference: We learn. We adapt. We grow. To take $PUMPIT to the next level, 
                    we've made key updates to our meme identity. Originally, the project was linked to an old meme format. 
                    But in order to grow and collaborate with bigger communities, we needed a fresh, clear look — 
                    without using anyone's real face or risking ownership issues.
                  </p>
                  <p>
                    Now meet <strong>Pumper</strong> — the official face of $PUMPIT. From now on, $PUMPIT's official meme template includes:
                  </p>
                  <ul>
                    <li>The same suit, phone, and oversized lips</li>
                    <li>Exclamation marks — because we support bonk.fun and its ecosystem</li>
                    <li>The face changes — replaced by the popular tokens we support</li>
                  </ul>
                  <p>
                    Pumper represents not just $PUMPIT, but the entire community: A clean, recognizable identity 
                    that can feature any token while staying true to our roots.
                  </p>
                  <p>
                    <strong>Why?</strong> Because we're not just building a token — we're building connections. 
                    By adapting the face, we connect with other communities while keeping our own brand locked in. 
                    Every time we feature a token, we advertise for both $PUMPIT and them. More exposure. 
                    More partnerships. Bigger growth.
                  </p>
                  <p>
                    And most importantly: We're working for you — the community. Those who believed in us, 
                    the CTO leaders. We're here to make this a successful adventure — and as fun as possible. 
                    This community is only the beginning. <strong>Thank you all for believing, supporting, 
                    and pushing $PUMPIT forward.</strong>
                  </p>
                </div>
              )}
              <button onClick={() => toggleSection('about')} className="read-more-btn">
                {expandedSections.about ? 'Show Less' : 'Read More'}
              </button>
            </div>
          </section>

          <section id="generator" className="reveal">
            <h2>🎨 AI-Powered Meme Generator</h2>
            <p>
              Transform any image into a $PUMPIT meme! Just upload, position the overlays, and download!
            </p>
            
            {showXForm && (
              <div className="x-form-modal">
                <form onSubmit={handleXHandleSubmit} className="x-form">
                  <h3>Enter your X handle to continue</h3>
                  <input
                    type="text"
                    placeholder="@yourhandle"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    required
                  />
                  <button type="submit">Continue</button>
                </form>
              </div>
            )}
            
            {!xHandle && (
              <div className="x-handle-section">
                <form onSubmit={handleXHandleSubmit} className="x-handle-inline-form">
                  <label>Enter your X handle to get started:</label>
                  <div className="x-handle-input-group">
                    <input
                      type="text"
                      placeholder="@yourhandle"
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                      required
                    />
                    <button type="submit">Set Handle</button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="meme-upload">
              <div 
                className={`modern-upload-zone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && document.getElementById('memeImage').click()}
              >
                <input 
                  type="file" 
                  id="memeImage" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                {!selectedFile ? (
                  <div className="upload-content">
                    <div className="upload-icon">📸</div>
                    <h3>Drop your image here</h3>
                    <p>or click to browse</p>
                    <div className="supported-formats">
                      JPG, PNG, GIF up to 10MB
                    </div>
                  </div>
                ) : (
                  <div className="preview-container" ref={containerRef}>
                    <img src={preview} alt="Preview" className="preview-image" />
                    
                    {showOverlays && (
                      <>
                        <animated.div
                          ref={lipRef}
                          className={`overlay-element ${isDragging ? 'dragging' : ''}`}
                          style={{
                            transform: lipX.to((x) => `translate(${x}px, ${lipY.get()}px) scale(${lipScale.get()}) rotate(${lipRotation.get()}deg)`),
                          }}
                        >
                          <img src="/meme-assets/lips.png" alt="Lips" draggable={false} />
                        </animated.div>
                        
                        <animated.div
                          ref={exclamationRef}
                          className={`overlay-element ${isDragging ? 'dragging' : ''}`}
                          style={{
                            transform: excX.to((x) => `translate(${x}px, ${excY.get()}px) scale(${excScale.get()}) rotate(${excRotation.get()}deg)`),
                          }}
                        >
                          <img src="/meme-assets/exclamation.png" alt="Exclamation" draggable={false} />
                        </animated.div>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {selectedFile && (
                <div className="action-buttons">
                  <button 
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview('/pumper.png');
                      setShowOverlays(false);
                      setGeneratedMeme(null);
                    }}
                    className="secondary-button"
                  >
                    🔄 Change Image
                  </button>
                  
                  {!showOverlays ? (
                    <button 
                      onClick={generateMeme}
                      disabled={isProcessing || !xHandle}
                      className="primary-button"
                    >
                      {isProcessing ? '🎨 Processing...' : '✨ Generate Meme'}
                    </button>
                  ) : (
                    <button 
                      onClick={downloadMeme}
                      className="download-button"
                    >
                      💾 Download Meme
                    </button>
                  )}
                </div>
              )}
              
              {showOverlays && (
                <div className="gesture-hints">
                  <p>✋ Drag to move • 🤏 Pinch to resize • 🔄 Twist to rotate • 🖱️ Scroll to resize</p>
                </div>
              )}
              
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </section>

          <section id="roadmap" className="reveal">
            <h2>🗺️ Roadmap</h2>
            <ul>
              <li>✅ Phase 1: Launch $PUMPIT on Bonk.fun with meme identity + Pumper reveal</li>
              <li>✅ Phase 2: AI meme generator with smooth drag & drop editing</li>
              <li>📋 Phase 3: Collaborate with top meme communities</li>
              <li>📋 Phase 4: Community meme automation & viral campaigns</li>
              <li>📚 Phase 5: Pumper Comic Series - Exclusive stories for $PUMPIT holders!</li>
            </ul>
          </section>

          <section id="community" className="reveal">
            <h2>🔥 Latest Community Memes</h2>
            <div className="community-memes">
              {communityMemes.length > 0 ? (
                communityMemes.map((meme, index) => (
                  <div key={index} className="meme-card">
                    <img src={meme.url} alt={`Community Meme ${index + 1}`} />
                    <p>Created by {meme.creator}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="meme-card placeholder">
                    <div className="placeholder-content">
                      <p>🎨 Be the first to create a meme!</p>
                    </div>
                  </div>
                  <div className="meme-card placeholder">
                    <div className="placeholder-content">
                      <p>🚀 Your meme here</p>
                    </div>
                  </div>
                  <div className="meme-card placeholder">
                    <div className="placeholder-content">
                      <p>💎 Join the revolution!</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <section id="social" className="reveal">
            <h2>🌐 Join the $PUMPIT Community</h2>
            <div className="social-grid">
              <div className="social-card">
                <h3>🐦 Latest from X/Twitter</h3>
                <div className="twitter-embed">
                  <a 
                    className="twitter-timeline" 
                    data-height="400"
                    data-theme="dark"
                    href="https://twitter.com/pumpitonsol?ref_src=twsrc%5Etfw"
                  >
                    Tweets by @pumpitonsol
                  </a>
                  <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>
                </div>
              </div>
              
              <div className="social-card">
                <h3>💬 Community Updates</h3>
                <div className="community-links">
                  <a 
                    href="https://t.me/Pumpetcto" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="community-button telegram"
                  >
                    <span className="icon">💬</span>
                    <div>
                      <strong>Telegram Community</strong>
                      <p>Join our active Telegram group</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://www.tiktok.com/@pumper.the.pumpit" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="community-button tiktok"
                  >
                    <span className="icon">🎵</span>
                    <div>
                      <strong>TikTok Videos</strong>
                      <p>Watch Pumper's latest content</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://x.com/pumpitonsol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="community-button twitter"
                  >
                    <span className="icon">🐦</span>
                    <div>
                      <strong>X / Twitter</strong>
                      <p>Follow for real-time updates</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer>
          <p>© 2025 PumpItOnSol. Powered by smooth gesture controls. 🎨🚀</p>
        </footer>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: #0a0a0a;
          color: #ffffff;
          min-height: 100vh;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }

        body::before {
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

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          width: 100%;
          position: relative;
          z-index: 2;
        }

        .desktop-social-buttons {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 0.75rem;
          z-index: 1000;
          flex-wrap: wrap;
          max-width: calc(100vw - 40px);
        }

        .mobile-top-buttons {
          display: none;
          position: fixed;
          top: 10px;
          right: 10px;
          gap: 0.5rem;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.8);
          padding: 0.5rem;
          border-radius: 30px;
          backdrop-filter: blur(10px);
        }

        .mobile-social-icons {
          display: none;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 1.5rem;
        }

        .mobile-social-icons a {
          text-decoration: none;
          transition: transform 0.3s ease;
        }

        .mobile-social-icons a:hover {
          transform: scale(1.2);
        }

        .social-button {
          padding: 0.6rem 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50px;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          font-size: 0.9rem;
          white-space: nowrap;
          cursor: pointer;
          font-weight: 500;
        }

        .social-button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .social-button.buy-button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          font-weight: bold;
          border: none;
        }

        .social-button.buy-button:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.5);
        }

        .social-button.wallet-button {
          background: rgba(255, 255, 0, 0.1);
          border-color: rgba(255, 255, 0, 0.3);
        }

        header {
          text-align: center;
          padding: 5rem 1rem 3rem;
          position: relative;
          overflow: hidden;
          margin-top: 80px;
        }

        .header-content {
          position: relative;
          z-index: 2;
        }

        .pumper-float {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          filter: blur(1px);
          z-index: 0;
        }

        .pumper-float img {
          width: 400px;
          height: 400px;
        }

        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-20px); }
        }

        h1 {
          font-size: 4rem;
          font-weight: 900;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
          letter-spacing: -2px;
        }

        .main-nav {
          position: sticky;
          top: 0;
          z-index: 99;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          padding: 1rem 0;
          margin: 0 0 3rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-container {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .main-nav a {
          color: #ffffff;
          text-decoration: none;
          padding: 0.5rem 1.5rem;
          transition: all 0.3s ease;
          border-radius: 25px;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .main-nav a:hover {
          background: rgba(255, 255, 0, 0.1);
          transform: translateY(-2px);
        }

        section {
          margin: 4rem auto;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        h2 {
          font-size: 2.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 800;
        }

        .expandable-content {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .preview-text {
          margin-bottom: 1rem;
          line-height: 1.8;
        }

        .full-content {
          animation: fadeIn 0.5s ease;
          line-height: 1.8;
        }

        .full-content ul {
          margin: 1rem 0 1rem 2rem;
        }

        .full-content li {
          margin: 0.5rem 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .read-more-btn {
          background: none;
          border: 2px solid #FFFF00;
          color: #FFFF00;
          padding: 0.6rem 1.5rem;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          margin-top: 1rem;
        }

        .read-more-btn:hover {
          background: #FFFF00;
          color: black;
          transform: scale(1.05);
        }

        .token-stats {
          background: rgba(255, 255, 0, 0.05);
          padding: 2rem;
          border-radius: 15px;
          margin-top: 2rem;
          border: 1px solid rgba(255, 255, 0, 0.2);
        }

        .token-stats h3 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .token-stats p {
          margin: 0.75rem 0;
          font-family: 'Courier New', monospace;
          word-break: break-all;
          opacity: 0.9;
        }

        .token-info-section {
          background: linear-gradient(135deg, rgba(255, 255, 0, 0.03), rgba(255, 215, 0, 0.03));
          border: 1px solid rgba(255, 255, 0, 0.1);
        }

        .token-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .token-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 0, 0.2);
          border-radius: 15px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .token-card:hover {
          transform: translateY(-5px);
          border-color: #FFFF00;
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.2);
        }

        .token-card h4 {
          color: #FFFF00;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .token-card .price {
          font-size: 1.8rem;
          font-weight: bold;
          color: #ffffff;
          margin: 0.5rem 0;
        }

        .token-card .value {
          font-size: 1.4rem;
          font-weight: bold;
          color: #ffffff;
        }

        .price-change {
          font-size: 1rem;
          font-weight: 600;
        }

        .price-change.positive {
          color: #00ff00;
        }

        .price-change.negative {
          color: #ff3333;
        }

        .loading {
          color: #666;
          font-style: italic;
        }

        .buy-section {
          text-align: center;
          margin-top: 3rem;
        }

        .buy-button-large {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1.2rem 3rem;
          font-size: 1.2rem;
          font-weight: bold;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.3);
        }

        .buy-button-large:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 15px 40px rgba(255, 255, 0, 0.5);
        }

        .buy-info {
          color: #999;
          margin-top: 1rem;
          font-size: 0.9rem;
        }

        .token-link {
          display: inline-block;
          margin-top: 1rem;
          color: #FFFF00;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .token-link:hover {
          color: #FFD700;
          text-decoration: underline;
        }

        .x-form-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(10px);
        }

        .x-form {
          background: rgba(20, 20, 20, 0.95);
          padding: 3rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 0, 0.3);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }

        .x-form h3 {
          color: #FFFF00;
          margin-bottom: 2rem;
          font-size: 1.5rem;
        }

        .x-form input {
          width: 100%;
          padding: 1rem;
          margin-bottom: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 0, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }

        .x-form input:focus {
          outline: none;
          border-color: #FFFF00;
          box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.2);
        }

        .x-form button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2.5rem;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        .x-form button:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        .x-handle-section {
          background: rgba(255, 255, 0, 0.05);
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 0, 0.2);
        }

        .x-handle-inline-form label {
          display: block;
          margin-bottom: 1rem;
          color: #FFFF00;
          font-weight: 600;
        }

        .x-handle-input-group {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .x-handle-input-group input {
          flex: 1;
          padding: 0.8rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 0, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }

        .x-handle-input-group input:focus {
          outline: none;
          border-color: #FFFF00;
          box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.2);
        }

        .x-handle-input-group button {
          padding: 0.8rem 2rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .x-handle-input-group button:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(255, 255, 0, 0.4);
        }

        .meme-upload {
          margin-top: 2rem;
        }

        .modern-upload-zone {
          width: 100%;
          min-height: 500px;
          border: 2px dashed rgba(255, 255, 0, 0.3);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
        }

        .modern-upload-zone:hover {
          border-color: rgba(255, 255, 0, 0.5);
          background: rgba(255, 255, 0, 0.05);
        }

        .modern-upload-zone.drag-over {
          border-color: #FFFF00;
          background: rgba(255, 255, 0, 0.1);
          transform: scale(1.02);
        }

        .modern-upload-zone.has-file {
          cursor: default;
          border-style: solid;
        }

        .upload-content {
          text-align: center;
          padding: 3rem;
        }

        .upload-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .upload-content h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #FFFF00;
        }

        .upload-content p {
          color: #999;
          margin-bottom: 1rem;
        }

        .supported-formats {
          font-size: 0.85rem;
          color: #666;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          display: inline-block;
        }

        .preview-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-image {
          max-width: 100%;
          max-height: 500px;
          border-radius: 10px;
        }

        .overlay-element {
          position: absolute;
          cursor: grab;
          touch-action: none;
          user-select: none;
          transition: filter 0.2s ease;
          transform-origin: center;
          left: 50%;
          top: 50%;
        }

        .overlay-element:active {
          cursor: grabbing;
        }

        .overlay-element.dragging {
          filter: drop-shadow(0 10px 30px rgba(255, 255, 0, 0.5));
        }

        .overlay-element img {
          width: 120px;
          height: auto;
          pointer-events: none;
          display: block;
          transform: translate(-50%, -50%);
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .primary-button, .secondary-button, .download-button {
          padding: 1rem 2rem;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          font-size: 1rem;
        }

        .primary-button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        .secondary-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .download-button {
          background: linear-gradient(135deg, #00FF00, #00CC00);
          color: white;
        }

        .download-button:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(0, 255, 0, 0.4);
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .gesture-hints {
          text-align: center;
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 0, 0.05);
          border-radius: 10px;
          font-size: 0.9rem;
          color: #FFFF00;
        }

        .error-message {
          background: rgba(255, 0, 0, 0.1);
          color: #ff6666;
          padding: 1rem;
          border-radius: 10px;
          margin-top: 1rem;
          border: 1px solid rgba(255, 0, 0, 0.3);
          text-align: center;
        }

        #roadmap ul {
          list-style: none;
          padding-left: 0;
        }

        #roadmap li {
          padding: 1.5rem;
          margin: 1rem 0;
          background: rgba(255, 255, 255, 0.03);
          border-left: 4px solid #FFFF00;
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        #roadmap li:hover {
          transform: translateX(10px);
          background: rgba(255, 255, 0, 0.05);
        }

        .community-memes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .meme-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          overflow: hidden;
          transition: transform 0.3s ease;
          border: 1px solid rgba(255, 255, 0, 0.1);
        }

        .meme-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 0, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .meme-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .meme-card p {
          padding: 1rem;
          text-align: center;
          color: #FFFF00;
          margin: 0;
          font-weight: 500;
        }

        .meme-card.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 250px;
        }

        .placeholder-content {
          padding: 2rem;
          text-align: center;
        }

        .placeholder-content p {
          color: #666;
          font-size: 1.1rem;
        }

        .social-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .social-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 0, 0.1);
        }

        .social-card h3 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .twitter-embed {
          border-radius: 10px;
          overflow: hidden;
        }

        .community-links {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .community-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }

        .community-button:hover {
          transform: translateX(5px);
          background: rgba(255, 255, 255, 0.05);
          border-color: #FFFF00;
        }

        .community-button .icon {
          font-size: 2rem;
          min-width: 50px;
          text-align: center;
        }

        .community-button strong {
          display: block;
          margin-bottom: 0.3rem;
        }

        .community-button p {
          margin: 0;
          font-size: 0.9rem;
          color: #999;
        }

        .community-button.telegram:hover {
          border-color: #0088cc;
        }

        .community-button.tiktok:hover {
          border-color: #ff0050;
        }

        .community-button.twitter:hover {
          border-color: #1da1f2;
        }

        footer {
          text-align: center;
          padding: 3rem;
          background: rgba(0, 0, 0, 0.5);
          margin-top: 6rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        footer p {
          color: #666;
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          animation: revealAnimation 0.6s ease forwards;
        }

        @keyframes revealAnimation {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .desktop-social-buttons {
            display: none;
          }

          .mobile-top-buttons {
            display: flex;
          }

          .mobile-social-icons {
            display: flex;
            justify-content: center;
          }

          header {
            margin-top: 80px;
            padding-top: 3rem;
          }

          .pumper-float img {
            width: 250px;
            height: 250px;
          }

          h1 {
            font-size: 3rem;
          }

          h2 {
            font-size: 2rem;
          }

          .nav-container {
            gap: 1rem;
            padding: 0.5rem;
          }

          .main-nav a {
            padding: 0.4rem 1rem;
            font-size: 0.85rem;
          }

          section {
            padding: 2rem;
            margin: 2rem auto;
          }

          .token-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .token-card {
            padding: 1.5rem;
          }

          .token-card .price {
            font-size: 1.4rem;
          }

          .token-card .value {
            font-size: 1.1rem;
          }

          .x-handle-input-group {
            flex-direction: column;
          }

          .x-handle-input-group input,
          .x-handle-input-group button {
            width: 100%;
          }

          .overlay-element img {
            width: 80px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-buttons button {
            width: 100%;
          }

          .social-grid,
          .community-memes {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .mobile-top-buttons {
            right: 5px;
            top: 5px;
          }

          .social-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }

          h1 {
            font-size: 2.5rem;
          }

          .pumper-float img {
            width: 200px;
            height: 200px;
          }

          .token-grid {
            grid-template-columns: 1fr;
          }

          section {
            padding: 1.5rem;
          }

          .overlay-element img {
            width: 60px;
          }
        }
      `}</style>
    </>
  );
}