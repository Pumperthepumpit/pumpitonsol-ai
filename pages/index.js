import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('/pumper.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [faceDetection, setFaceDetection] = useState(null);

  // Initialize MediaPipe Face Detection
  useEffect(() => {
    const loadFaceDetection = async () => {
      try {
        console.log('🤖 Loading AI face detection...');
        
        // Load MediaPipe Face Detection
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');
    setGeneratedMeme(null);
    
    // Show original image preview immediately
    const originalPreview = URL.createObjectURL(file);
    setPreview(originalPreview);
  };

  const detectFaces = async (imageElement) => {
    if (!faceDetection || faceDetection === 'fallback') {
      // Fallback: assume face in center
      return [{
        boundingBox: {
          originX: imageElement.width * 0.2,
          originY: imageElement.height * 0.15,
          width: imageElement.width * 0.6,
          height: imageElement.height * 0.7
        },
        keypoints: [
          // Estimate mouth keypoints
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
      // Return fallback
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
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Detect faces using AI
        const faces = await detectFaces(img);
        console.log(`🤖 Processing ${faces.length} detected face(s)...`);
        
        // Add meme effects
        addMemeEffects(ctx, canvas.width, canvas.height);
        
        // Process each detected face
        faces.forEach((face, index) => {
          console.log(`🎨 Adding $PUMPIT elements to face ${index + 1}...`);
          
          // Convert MediaPipe detection to our format
          const faceRegion = {
            x: face.boundingBox.originX,
            y: face.boundingBox.originY,
            width: face.boundingBox.width,
            height: face.boundingBox.height
          };
          
          // Find mouth position from keypoints or estimate
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
          
          drawAIRedLips(ctx, faceRegion, mouthPosition);
          drawExclamationMarks(ctx, faceRegion);
        });
        
        // Convert to blob and show result
        canvas.toBlob((blob) => {
          const memeUrl = URL.createObjectURL(blob);
          setPreview(memeUrl);
          setGeneratedMeme(memeUrl);
          setIsProcessing(false);
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

  // Enhanced lip drawing with AI positioning
  const drawAIRedLips = (ctx, faceRegion, mouthPosition) => {
    const mouthX = mouthPosition.x;
    const mouthY = mouthPosition.y;
    
    // Scale lip size based on face size
    const faceSize = Math.min(faceRegion.width, faceRegion.height);
    const mouthWidth = faceSize * 0.35;
    const mouthHeight = faceSize * 0.08;
    
    ctx.save();
    
    // Create gradient
    const gradient = ctx.createRadialGradient(mouthX, mouthY, 0, mouthX, mouthY, mouthWidth);
    gradient.addColorStop(0, '#FF4444');
    gradient.addColorStop(0.7, '#FF0000');
    gradient.addColorStop(1, '#CC0000');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#AA0000';
    ctx.lineWidth = Math.max(2, faceSize * 0.005);
    
    // Draw upper lip
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY - mouthHeight * 0.3, mouthWidth * 0.9, mouthHeight * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw lower lip
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY + mouthHeight * 0.5, mouthWidth * 0.8, mouthHeight * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Add highlights
    ctx.fillStyle = '#FF8888';
    ctx.beginPath();
    ctx.ellipse(mouthX - mouthWidth * 0.3, mouthY - mouthHeight * 0.2, mouthWidth * 0.2, mouthHeight * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FF6666';
    ctx.beginPath();
    ctx.ellipse(mouthX - mouthWidth * 0.2, mouthY + mouthHeight * 0.3, mouthWidth * 0.15, mouthHeight * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  // Meme generation functions
  const addMemeEffects = (ctx, width, height) => {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 100, 100, 0.1)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  };

  const drawExclamationMarks = (ctx, faceRegion) => {
    const { x, y, width, height } = faceRegion;
    
    const exclamationSize = Math.max(width * 0.15, 25);
    const exclamationY = y - height * 0.3;
    
    const positions = [
      { x: x + width * 0.2, y: exclamationY + exclamationSize * 0.3 },
      { x: x + width * 0.5, y: exclamationY },
      { x: x + width * 0.8, y: exclamationY + exclamationSize * 0.3 }
    ];
    
    ctx.save();
    
    const gradient = ctx.createLinearGradient(0, exclamationY - exclamationSize, 0, exclamationY + exclamationSize);
    gradient.addColorStop(0, '#FF4444');
    gradient.addColorStop(0.5, '#FF0000');
    gradient.addColorStop(1, '#CC0000');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#AA0000';
    ctx.lineWidth = 2;
    
    positions.forEach((pos, index) => {
      const rotation = (index - 1) * 0.1;
      
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rotation);
      
      const bodyWidth = exclamationSize * 0.35;
      const bodyHeight = exclamationSize * 0.75;
      
      ctx.beginPath();
      ctx.roundRect(-bodyWidth / 2, -bodyHeight, bodyWidth, bodyHeight, bodyWidth * 0.3);
      ctx.fill();
      ctx.stroke();
      
      const dotRadius = exclamationSize * 0.18;
      ctx.beginPath();
      ctx.arc(0, dotRadius * 1.5, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#FF8888';
      ctx.beginPath();
      ctx.arc(-dotRadius * 0.3, -bodyHeight * 0.3, dotRadius * 0.4, 0, Math.PI * 2);
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
      </Head>

      <div className="social-buttons">
        <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer" className="social-button">
          🐦 X / Twitter
        </a>
        <a href="https://www.tiktok.com/@pumper.the.pumpit" target="_blank" rel="noopener noreferrer" className="social-button">
          🎵 TikTok
        </a>
      </div>

      <header>
        <div className="pumper-float">
          <img src="/pumper.png" alt="Pumper - PumpItOnSol Mascot" />
        </div>
        <h1>$PUMPIT</h1>
        <p>Solana's most recognized meme</p>
      </header>

      <nav>
        <a href="#vision">Vision</a>
        <a href="#about">About</a>
        <a href="#generator">Generate</a>
        <a href="#roadmap">Roadmap</a>
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
            <p>Contract Address: Coming Soon</p>
            <p>Total Supply: 1,000,000,000 $PUMPIT</p>
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
              
              {selectedFile && (
                <p className="file-selected">
                  ✅ Selected: {selectedFile.name}
                </p>
              )}
            </div>
            
            <div className="generate-section">
              <button 
                onClick={generateMeme}
                disabled={!selectedFile || isProcessing}
                className="generate-button"
              >
                {isProcessing ? '🤖 AI Generating Your $PUMPIT Meme...' : '🔥 Generate AI $PUMPIT Meme'}
              </button>
              
              {generatedMeme && (
                <button 
                  onClick={downloadMeme}
                  className="generate-button"
                  style={{marginLeft: '1rem', background: 'linear-gradient(135deg, #28a745, #20c997)'}}
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
            <li>📋 Phase 5: Real-time stats + game integrations</li>
          </ul>
        </section>

        <section id="community" className="reveal">
          <h2>🔥 Latest Community Memes</h2>
          <div className="community-memes">
            <div className="meme-card">
              <img src="https://via.placeholder.com/300x300.png?text=Meme+1" alt="Community Meme 1" />
              <p>Created by @cryptowhale</p>
            </div>
            <div className="meme-card">
              <img src="https://via.placeholder.com/300x300.png?text=Meme+2" alt="Community Meme 2" />
              <p>Created by @solanagang</p>
            </div>
            <div class

ame-card">
              <img src="https://via.placeholder.com/300x300.png?text=Meme+3" alt="Community Meme 3" />
              <p>Created by @pumpersfan</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2025 PumpItOnSol. Powered by AI and the community. 🤖🚀</p>
      </footer>
    </>
  );
}