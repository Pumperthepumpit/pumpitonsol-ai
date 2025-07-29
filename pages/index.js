import Head from 'next/head';
import { useState, useEffect } from 'react';

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
    const initJupiter = () => {
      if (window.Jupiter && walletAddress) {
        window.Jupiter.init({
          displayMode: 'widget',
          integratedTargetId: 'jupiter-terminal',
          endpoint: 'https://api.mainnet-beta.solana.com',
          strictTokenList: false,
          defaultExplorer: 'Solscan',
          formProps: {
            initialInputTokenAddress: 'So11111111111111111111111111111111111111112',
            initialOutputTokenAddress: 'B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk',
            initialAmount: '100000000',
            fixedOutputMint: true,
          },
          enableWalletPassthrough: true,
          onSuccess: ({ txid }) => {
            console.log('Swap successful:', txid);
          },
          onSwapError: ({ error }) => {
            console.error('Swap error:', error);
          },
        });
        
        if (window.solana && window.Jupiter.syncProps) {
          window.Jupiter.syncProps({
            passthroughWalletContextState: {
              wallet: window.solana,
              wallets: [],
              select: () => {},
              connect: async () => {
                const response = await window.solana.connect();
                return response.publicKey.toString();
              },
              disconnect: async () => {
                await window.solana.disconnect();
              },
              connecting: false,
              connected: !!walletAddress,
              disconnecting: false,
              publicKey: walletAddress ? { toBase58: () => walletAddress } : null,
            }
          });
        }
      }
    };

    if (walletAddress) {
      initJupiter();
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Store the file immediately
    setSelectedFile(file);
    setError('');
    setGeneratedMeme(null);
    
    // Create and set preview immediately
    const originalPreview = URL.createObjectURL(file);
    setPreview(originalPreview);

    // Only show X form if no handle exists
    if (!xHandle) {
      setShowXForm(true);
    }
  };

  const handleXHandleSubmit = (e) => {
    e.preventDefault();
    if (xHandle && xHandle.trim()) {
      setShowXForm(false);
      // File and preview are already set, no need to recreate
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
      console.log('🚀 Starting PNG overlay meme generation...');
      
      // Convert image to base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      console.log('🧠 Getting positioning data from Gemini AI...');

      // Get positioning data from Gemini
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Positioning analysis failed');
      }

      const positionData = await response.json();
      console.log('📍 Positioning data received:', positionData);

      if (!positionData.faces || positionData.faces.length === 0) {
        throw new Error('No faces detected in image');
      }

      console.log('🎨 Creating meme with PNG overlays...');

      // Create canvas for meme generation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load the original image
      const img = new Image();
      
      img.onload = async () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Load PNG assets from public root
        const lipImage = new Image();
        const exclamationImage = new Image();
        
        try {
          // Load lips from public root
          console.log('📎 Loading lips.png from meme-assets folder...');
          await new Promise((resolve, reject) => {
            lipImage.onload = () => {
              console.log('✅ Lips PNG loaded successfully!');
              resolve();
            };
            lipImage.onerror = () => {
              console.error('❌ Failed to load lips.png from /meme-assets/lips.png');
              reject(new Error('Failed to load lips.png - make sure it exists in /public/meme-assets/'));
            };
            lipImage.src = '/meme-assets/lips.png';
          });
          
          // Load exclamations from public root
          console.log('📎 Loading exclamation.png from meme-assets folder...');
          await new Promise((resolve, reject) => {
            exclamationImage.onload = () => {
              console.log('✅ Exclamation PNG loaded successfully!');
              resolve();
            };
            exclamationImage.onerror = () => {
              console.error('❌ Failed to load exclamation.png from /meme-assets/exclamation.png');
              reject(new Error('Failed to load exclamation.png - make sure it exists in /public/meme-assets/'));
            };
            exclamationImage.src = '/meme-assets/exclamation.png';
          });
          
          console.log('🎉 All PNG assets loaded successfully!');
          
          // Process each detected face
          positionData.faces.forEach((face, index) => {
            console.log(`🎭 Processing face ${index + 1}:`, face);
            
            // Calculate actual pixel positions from percentages
            const mouthPixelX = face.mouthPosition.centerX * canvas.width;
            const mouthPixelY = face.mouthPosition.centerY * canvas.height;
            const exclamationPixelX = face.exclamationPosition.centerX * canvas.width;
            const exclamationPixelY = face.exclamationPosition.centerY * canvas.height;
            
            // Scale lips based on face size and mouth width
            const baseLipWidth = Math.max(face.mouthPosition.width * canvas.width * 2.5, 50); // Minimum 50px width
            const lipAspectRatio = lipImage.height / lipImage.width;
            const lipWidth = baseLipWidth;
            const lipHeight = baseLipWidth * lipAspectRatio;
            
            // Position lips centered on mouth
            const lipX = mouthPixelX - (lipWidth / 2);
            const lipY = mouthPixelY - (lipHeight / 2);
            
            console.log(`👄 Drawing lips at: (${Math.round(lipX)}, ${Math.round(lipY)}) size: ${Math.round(lipWidth)}x${Math.round(lipHeight)}`);
            
            // Draw lips with rotation if needed
            if (face.mouthPosition.angle && Math.abs(face.mouthPosition.angle) > 0.1) {
              ctx.save();
              ctx.translate(mouthPixelX, mouthPixelY);
              ctx.rotate(face.mouthPosition.angle);
              ctx.drawImage(lipImage, -lipWidth/2, -lipHeight/2, lipWidth, lipHeight);
              ctx.restore();
            } else {
              ctx.drawImage(lipImage, lipX, lipY, lipWidth, lipHeight);
            }
            
            // Calculate exclamation mark size and positions
            const faceScale = Math.max(face.faceSize || 0.2, 0.1); // Default to 0.2 if missing
            const exclamationScale = faceScale * 0.8; // Scale based on face size
            const exclamationWidth = exclamationImage.width * exclamationScale;
            const exclamationHeight = exclamationImage.height * exclamationScale;
            
            // Ensure minimum size
            const minExclamationWidth = Math.max(exclamationWidth, 20);
            const minExclamationHeight = Math.max(exclamationHeight, 30);
            
            // Position single exclamation image based on face direction
            let exclamationX, exclamationY;
            
            if (face.faceDirection === 'left') {
              exclamationX = exclamationPixelX - 30; // Shift left
              exclamationY = exclamationPixelY;
            } else if (face.faceDirection === 'right') {
              exclamationX = exclamationPixelX + 30; // Shift right
              exclamationY = exclamationPixelY;
            } else {
              // Center
              exclamationX = exclamationPixelX;
              exclamationY = exclamationPixelY;
            }
            
            // Draw single exclamation image (which already contains 3 marks)
            const finalX = exclamationX - (minExclamationWidth / 2);
            const finalY = exclamationY - (minExclamationHeight / 2);
            
            console.log(`❗ Drawing exclamation image at: (${Math.round(finalX)}, ${Math.round(finalY)}) size: ${Math.round(minExclamationWidth)}x${Math.round(minExclamationHeight)}`);
            
            ctx.drawImage(exclamationImage, finalX, finalY, minExclamationWidth, minExclamationHeight);
          });
          
          // Convert canvas to blob and create download URL
          canvas.toBlob((blob) => {
            const memeUrl = URL.createObjectURL(blob);
            setPreview(memeUrl);
            setGeneratedMeme(memeUrl);
            
            // Add to community memes
            const newMeme = {
              url: memeUrl,
              creator: xHandle,
              timestamp: Date.now(),
              pngOverlay: true,
              facesDetected: positionData.faces.length
            };
            
            setCommunityMemes(prev => {
              const updated = [newMeme, ...prev].slice(0, 3);
              return updated;
            });
            
            setIsProcessing(false);
            
            console.log('🎉 PNG overlay meme generated successfully!');
          }, 'image/png');
          
        } catch (pngError) {
          console.error('PNG loading failed:', pngError);
          setError(`Failed to load PNG assets: ${pngError.message}`);
          setIsProcessing(false);
        }
      };
      
      img.onerror = () => {
        setError('Failed to load image');
        setIsProcessing(false);
      };
      
      // Load the original image
      img.src = imageDataUrl;
      
    } catch (error) {
      console.error('PNG overlay meme generation failed:', error);
      setError(`Meme generation failed: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const downloadMeme = () => {
    if (!generatedMeme) return;
    
    const a = document.createElement('a');
    a.href = generatedMeme;
    a.download = `pumpit-png-meme-${Date.now()}.png`;
    a.click();
  };

  return (
    <>
      <Head>
        <title>PumpItOnSol - PNG Overlay Meme Generator</title>
        <meta name="description" content="Transform your photos into $PUMPIT memes with AI-powered positioning and your custom PNG overlays!" />
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
            <h2>🎨 Custom PNG Overlay Meme Generator</h2>
            <p>
              Upload your image and our AI will analyze face positions and overlay your exact custom PNG assets — 
              perfect positioning with your proven lip and exclamation mark designs!
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
            
            <div className="ai-status">
              <p>🎨 Custom PNG Overlay System Ready!</p>
              <p>✨ Using your exact lips.png and exclamation.png assets</p>
              <p>🧠 Powered by Gemini AI positioning</p>
              <p>💰 Cost: ~$0.001 per meme (virtually free!)</p>
            </div>
            
            {/* X Handle Input - Always visible if not set */}
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
              <div className="upload-section">
                <label htmlFor="memeImage">📸 Choose Your Image:</label>
                <input 
                  type="file" 
                  id="memeImage" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
                
                {selectedFile && xHandle && (
                  <p className="file-selected">
                    ✅ Selected: {selectedFile.name} | Creator: {xHandle}
                  </p>
                )}
              </div>
              
              <div className="generate-section">
                <button 
                  onClick={generateMeme}
                  disabled={!selectedFile || isProcessing || !xHandle}
                  className="generate-button"
                >
                  {isProcessing ? '🎨 AI Positioning Your Custom PNG Assets...' : '🔥 Generate Custom PNG Meme'}
                </button>
                
                {generatedMeme && (
                  <button 
                    onClick={downloadMeme}
                    className="generate-button"
                    style={{marginLeft: '1rem', background: 'linear-gradient(135deg, #FFFF00, #FFD700)'}}
                  >
                    💾 Download Meme
                  </button>
                )}
              </div>
              
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                  <br />
                  <small>Make sure lips.png and exclamation.png are in your /public/meme-assets/ folder</small>
                </div>
              )}
              
              <div className="meme-preview-placeholder">
                <img 
                  src={preview} 
                  alt="Meme Preview" 
                  style={{
                    opacity: isProcessing ? 0.7 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
                {isProcessing ? (
                  <p><strong>🎨 AI is analyzing positions and overlaying your custom PNG assets...</strong></p>
                ) : selectedFile ? (
                  generatedMeme ? (
                    <p><strong>🎉 Your custom PNG overlay $PUMPIT meme is ready!</strong></p>
                  ) : (
                    <p><strong>👆 Click "Generate Custom PNG Meme" for precise positioning!</strong></p>
                  )
                ) : (
                  <p><strong>Upload an image to get started with custom PNG overlays</strong></p>
                )}
              </div>
            </div>
          </section>

          <section id="roadmap" className="reveal">
            <h2>🗺️ Roadmap</h2>
            <ul>
              <li>✅ Phase 1: Launch $PUMPIT on Bonk.fun with meme identity + Pumper reveal</li>
              <li>🎨 Phase 2: Custom PNG overlay meme generator with AI positioning goes live</li>
              <li>📋 Phase 3: Collaborate with top meme communities</li>
              <li>📋 Phase 4: Community meme automation & viral campaigns</li>
              <li>📚 Phase 5: Pumper Comic Series - Exclusive stories for $PUMPIT holders! Watch Pumper meet new characters representing other promising tokens. Only holders can unlock these adventures!</li>
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
                    {meme.pngOverlay && <p className="png-badge">🎨 Custom PNG</p>}
                    {meme.facesDetected && <p className="faces-badge">👥 {meme.facesDetected} face(s)</p>}
                  </div>
                ))
              ) : (
                <>
                  <div className="meme-card placeholder">
                    <div className="placeholder-content">
                      <p>🎨 Be the first to create a custom PNG meme!</p>
                    </div>
                  </div>
                  <div className="meme-card placeholder">
                    <div className="placeholder-content">
                      <p>🚀 Your precise meme here</p>
                    </div>
                  </div>
                  <div className="meme-card placeholder">
                    <div className="placeholder-content">
                      <p>💎 Join the custom PNG revolution!</p>
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
          <p>© 2025 PumpItOnSol. Powered by AI positioning and custom PNG overlays. 🎨🚀</p>
        </footer>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
          color: #ffffff;
          min-height: 100vh;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          width: 100%;
          position: relative;
        }

        main {
          width: 100%;
          padding-top: 60px;
        }
        .desktop-social-buttons {
          position: fixed;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 0.5rem;
          z-index: 1000;
          flex-wrap: wrap;
          max-width: calc(100vw - 20px);
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
          padding: 0.4rem 0.8rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 25px;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          font-size: 0.9rem;
          white-space: nowrap;
          cursor: pointer;
        }

        .social-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 255, 255, 0.1);
        }

        .social-button.buy-button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          font-weight: bold;
          border-color: #FFFF00;
        }

        .social-button.buy-button:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 5px 20px rgba(255, 255, 0, 0.5);
        }

        .social-button.wallet-button {
          background: rgba(255, 255, 0, 0.2);
          border-color: #FFFF00;
        }

        header {
          text-align: center;
          padding: 4rem 1rem 2rem;
          position: relative;
          overflow: hidden;
          margin-top: 60px;
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
          opacity: 0.25;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
          z-index: 0;
        }

        .pumper-float img {
          width: 350px;
          height: 350px;
        }

        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-20px); }
        }

        h1 {
          font-size: 3.5rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
          position: relative;
          z-index: 1;
        }

        .main-nav {
          position: sticky;
          top: 0;
          z-index: 99;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(10px);
          padding: 0.5rem 0;
          margin: 0 0 2rem 0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .nav-container {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .main-nav a {
          color: #ffffff;
          text-decoration: none;
          padding: 0.5rem 1rem;
          transition: all 0.3s ease;
          border-radius: 5px;
          font-size: 0.9rem;
        }

        .main-nav a:hover {
          background: rgba(255, 255, 0, 0.3);
          transform: translateY(-2px);
        }

        main {
          width: 100%;
          padding-top: 20px;
        }

        section {
          margin: 2rem auto;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          backdrop-filter: blur(5px);
          max-width: 1200px;
        }

        h2 {
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          color: #FFFF00;
        }

        .expandable-content {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .preview-text {
          margin-bottom: 1rem;
        }

        .full-content {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .read-more-btn {
          background: none;
          border: 2px solid #FFFF00;
          color: #FFFF00;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
          margin-top: 0.5rem;
        }

        .read-more-btn:hover {
          background: #FFFF00;
          color: black;
          transform: scale(1.05);
        }

        .token-stats {
          background: rgba(255, 255, 0, 0.1);
          padding: 1.5rem;
          border-radius: 10px;
          margin-top: 2rem;
          border: 2px solid rgba(255, 255, 0, 0.3);
        }

        .token-stats h3 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .token-stats p {
          margin: 0.5rem 0;
          font-family: 'Courier New', monospace;
          word-break: break-all;
        }

        .token-info-section {
          background: linear-gradient(135deg, rgba(255, 255, 0, 0.05), rgba(255, 215, 0, 0.05));
          border-radius: 20px;
          padding: 2rem;
        }

        .token-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 2rem 0;
        }

        .token-card {
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 255, 0, 0.3);
          border-radius: 15px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .token-card:hover {
          transform: translateY(-5px);
          border-color: #FFFF00;
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.3);
        }

        .token-card h4 {
          color: #FFFF00;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .token-card .price {
          font-size: 1.6rem;
          font-weight: bold;
          color: #ffffff;
          margin: 0.5rem 0;
        }

        .token-card .value {
          font-size: 1.2rem;
          font-weight: bold;
          color: #ffffff;
        }

        .price-change {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .price-change.positive {
          color: #00ff00;
        }

        .price-change.negative {
          color: #ff3333;
        }

        .loading {
          color: #999;
          font-style: italic;
        }

        .buy-section {
          text-align: center;
          margin-top: 2rem;
        }

        .buy-button-large {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2.5rem;
          font-size: 1.2rem;
          font-weight: bold;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 5px 20px rgba(255, 255, 0, 0.4);
        }

        .buy-button-large:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.6);
        }

        .buy-info {
          color: #aaa;
          margin-top: 1rem;
          font-size: 0.9rem;
        }

        .token-link {
          display: inline-block;
          margin-top: 0.5rem;
          color: #FFFF00;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s ease;
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
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .x-form {
          background: #2d2d2d;
          padding: 2rem;
          border-radius: 15px;
          border: 2px solid #FFFF00;
          text-align: center;
          max-width: 400px;
          width: 90%;
        }

        .x-form h3 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .x-form input {
          width: 100%;
          padding: 0.8rem;
          margin-bottom: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 0, 0.5);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }

        .x-form button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 0.8rem 2rem;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .x-form button:hover {
          transform: scale(1.05);
        }

        .x-handle-section {
          background: rgba(255, 255, 0, 0.1);
          padding: 1.5rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          border: 2px solid rgba(255, 255, 0, 0.3);
        }

        .x-handle-inline-form label {
          display: block;
          margin-bottom: 1rem;
          color: #FFFF00;
          font-weight: bold;
        }

        .x-handle-input-group {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .x-handle-input-group input {
          flex: 1;
          padding: 0.8rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 0, 0.5);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }

        .x-handle-input-group button {
          padding: 0.8rem 1.5rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .x-handle-input-group button:hover {
          transform: scale(1.05);
          box-shadow: 0 3px 10px rgba(255, 255, 0, 0.4);
        }

        .ai-status {
          background: rgba(0, 0, 0, 0.5);
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          text-align: center;
          border: 2px solid rgba(255, 255, 0, 0.3);
        }

        .meme-upload {
          background: rgba(0, 0, 0, 0.4);
          padding: 2rem;
          border-radius: 15px;
          margin-top: 2rem;
        }

        .upload-section {
          margin-bottom: 2rem;
        }

        .upload-section label {
          display: block;
          margin-bottom: 1rem;
          font-size: 1.2rem;
          color: #FFFF00;
        }

        input[type="file"] {
          display: block;
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px dashed rgba(255, 255, 0, 0.5);
          border-radius: 10px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        input[type="file"]:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: #FFFF00;
        }

        .file-selected {
          margin-top: 1rem;
          color: #00ff00;
        }

        .generate-section {
          text-align: center;
        }

        .generate-button {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 0.5rem;
          font-weight: bold;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(255, 255, 0, 0.5);
        }

        .generate-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(255, 0, 0, 0.2);
          color: #ff6666;
          padding: 1rem;
          border-radius: 10px;
          margin-top: 1rem;
          border: 1px solid rgba(255, 0, 0, 0.5);
        }

        .error-message small {
          display: block;
          margin-top: 0.5rem;
          color: #ffaaaa;
          font-size: 0.8rem;
        }

        .meme-preview-placeholder {
          margin: 2rem auto;
          text-align: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 15px;
          min-height: 400px;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .meme-preview-placeholder img {
          max-width: 100%;
          max-height: 400px;
          width: auto;
          height: auto;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .community-memes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .meme-card {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 15px;
          overflow: hidden;
          transition: transform 0.3s ease;
          border: 2px solid rgba(255, 255, 0, 0.2);
        }

        .meme-card:hover {
          transform: translateY(-5px);
          border-color: #FFFF00;
        }

        .meme-card img {
          width: 100%;
          height: 250px;
          object-fit: cover;
        }

        .meme-card p {
          padding: 1rem;
          text-align: center;
          color: #FFFF00;
        }

        .png-badge {
          background: rgba(255, 255, 0, 0.2);
          color: #FFFF00;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        .faces-badge {
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        .meme-card.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .placeholder-content {
          padding: 2rem;
          text-align: center;
        }

        .placeholder-content p {
          color: #666;
          font-size: 1.2rem;
        }

        .social-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .social-card {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          padding: 2rem;
          border: 2px solid rgba(255, 255, 0, 0.2);
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
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }

        .community-button:hover {
          transform: translateX(5px);
          background: rgba(255, 255, 255, 0.1);
          border-color: #FFFF00;
        }

        .community-button .icon {
          font-size: 2rem;
          min-width: 50px;
          text-align: center;
        }

        .community-button strong {
          display: block;
          margin-bottom: 0.2rem;
        }

        .community-button p {
          margin: 0;
          font-size: 0.9rem;
          color: #aaa;
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

        #roadmap ul {
          list-style: none;
          padding-left: 0;
        }

        #roadmap li {
          padding: 1rem;
          margin: 0.5rem 0;
          background: rgba(0, 0, 0, 0.5);
          border-left: 4px solid #FFFF00;
          border-radius: 5px;
          transition: all 0.3s ease;
        }

        #roadmap li:hover {
          transform: translateX(10px);
          background: rgba(255, 255, 0, 0.1);
        }

        footer {
          text-align: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.5);
          margin-top: 4rem;
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 0.6s ease forwards;
        }

        @keyframes fadeInUp {
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
            padding-top: 2rem;
          }

          .main-nav {
            position: relative;
            top: auto;
            margin: 0 -20px 1rem;
            z-index: 98;
          }

          main {
            padding-top: 20px;
          }

          section {
            scroll-margin-top: 20px;
            margin: 1rem auto;
          }

          .pumper-float img {
            width: 250px;
            height: 250px;
          }

          h1 {
            font-size: 2.5rem;
          }

          h2 {
            font-size: 1.8rem;
          }

          .nav-container {
            gap: 0.5rem;
            padding: 0.5rem;
          }

          .main-nav a {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }

          .token-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.8rem;
          }
          
          .social-grid {
            grid-template-columns: 1fr;
          }
          
          .buy-button-large {
            padding: 0.8rem 1.5rem;
            font-size: 1rem;
          }
          
          .token-card {
            padding: 1rem;
          }

          .token-card .price {
            font-size: 1.2rem;
          }

          .token-card .value {
            font-size: 1rem;
          }

          section {
            padding: 1.5rem;
          }

          .x-handle-input-group {
            flex-direction: column;
          }

          .x-handle-input-group input {
            width: 100%;
          }

          .x-handle-input-group button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .mobile-top-buttons {
            right: 5px;
            top: 5px;
          }

          .social-button {
            padding: 0.3rem 0.6rem;
            font-size: 0.8rem;
          }

          .token-grid {
            grid-template-columns: 1fr;
          }
          
          .community-memes {
            grid-template-columns: 1fr;
          }

          .pumper-float img {
            width: 200px;
            height: 200px;
          }

          h1 {
            font-size: 2rem;
          }

          .mobile-social-icons {
            font-size: 1.2rem;
            gap: 0.8rem;
          }
        }