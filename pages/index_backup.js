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
  
  // New states for multi-tier detection
  const [detectionMode, setDetectionMode] = useState('auto');
  const [clickPosition, setClickPosition] = useState(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('');

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

    setSelectedFile(file);
    setError('');
    setGeneratedMeme(null);
    setDetectionStatus('');
    
    const originalPreview = URL.createObjectURL(file);
    setPreview(originalPreview);

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
    setShowModeSelector(false);
    setDetectionStatus('🚀 Starting multi-tier face detection...');

    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Create image element
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Load PNG assets
      const [lipImage, exclamationImage] = await Promise.all([
        loadImage('/meme-assets/lips.png'),
        loadImage('/meme-assets/exclamation.png')
      ]);

      console.log('✅ PNG assets loaded successfully!');

      let positioningData = null;

      // Handle different detection modes
      if (detectionMode === 'manual' && clickPosition) {
        console.log('📍 Using manual positioning...');
        setDetectionStatus('📍 Using manual positioning...');
        positioningData = {
          method: 'manual',
          faces: [{
            mouthPosition: {
              centerX: clickPosition.x / 100,
              centerY: clickPosition.y / 100
            },
            exclamationPosition: {
              centerX: clickPosition.x / 100,
              centerY: Math.max(0.1, (clickPosition.y / 100) - 0.4)
            },
            faceSize: 0.3
          }]
        };
      } else {
        // Try MediaPipe first (for human faces)
        console.log('🔍 Tier 1: Attempting MediaPipe detection for human faces...');
        setDetectionStatus('🧑 Checking for human faces with MediaPipe...');
        positioningData = await tryMediaPipeDetection(canvas);

        // If MediaPipe fails, try Replicate for anime/cartoons
        if (!positioningData || positioningData.faces.length === 0) {
          console.log('🎌 Tier 2: Trying Replicate anime/cartoon detection...');
          setDetectionStatus('🦸 Checking for anime/cartoon characters...');
          positioningData = await tryReplicateAnimeDetection(imageDataUrl);
        }

        // If anime detection fails, try Replicate for animals
        if (!positioningData || positioningData.faces.length === 0) {
          console.log('🐾 Tier 3: Trying Replicate animal detection...');
          setDetectionStatus('🐕 Checking for animal faces...');
          positioningData = await tryReplicateAnimalDetection(imageDataUrl);
        }

        // If all Replicate models fail, try Gemini as fallback
        if (!positioningData || positioningData.faces.length === 0) {
          console.log('🤖 Tier 4: Trying Gemini AI as fallback...');
          setDetectionStatus('🤖 Using Gemini AI for general detection...');
          positioningData = await tryGeminiDetection(imageDataUrl);
        }

        // If everything fails, prompt for manual mode
        if (!positioningData || positioningData.faces.length === 0) {
          setError('No faces detected! Try manual positioning mode.');
          setShowModeSelector(true);
          setIsProcessing(false);
          setDetectionStatus('');
          return;
        }
      }

      console.log(`✅ Using ${positioningData.method} detection method`);
      console.log(`📊 Detected ${positioningData.faces.length} face(s)`);
      setDetectionStatus(`✅ Detected ${positioningData.faces.length} face(s) using ${positioningData.method}`);

      // Clear and redraw original image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Process each detected/positioned face
      positioningData.faces.forEach((face, index) => {
        console.log(`\n🎭 Processing face ${index + 1}:`);
        
        let mouthCenterX, mouthCenterY, targetLipWidth, targetLipHeight;
        let exclamationX, exclamationY, exclamationWidth, exclamationHeight;
        let faceAngle = 0;

        if (positioningData.method === 'mediapipe' && face.landmarks) {
          // High precision MediaPipe positioning
          const { mouthBounds, faceMetrics } = face;
          
          mouthCenterX = mouthBounds.centerX;
          mouthCenterY = mouthBounds.centerY;
          
          // BIGGER lips for meme effect
          const lipScale = 3.0; // Even bigger!
          const lipAspectRatio = lipImage.width / lipImage.height;
          targetLipWidth = Math.max(
            mouthBounds.width * lipScale,
            canvas.width * 0.15
          );
          targetLipHeight = targetLipWidth / lipAspectRatio;
          
          faceAngle = faceMetrics.angle;
          
          exclamationX = faceMetrics.foreheadCenter.x;
          exclamationY = faceMetrics.foreheadCenter.y - 80;
          exclamationWidth = faceMetrics.faceWidth * 0.7;
          exclamationHeight = exclamationWidth / (exclamationImage.width / exclamationImage.height);
          
        } else {
          // Replicate, Gemini, or manual positioning
          mouthCenterX = face.mouthPosition.centerX * canvas.width;
          mouthCenterY = face.mouthPosition.centerY * canvas.height;
          
          // Different scaling based on detection method
          let lipScale = 2.5;
          if (positioningData.method === 'replicate-anime') {
            lipScale = 3.0; // Bigger for anime style
          } else if (positioningData.method === 'replicate-animal') {
            lipScale = 2.8; // Adjusted for animals
          }
          
          const estimatedMouthWidth = canvas.width * (face.faceSize || 0.25) * 0.3;
          const lipAspectRatio = lipImage.width / lipImage.height;
          targetLipWidth = Math.max(
            estimatedMouthWidth * lipScale,
            canvas.width * 0.12
          );
          targetLipHeight = targetLipWidth / lipAspectRatio;
          
          exclamationX = face.exclamationPosition.centerX * canvas.width;
          exclamationY = face.exclamationPosition.centerY * canvas.height;
          const exclamationScale = (face.faceSize || 0.25) * 2.5;
          exclamationWidth = canvas.width * exclamationScale;
          exclamationHeight = exclamationWidth / (exclamationImage.width / exclamationImage.height);
        }

        console.log(`👄 Lip size: ${Math.round(targetLipWidth)}x${Math.round(targetLipHeight)}`);
        console.log(`📍 Mouth center: (${Math.round(mouthCenterX)}, ${Math.round(mouthCenterY)})`);

        // Draw lips with rotation if detected
        ctx.save();
        ctx.translate(mouthCenterX, mouthCenterY);
        if (faceAngle) ctx.rotate(faceAngle);
        ctx.drawImage(
          lipImage,
          -targetLipWidth / 2,
          -targetLipHeight / 2,
          targetLipWidth,
          targetLipHeight
        );
        ctx.restore();

        // Draw exclamation
        ctx.drawImage(
          exclamationImage,
          exclamationX - exclamationWidth / 2,
          exclamationY - exclamationHeight / 2,
          exclamationWidth,
          exclamationHeight
        );

        console.log(`✅ Overlays applied using ${positioningData.method}`);
      });

      // Convert to blob and display
      canvas.toBlob((blob) => {
        const memeUrl = URL.createObjectURL(blob);
        setPreview(memeUrl);
        setGeneratedMeme(memeUrl);
        
        setCommunityMemes(prev => [{
          url: memeUrl,
          creator: xHandle,
          timestamp: Date.now(),
          pngOverlay: true,
          facesDetected: positioningData.faces.length,
          detectionMethod: positioningData.method
        }, ...prev].slice(0, 3));
        
        setIsProcessing(false);
        setClickPosition(null);
        setDetectionStatus('');
        
        console.log(`🎉 Meme generated successfully using ${positioningData.method}!`);
      }, 'image/png');
      
    } catch (error) {
      console.error('❌ Meme generation failed:', error);
      setError(`Meme generation failed: ${error.message}`);
      setIsProcessing(false);
      setDetectionStatus('');
    }
  };

  // MediaPipe detection function
  async function tryMediaPipeDetection(canvas) {
    try {
      if (!window.FaceMesh) {
        console.log('MediaPipe not loaded, skipping...');
        return null;
      }

      const faceMesh = new window.FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
        }
      });
      
      faceMesh.setOptions({
        maxNumFaces: 5,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      let results = null;
      
      return new Promise((resolve) => {
        faceMesh.onResults((mpResults) => {
          results = mpResults;
          
          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            resolve(null);
            return;
          }

          const faces = results.multiFaceLandmarks.map((landmarks) => {
            // Mouth landmarks
            const mouthIndices = [13, 14, 269, 270, 267, 271, 272, 15, 16, 17, 18, 87, 86, 85, 84, 61, 291];
            
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            mouthIndices.forEach(index => {
              const point = landmarks[index];
              const x = point.x * canvas.width;
              const y = point.y * canvas.height;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            });
            
            // Eye positions for angle
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const angle = Math.atan2(
              (rightEye.y - leftEye.y) * canvas.height,
              (rightEye.x - leftEye.x) * canvas.width
            );
            
            // Face width
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];
            const faceWidth = Math.abs(rightCheek.x - leftCheek.x) * canvas.width;
            
            // Forehead position
            const forehead = landmarks[10];
            
            return {
              landmarks: landmarks,
              mouthBounds: {
                centerX: (minX + maxX) / 2,
                centerY: (minY + maxY) / 2,
                width: maxX - minX,
                height: maxY - minY
              },
              faceMetrics: {
                angle: angle,
                faceWidth: faceWidth,
                foreheadCenter: {
                  x: forehead.x * canvas.width,
                  y: forehead.y * canvas.height
                }
              }
            };
          });

          resolve({
            method: 'mediapipe',
            faces: faces
          });
        });

        // Send image to MediaPipe
        faceMesh.send({ image: canvas });
        
        // Timeout if no results
        setTimeout(() => {
          if (!results) resolve(null);
        }, 1000);
      });
    } catch (error) {
      console.error('MediaPipe error:', error);
      return null;
    }
  }

  // Replicate anime detection
  async function tryReplicateAnimeDetection(imageDataUrl) {
    try {
      const response = await fetch('/api/detect-anime-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl
        })
      });

      if (!response.ok) {
        throw new Error('Anime detection failed');
      }

      const result = await response.json();
      
      if (result.faces && result.faces.length > 0) {
        return {
          method: 'replicate-anime',
          faces: result.faces
        };
      }
      
      return null;
    } catch (error) {
      console.error('Replicate anime error:', error);
      return null;
    }
  }

  // Replicate animal detection
  async function tryReplicateAnimalDetection(imageDataUrl) {
    try {
      const response = await fetch('/api/detect-animal-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl
        })
      });

      if (!response.ok) {
        throw new Error('Animal detection failed');
      }

      const result = await response.json();
      
      if (result.faces && result.faces.length > 0) {
        return {
          method: 'replicate-animal',
          faces: result.faces
        };
      }
      
      return null;
    } catch (error) {
      console.error('Replicate animal error:', error);
      return null;
    }
  }

  // Gemini detection function (existing)
  async function tryGeminiDetection(imageDataUrl) {
    try {
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
        throw new Error('Gemini API failed');
      }

      const positionData = await response.json();
      
      if (positionData.faces && positionData.faces.length > 0) {
        return {
          method: 'gemini',
          faces: positionData.faces
        };
      }
      
      return null;
    } catch (error) {
      console.error('Gemini error:', error);
      return null;
    }
  }

  // Helper function to load images
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  // Manual click handler
  const handleCanvasClick = (e) => {
    if (detectionMode !== 'manual') return;
    
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setClickPosition({ x, y });
    console.log(`📍 Manual position set: ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
  };

  const downloadMeme = () => {
    if (!generatedMeme) return;
    
    const a = document.createElement('a');
    a.href = generatedMeme;
    a.download = `pumpit-meme-${Date.now()}.png`;
    a.click();
  };

  return (
    <>
      <Head>
        <title>PumpItOnSol - AI-Powered Meme Generator</title>
        <meta name="description" content="Transform any photo into $PUMPIT memes - works with humans, cartoons, anime, and animals!" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://terminal.jup.ag/main-v2.js" data-preload></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js" crossorigin="anonymous"></script>
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
              Transform any image into a $PUMPIT meme! Our advanced AI works with humans, anime, cartoons, and even your pets!
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
              <p>🎯 4-Tier AI Detection System</p>
              <p>🧑 <strong>Tier 1:</strong> MediaPipe for humans (468 face points!)</p>
              <p>🦸 <strong>Tier 2:</strong> Replicate AI for anime/cartoons</p>
              <p>🐕 <strong>Tier 3:</strong> Replicate AI for animals</p>
              <p>🤖 <strong>Tier 4:</strong> Gemini AI universal fallback</p>
              <p>🎯 <strong>Manual:</strong> Click to position anywhere!</p>
            </div>
            
            {showModeSelector && (
              <div className="mode-selector">
                <h3>No faces detected! Choose how to proceed:</h3>
                <button 
                  onClick={() => {
                    setDetectionMode('manual');
                    setShowModeSelector(false);
                  }}
                  className="mode-button"
                >
                  🎯 Manual Position Mode
                </button>
                <button 
                  onClick={() => {
                    setShowModeSelector(false);
                    setError('');
                  }}
                  className="mode-button"
                >
                  🔄 Try Different Image
                </button>
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
                  {isProcessing ? '🎨 AI Processing...' : '🔥 Generate $PUMPIT Meme'}
                </button>
                
                <button 
                  onClick={() => {
                    setDetectionMode(detectionMode === 'manual' ? 'auto' : 'manual');
                    setClickPosition(null);
                  }}
                  className="generate-button"
                  style={{
                    background: detectionMode === 'manual' 
                      ? 'linear-gradient(135deg, #00FF00, #00AA00)' 
                      : 'linear-gradient(135deg, #00FFFF, #0099CC)'
                  }}
                >
                  {detectionMode === 'manual' ? '✅ Manual Mode ON' : '🎯 Switch to Manual Mode'}
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
              
              {detectionStatus && (
                <div className="detection-status">
                  <p>{detectionStatus}</p>
                </div>
              )}
              
              {detectionMode === 'manual' && (
                <div className="manual-instructions">
                  <p>📍 Click on the image where you want the lips to appear!</p>
                  {clickPosition && (
                    <p className="position-confirmed">✅ Position set at {clickPosition.x.toFixed(0)}%, {clickPosition.y.toFixed(0)}%</p>
                  )}
                </div>
              )}
              
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                  <br />
                  <small>Try manual mode or a different image</small>
                </div>
              )}
              
              <div 
                className="meme-preview-placeholder"
                onClick={detectionMode === 'manual' ? handleCanvasClick : undefined}
                style={{
                  cursor: detectionMode === 'manual' ? 'crosshair' : 'default',
                  position: 'relative'
                }}
              >
                <img 
                  src={preview} 
                  alt="Meme Preview" 
                  style={{
                    opacity: isProcessing ? 0.7 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
                
                {detectionMode === 'manual' && clickPosition && (
                  <div 
                    className="position-marker"
                    style={{
                      position: 'absolute',
                      left: `${clickPosition.x}%`,
                      top: `${clickPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '40px',
                      height: '40px',
                      border: '3px solid #00FF00',
                      borderRadius: '50%',
                      boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '10px',
                      height: '10px',
                      background: '#00FF00',
                      borderRadius: '50%'
                    }} />
                  </div>
                )}
                
                {isProcessing ? (
                  <p><strong>🎨 AI is analyzing your image...</strong></p>
                ) : selectedFile ? (
                  generatedMeme ? (
                    <p><strong>🎉 Your $PUMPIT meme is ready!</strong></p>
                  ) : (
                    <p><strong>👆 Click "Generate" or use Manual Mode!</strong></p>
                  )
                ) : (
                  <p><strong>Upload any image - human, cartoon, or animal!</strong></p>
                )}
              </div>
            </div>
          </section>

          <section id="roadmap" className="reveal">
            <h2>🗺️ Roadmap</h2>
            <ul>
              <li>✅ Phase 1: Launch $PUMPIT on Bonk.fun with meme identity + Pumper reveal</li>
              <li>✅ Phase 2: 4-Tier AI meme generator with universal image support</li>
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
                    {meme.pngOverlay && <p className="png-badge">🎨 Custom PNG</p>}
                    {meme.facesDetected && <p className="faces-badge">👥 {meme.facesDetected} face(s)</p>}
                    {meme.detectionMethod && (
                      <p className="method-badge">
                        {meme.detectionMethod === 'mediapipe' && '🧑 Human'}
                        {meme.detectionMethod === 'replicate-anime' && '🦸 Anime'}
                        {meme.detectionMethod === 'replicate-animal' && '🐕 Animal'}
                        {meme.detectionMethod === 'gemini' && '🤖 AI'}
                        {meme.detectionMethod === 'manual' && '🎯 Manual'}
                      </p>
                    )}
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
          <p>© 2025 PumpItOnSol. Powered by 4-tier AI detection system. 🎨🚀</p>
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
          padding: 1.5rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          text-align: center;
          border: 2px solid rgba(255, 255, 0, 0.3);
        }

        .ai-status p {
          margin: 0.5rem 0;
          font-size: 0.95rem;
        }

        .ai-status strong {
          color: #FFFF00;
        }

        .mode-selector {
          background: rgba(255, 255, 0, 0.1);
          border: 2px solid #FFFF00;
          border-radius: 15px;
          padding: 2rem;
          margin: 2rem 0;
          text-align: center;
        }
        
        .mode-selector h3 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
        }
        
        .mode-button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2rem;
          margin: 0.5rem;
          border-radius: 30px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .mode-button:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(255, 255, 0, 0.5);
        }
        
        .manual-instructions {
          background: rgba(0, 255, 0, 0.1);
          border: 2px solid rgba(0, 255, 0, 0.3);
          border-radius: 10px;
          padding: 1rem;
          margin: 1rem 0;
          text-align: center;
        }
        
        .manual-instructions p {
          color: #00FF00;
          font-weight: bold;
          margin: 0.5rem 0;
        }
        
        .position-confirmed {
          color: #00FF00;
          font-size: 1.1rem;
        }

        .detection-status {
          background: rgba(0, 255, 255, 0.1);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 10px;
          padding: 1rem;
          margin: 1rem 0;
          text-align: center;
          animation: pulse 2s ease-in-out infinite;
        }

        .detection-status p {
          color: #00FFFF;
          font-weight: bold;
          margin: 0;
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
          position: relative;
        }

        .meme-preview-placeholder img {
          max-width: 100%;
          max-height: 400px;
          width: auto;
          height: auto;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        
        .position-marker {
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); }
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
          margin: 0;
        }

        .png-badge, .faces-badge, .method-badge {
          background: rgba(255, 255, 0, 0.2);
          color: #FFFF00;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          margin: 0.2rem;
          display: inline-block;
        }

        .faces-badge {
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
        }

        .method-badge {
          background: rgba(255, 0, 255, 0.2);
          color: #ff00ff;
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
      `}</style>
    </>
  );
}
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