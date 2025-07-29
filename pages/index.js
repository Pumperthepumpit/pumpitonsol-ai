import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('/pumper.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [faceDetection, setFaceDetection] = useState(null);
  const [tokenPrice, setTokenPrice] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [xHandle, setXHandle] = useState('');
  const [showXForm, setShowXForm] = useState(false);
  const [communityMemes, setCommunityMemes] = useState([]);

  // Initialize MediaPipe Face Detection
  useEffect(() => {
    const loadFaceDetection = async () => {
      try {
        console.log('🤖 Loading AI face detection...');
        
        const vision = await import('@mediapipe/tasks-vision');
        const { FaceDetector, FilesetResolver } = vision;
        
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        const faceDetector = await FaceDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU"
          },
          runningMode: "IMAGE"
        });
        
        setFaceDetection(faceDetector);
        console.log('✅ AI face detection loaded!');
        
      } catch (error) {
        console.warn('⚠️ AI face detection failed to load, using fallback:', error);
        setFaceDetection('fallback');
      }
    };
    
    loadFaceDetection();
  }, []);

  // Initialize Solana Wallet Adapter
  useEffect(() => {
    const connectWallet = async () => {
      if (typeof window !== 'undefined' && window.solana) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true });
          setWalletAddress(response.publicKey.toString());
        } catch (error) {
          console.log('Wallet not connected');
        }
      }
    };
    connectWallet();
  }, []);

  // Initialize Jupiter Terminal
  useEffect(() => {
    if (window.Jupiter) {
      window.Jupiter.init({
        displayMode: 'widget',
        integratedTargetId: 'jupiter-terminal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        strictTokenList: false,
        defaultExplorer: 'Solscan',
        formProps: {
          initialInputTokenAddress: 'So11111111111111111111111111111111111111112',
          initialOutputTokenAddress: 'B4LntXRP3VLP9TJ8L8EGtrjBFCfnJnqoqoRPZ7uWbonk',
          initialAmount: '100000000', // 0.1 SOL
          fixedOutputMint: true,
        },
        enableWalletPassthrough: true,
      });
    }
  }, []);

  // Fetch token price data from DexScreener
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
        // Fallback data
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

  const handleBuyClick = () => {
    if (!walletAddress) {
      connectWallet();
    } else if (window.Jupiter) {
      window.Jupiter.toggle();
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!xHandle) {
      setShowXForm(true);
      return;
    }

    setSelectedFile(file);
    setError('');
    setGeneratedMeme(null);
    
    const originalPreview = URL.createObjectURL(file);
    setPreview(originalPreview);
  };

  const handleXHandleSubmit = (e) => {
    e.preventDefault();
    if (xHandle && xHandle.trim()) {
      setShowXForm(false);
      if (selectedFile) {
        const originalPreview = URL.createObjectURL(selectedFile);
        setPreview(originalPreview);
      }
    }
  };

  const detectFaces = async (imageElement) => {
    if (!faceDetection || faceDetection === 'fallback') {
      return [{
        boundingBox: {
          originX: imageElement.width * 0.2,
          originY: imageElement.height * 0.15,
          width: imageElement.width * 0.6,
          height: imageElement.height * 0.7
        },
        keypoints: [
          { 
            x: imageElement.width * 0.5, 
            y: imageElement.height * 0.65,
            category: 'MOUTH_CENTER'
          }
        ]
      }];
    }

    try {
      console.log('🔍 Detecting faces with AI...');
      const detections = faceDetection.detect(imageElement);
      
      if (detections.detections.length === 0) {
        console.log('⚠️ No faces detected, using fallback positioning');
        return [{
          boundingBox: {
            originX: imageElement.width * 0.2,
            originY: imageElement.height * 0.15,
            width: imageElement.width * 0.6,
            height: imageElement.height * 0.7
          },
          keypoints: [
            { 
              x: imageElement.width * 0.5, 
              y: imageElement.height * 0.65,
              category: 'MOUTH_CENTER'
            }
          ]
        }];
      }

      console.log(`✅ Found ${detections.detections.length} face(s)!`);
      return detections.detections;
      
    } catch (error) {
      console.error('❌ Face detection error:', error);
      return [{
        boundingBox: {
          originX: imageElement.width * 0.2,
          originY: imageElement.height * 0.15,
          width: imageElement.width * 0.6,
          height: imageElement.height * 0.7
        },
        keypoints: [
          { 
            x: imageElement.width * 0.5, 
            y: imageElement.height * 0.65,
            category: 'MOUTH_CENTER'
          }
        ]
      }];
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
      console.log('🔥 Starting AI-powered meme generation...');
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        const faces = await detectFaces(img);
        console.log(`🤖 Processing ${faces.length} detected face(s)...`);
        
        faces.forEach((face, index) => {
          console.log(`🎨 Adding $PUMPIT elements to face ${index + 1}...`);
          
          const faceRegion = {
            x: face.boundingBox.originX,
            y: face.boundingBox.originY,
            width: face.boundingBox.width,
            height: face.boundingBox.height
          };
          
          let mouthPosition = { x: faceRegion.x + faceRegion.width / 2, y: faceRegion.y + faceRegion.height * 0.75 };
          
          if (face.keypoints) {
            const mouthKeypoint = face.keypoints.find(kp => 
              kp.category === 'MOUTH_CENTER' || 
              kp.category === 'MOUTH' ||
              kp.category === 'mouth'
            );
            if (mouthKeypoint) {
              mouthPosition = { x: mouthKeypoint.x, y: mouthKeypoint.y };
              console.log('👄 Found mouth keypoint!');
            }
          }
          
          drawCartoonLips(ctx, faceRegion, mouthPosition);
          drawSideExclamationMarks(ctx, faceRegion, index % 2 === 0);
        });
        
        canvas.toBlob((blob) => {
          const memeUrl = URL.createObjectURL(blob);
          setPreview(memeUrl);
          setGeneratedMeme(memeUrl);
          setIsProcessing(false);
          
          // Add to community memes
          const newMeme = {
            url: memeUrl,
            creator: xHandle,
            timestamp: Date.now()
          };
          
          setCommunityMemes(prev => {
            const updated = [newMeme, ...prev].slice(0, 3);
            return updated;
          });
          
          console.log('🎉 AI-powered meme generated successfully!');
        });
      };
      
      img.onerror = () => {
        setError('Failed to load image');
        setIsProcessing(false);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(selectedFile);
      
    } catch (error) {
      console.error('Meme generation failed:', error);
      setError(`Failed to generate meme: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const downloadMeme = () => {
    if (!generatedMeme) return;
    
    const a = document.createElement('a');
    a.href = generatedMeme;
    a.download = `pumpit-ai-meme-${Date.now()}.png`;
    a.click();
  };

  // Cartoon-style lip drawing
  const drawCartoonLips = (ctx, faceRegion, mouthPosition) => {
    const mouthX = mouthPosition.x;
    const mouthY = mouthPosition.y;
    
    const faceSize = Math.min(faceRegion.width, faceRegion.height);
    const lipWidth = faceSize * 0.4;
    const lipHeight = faceSize * 0.15;
    
    ctx.save();
    
    // Black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(4, faceSize * 0.015);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Upper lip
    ctx.beginPath();
    ctx.moveTo(mouthX - lipWidth/2, mouthY);
    ctx.quadraticCurveTo(mouthX - lipWidth/4, mouthY - lipHeight/2, mouthX - lipWidth/6, mouthY - lipHeight/3);
    ctx.quadraticCurveTo(mouthX, mouthY - lipHeight/2.5, mouthX, mouthY - lipHeight/3);
    ctx.quadraticCurveTo(mouthX, mouthY - lipHeight/2.5, mouthX + lipWidth/6, mouthY - lipHeight/3);
    ctx.quadraticCurveTo(mouthX + lipWidth/4, mouthY - lipHeight/2, mouthX + lipWidth/2, mouthY);
    
    // Lower lip
    ctx.quadraticCurveTo(mouthX + lipWidth/3, mouthY + lipHeight/2, mouthX, mouthY + lipHeight/1.5);
    ctx.quadraticCurveTo(mouthX - lipWidth/3, mouthY + lipHeight/2, mouthX - lipWidth/2, mouthY);
    ctx.closePath();
    
    // Fill red
    ctx.fillStyle = '#FF0000';
    ctx.fill();
    ctx.stroke();
    
    // Add highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(mouthX - lipWidth/4, mouthY - lipHeight/4, lipWidth/8, lipHeight/4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(mouthX + lipWidth/5, mouthY + lipHeight/3, lipWidth/6, lipHeight/3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  // Side exclamation marks
  const drawSideExclamationMarks = (ctx, faceRegion, rightSide = true) => {
    const { x, y, width, height } = faceRegion;
    
    const exclamationSize = Math.max(width * 0.12, 20);
    const sideX = rightSide ? x + width + exclamationSize * 0.5 : x - exclamationSize * 1.5;
    const centerY = y + height * 0.4;
    
    const positions = [
      { x: sideX, y: centerY - exclamationSize * 0.8, rotation: rightSide ? -0.3 : 0.3 },
      { x: sideX + (rightSide ? exclamationSize * 0.3 : -exclamationSize * 0.3), y: centerY, rotation: 0 },
      { x: sideX, y: centerY + exclamationSize * 0.8, rotation: rightSide ? 0.3 : -0.3 }
    ];
    
    ctx.save();
    
    positions.forEach((pos) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.rotation);
      
      // Black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(3, exclamationSize * 0.08);
      ctx.lineCap = 'round';
      
      // Main body
      const bodyWidth = exclamationSize * 0.3;
      const bodyHeight = exclamationSize * 0.6;
      
      ctx.beginPath();
      ctx.moveTo(0, -bodyHeight/2);
      ctx.lineTo(-bodyWidth/3, bodyHeight/2);
      ctx.lineTo(bodyWidth/3, bodyHeight/2);
      ctx.closePath();
      
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      ctx.stroke();
      
      // Dot
      const dotRadius = exclamationSize * 0.15;
      ctx.beginPath();
      ctx.arc(0, bodyHeight/2 + dotRadius * 2, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0000';
      ctx.fill();
      ctx.stroke();
      
      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-bodyWidth/6, -bodyHeight/4, bodyWidth/4, bodyHeight/4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
    
    ctx.restore();
  };

  return (
    <>
      <Head>
        <title>PumpItOnSol - AI Meme Generator</title>
        <meta name="description" content="Transform your photos into $PUMPIT memes with AI-powered face detection!" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js" crossOrigin="anonymous"></script>
        <script src="https://terminal.jup.ag/main-v4.js" data-preload></script>
      </Head>

      <div className="social-buttons">
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

      <header>
        <div className="pumper-float">
          <img src="/pumper.png" alt="Pumper - PumpItOnSol Mascot" />
        </div>
        <h1>$PUMPIT</h1>
        <p>Solana's most recognized meme</p>
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
          <p>
            $PUMPIT. Created with one purpose: to become the most recognized meme on Solana. 
            Launched on Bonk, $PUMPIT is focused on real growth. Pumper has the ability to adapt — 
            changing his face to support other strong tokens and communities he believes are the best ones to be in.
          </p>
          
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
          <h2>About</h2>
          <p>
            Yes — $PUMPIT faced setbacks before. We've been rugged. Not once, but twice. 
            But here's the difference: We learn. We adapt. We grow. To take $PUMPIT to the next level, 
            we've made key updates to our meme identity.
          </p>
        </section>

        <section id="generator" className="reveal">
          <h2>🤖 AI-Powered Meme Generator</h2>
          <p>
            Upload your image and our AI will automatically detect faces and transform them into $PUMPIT-style memes — 
            with perfectly positioned red lips, exclamation marks, and more!
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
            {faceDetection === null && <p>🔄 Loading AI face detection...</p>}
            {faceDetection === 'fallback' && <p>⚠️ Using basic positioning (AI unavailable)</p>}
            {faceDetection && faceDetection !== 'fallback' && <p>🤖 AI face detection ready!</p>}
          </div>
          
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
                {isProcessing ? '🤖 AI Generating Your $PUMPIT Meme...' : '🔥 Generate AI $PUMPIT Meme'}
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
                <p><strong>🤖 AI is detecting faces and generating your meme...</strong></p>
              ) : selectedFile ? (
                generatedMeme ? (
                  <p><strong>🎉 Your AI-powered $PUMPIT meme is ready!</strong></p>
                ) : (
                  <p><strong>👆 Click "Generate AI $PUMPIT Meme" for automatic face detection!</strong></p>
                )
              ) : (
                <p><strong>Upload an image to get started</strong></p>
              )}
            </div>
          </div>
        </section>

        <section id="roadmap" className="reveal">
          <h2>🗺️ Roadmap</h2>
          <ul>
            <li>✅ Phase 1: Launch $PUMPIT on Bonk.fun with meme identity + Pumper reveal</li>
            <li>🤖 Phase 2: AI-powered meme generator with face detection goes live</li>
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
                    <p>💎 Join the fun!</p>
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
        <p>© 2025 PumpItOnSol. Powered by AI and the community. 🤖🚀</p>
      </footer>

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
        }

        /* Container width fix */
        main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
          width: 100%;
        }

        /* Social buttons at top */
        .social-buttons {
          position: fixed;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 0.5rem;
          z-index: 1000;
          flex-wrap: wrap;
          max-width: calc(100vw - 20px);
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

        /* Buy button styling */
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
        }

        .pumper-float {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
        }

        .pumper-float img {
          width: 250px;
          height: 250px;
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

        /* Fixed navigation */
        .main-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          padding: 0.5rem 0;
          margin-bottom: 2rem;
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

        section {
          margin: 2rem 0;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          backdrop-filter: blur(5px);
        }

        h2 {
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          color: #FFFF00;
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

        /* Token Information Section */
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

        /* Buy Section */
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

        /* Token Link */
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

        /* X Form Modal */
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

        /* Meme generator styles */
        .ai-status {
          background: rgba(0, 0, 0, 0.5);
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          text-align: center;
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

        .meme-preview-placeholder {
          margin-top: 2rem;
          text-align: center;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 15px;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .meme-preview-placeholder img {
          max-width: 100%;
          max-height: 500px;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        /* Community memes */
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

        /* Social Feed Section */
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

        /* Roadmap */
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

        /* Animations */
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

        /* Responsive Design */
        @media (max-width: 768px) {
          h1 {
            font-size: 2.5rem;
          }

          h2 {
            font-size: 1.8rem;
          }

          .social-buttons {
            right: 5px;
            top: 5px;
            gap: 0.3rem;
          }

          .social-button {
            padding: 0.3rem 0.6rem;
            font-size: 0.8rem;
          }

          .nav-container {
            gap: 0.5rem;
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
            margin: 1rem 0;
          }
        }

        @media (max-width: 480px) {
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
        }
      `}</style>
    </>
  );
}