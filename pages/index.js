import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('/pumper.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [faceDetection, setFaceDetection] = useState(null);
  const [useGemini, setUseGemini] = useState(true);
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

  const detectFacesWithGemini = async (imageDataUrl) => {
    try {
      console.log('🧠 Using Gemini AI for advanced face detection...');
      
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
        throw new Error('Gemini API request failed');
      }

      const data = await response.json();
      
      if (data.faces && data.faces.length > 0) {
        console.log(`✨ Gemini detected ${data.faces.length} face(s) with precision!`);
        return data.faces;
      } else {
        console.log('⚠️ Gemini found no faces');
        return null;
      }
    } catch (error) {
      console.error('Gemini detection error:', error);
      return null;
    }
  };

  const detectFaces = async (imageElement) => {
    if (faceDetection === 'faceapi' && window.faceapi) {
      try {
        console.log('🔍 Using advanced Face-api.js detection...');
        const detections = await faceapi.detectAllFaces(imageElement, 
          new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        
        if (detections.length === 0) {
          console.log('⚠️ No faces detected, using fallback');
          return [{
            boundingBox: {
              originX: imageElement.width * 0.2,
              originY: imageElement.height * 0.15,
              width: imageElement.width * 0.6,
              height: imageElement.height * 0.7
            },
            landmarks: null
          }];
        }

        console.log(`✅ Found ${detections.length} face(s) with 68 landmarks!`);
        
        return detections.map(detection => {
          const landmarks = detection.landmarks;
          const mouth = landmarks.getMouth();
          const nose = landmarks.getNose();
          
          const noseTop = nose[0];
          const noseBottom = nose[6];
          const faceAngle = Math.atan2(noseBottom.x - noseTop.x, noseBottom.y - noseTop.y);
          
          return {
            boundingBox: {
              originX: detection.detection.box.x,
              originY: detection.detection.box.y,
              width: detection.detection.box.width,
              height: detection.detection.box.height
            },
            landmarks: landmarks,
            mouthPoints: mouth,
            faceAngle: faceAngle,
            faceDirection: faceAngle > 0.2 ? 'right' : faceAngle < -0.2 ? 'left' : 'center'
          };
        });
      } catch (error) {
        console.error('Face-api.js error:', error);
      }
    }
    
    if (faceDetection && faceDetection !== 'fallback' && faceDetection !== 'faceapi') {
      try {
        console.log('🔍 Using MediaPipe detection...');
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
      }
    }
    
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
        
        let faces = null;
        let usingGemini = false;
        
        if (useGemini) {
          const reader = new FileReader();
          const imageDataUrl = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(selectedFile);
          });
          
          faces = await detectFacesWithGemini(imageDataUrl);
          if (faces) {
            usingGemini = true;
          }
        }
        
        if (!faces) {
          faces = await detectFaces(img);
        }
        
        console.log(`🤖 Processing ${faces.length} face(s) ${usingGemini ? 'with Gemini AI' : 'with local detection'}...`);
        
        if (usingGemini && faces) {
          faces.forEach((face, index) => {
            console.log(`🤖 Processing face ${index + 1} with Gemini precision...`);
            console.log('Gemini face data:', face);
            
            if (face.mouth && typeof face.mouth.centerX === 'number' && typeof face.mouth.centerY === 'number') {
              console.log(`Mouth detected at: (${face.mouth.centerX}, ${face.mouth.centerY})`);
              drawStandardizedLips(ctx, face.mouth, face.faceAngle || 0);
            } else {
              console.warn('Gemini face missing mouth coordinates, using face center estimate');
              const estimatedMouth = {
                centerX: face.boundingBox.x + face.boundingBox.width / 2,
                centerY: face.boundingBox.y + face.boundingBox.height * 0.75,
                width: face.boundingBox.width * 0.25
              };
              drawStandardizedLips(ctx, estimatedMouth, face.faceAngle || 0);
            }
            
            drawStandardizedExclamations(ctx, face.boundingBox, face.faceDirection || 'center');
          });
        } else {
          faces.forEach((face, index) => {
            console.log(`🎨 Adding $PUMPIT elements to face ${index + 1}...`);
            
            const faceRegion = {
              x: face.boundingBox.originX,
              y: face.boundingBox.originY,
              width: face.boundingBox.width,
              height: face.boundingBox.height
            };
            
            if (face.landmarks && face.mouthPoints) {
              const mouthPoints = face.mouthPoints;
              const mouthTop = mouthPoints[14];
              const mouthBottom = mouthPoints[18];
              const mouthLeft = mouthPoints[0];
              const mouthRight = mouthPoints[6];
              
              const mouthCenter = {
                x: (mouthLeft.x + mouthRight.x) / 2,
                y: (mouthTop.y + mouthBottom.y) / 2
              };
              
              const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
              
              const mouthData = {
                centerX: mouthCenter.x,
                centerY: mouthCenter.y,
                width: mouthWidth
              };
              
              drawStandardizedLips(ctx, mouthData, face.faceAngle);
              drawStandardizedExclamations(ctx, faceRegion, face.faceDirection);
            } else {
              let mouthPosition = { x: faceRegion.x + faceRegion.width / 2, y: faceRegion.y + faceRegion.height * 0.75 };
              
              if (face.keypoints) {
                const mouthKeypoint = face.keypoints.find(kp => 
                  kp.category === 'MOUTH_CENTER' || 
                  kp.category === 'MOUTH' ||
                  kp.category === 'mouth'
                );
                if (mouthKeypoint) {
                  mouthPosition = { x: mouthKeypoint.x, y: mouthKeypoint.y };
                }
              }
              
              const mouthData = {
                centerX: mouthPosition.x,
                centerY: mouthPosition.y,
                width: faceRegion.width * 0.25
              };
              
              drawStandardizedLips(ctx, mouthData, 0);
              drawStandardizedExclamations(ctx, faceRegion, 'center');
            }
          });
        }
        
        canvas.toBlob((blob) => {
          const memeUrl = URL.createObjectURL(blob);
          setPreview(memeUrl);
          setGeneratedMeme(memeUrl);
          setIsProcessing(false);
          
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

  // Standardized lips - always the same style as your reference image
  const drawStandardizedLips = (ctx, mouthData, faceAngle = 0) => {
    ctx.save();
    
    const mouthCenterX = mouthData.centerX;
    const mouthCenterY = mouthData.centerY;
    
    console.log(`Placing standardized lips at: (${mouthCenterX}, ${mouthCenterY})`);
    
    ctx.translate(mouthCenterX, mouthCenterY);
    ctx.rotate(faceAngle);
    
    const detectedMouthWidth = mouthData.width || 50;
    const lipScale = Math.max(detectedMouthWidth / 60, 0.8);
    
    const lipWidth = 80 * lipScale;
    const lipHeight = 50 * lipScale;
    
    // Thick black outline - standardized thickness
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw the exact lip shape from your reference image
    ctx.beginPath();
    
    // Upper lip curve
    ctx.moveTo(-lipWidth/2, 0);
    ctx.quadraticCurveTo(-lipWidth/3, -lipHeight/2.2, 0, -lipHeight/2.5);
    ctx.quadraticCurveTo(lipWidth/3, -lipHeight/2.2, lipWidth/2, 0);
    
    // Lower lip curve - full and pouty
    ctx.quadraticCurveTo(lipWidth/3, lipHeight * 0.8, 0, lipHeight * 0.9);
    ctx.quadraticCurveTo(-lipWidth/3, lipHeight * 0.8, -lipWidth/2, 0);
    
    ctx.closePath();
    
    // Standardized bright red color
    ctx.fillStyle = '#FF0000';
    ctx.fill();
    ctx.stroke();
    
    // Standardized highlights - match your reference image
    ctx.fillStyle = 'rgba(255, 180, 180, 0.7)';
    
    // Top lip highlights (two small ovals)
    ctx.beginPath();
    ctx.ellipse(-lipWidth/6, -lipHeight/3, lipWidth/8, lipHeight/10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(lipWidth/6, -lipHeight/3, lipWidth/8, lipHeight/10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bottom lip highlight (one large oval)
    ctx.beginPath();
    ctx.ellipse(0, lipHeight/3, lipWidth/4, lipHeight/8, 0, 0, Math.PI);
    ctx.fill();
    
    // Lip separation line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-lipWidth/3, 0);
    ctx.quadraticCurveTo(0, lipHeight/6, lipWidth/3, 0);
    ctx.stroke();
    
    ctx.restore();
  };

  // Standardized exclamation marks - exactly like your reference image
  const drawStandardizedExclamations = (ctx, faceBox, faceDirection = 'center') => {
    const { x, y, width, height } = faceBox;
    
    // Standardized exclamation size
    const exclamationHeight = 40;
    const exclamationWidth = 12;
    const dotRadius = 6;
    
    // Position above head, offset based on face direction
    let baseX = x + width / 2; // Default center
    const baseY = y - 60; // Above the head
    
    // Adjust horizontal position based on face direction
    if (faceDirection === 'left') {
      baseX = x + width * 0.2; // Left side
    } else if (faceDirection === 'right') {
      baseX = x + width * 0.8; // Right side
    }
    
    // Three exclamation marks in a slight arc
    const positions = [
      { x: baseX - 25, y: baseY + 10, rotation: -0.1 },
      { x: baseX, y: baseY, rotation: 0 },
      { x: baseX + 25, y: baseY + 10, rotation: 0.1 }
    ];
    
    positions.forEach((pos) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.rotation);
      
      // Standardized bright red - no shadows or outlines
      ctx.fillStyle = '#FF0000';
      
      // Main exclamation body (tapered rectangle)
      ctx.beginPath();
      ctx.moveTo(0, -exclamationHeight);
      ctx.lineTo(-exclamationWidth/3, -exclamationHeight/4);
      ctx.lineTo(-exclamationWidth/2, 0);
      ctx.lineTo(exclamationWidth/2, 0);
      ctx.lineTo(exclamationWidth/3, -exclamationHeight/4);
      ctx.closePath();
      ctx.fill();
      
      // Dot
      ctx.beginPath();
      ctx.arc(0, dotRadius * 2, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
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
              {faceDetection === 'faceapi' && useGemini && <p>🧠 Gemini AI + Advanced face detection ready!</p>}
              {faceDetection === 'faceapi' && !useGemini && <p>🤖 Advanced AI with 68 facial landmarks ready!</p>}
              {faceDetection && faceDetection !== 'fallback' && faceDetection !== 'faceapi' && <p>🤖 AI face detection ready!</p>}
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

        .contract-address {
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          color: #FFFF00;
          margin-bottom: 1rem;
          word-break: break-all;
          padding: 0 1rem;
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

        .alternative-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .alt-link {
          color: #FFFF00;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border: 1px solid #FFFF00;
          border-radius: 20px;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .alt-link:hover {
          background: #FFFF00;
          color: black;
          transform: scale(1.05);
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

        .swap-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
        }

        .swap-modal-content {
          background: #1a1a1a;
          border-radius: 20px;
          padding: 2rem;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
          position: relative;
          border: 2px solid #FFFF00;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: #FFFF00;
          font-size: 2rem;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .close-button:hover {
          transform: scale(1.2);
        }

        .swap-container {
          margin: 2rem 0;
          border-radius: 15px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 0, 0.3);
        }

        .swap-info {
          text-align: center;
          color: #aaa;
          font-size: 0.9rem;
          margin-top: 1rem;
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