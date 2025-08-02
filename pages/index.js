import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
  const [isLoadingMemes, setIsLoadingMemes] = useState(true);
  const [likedMemes, setLikedMemes] = useState([]);
  const [shareAnimatingId, setShareAnimatingId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    vision: false,
    about: false
  });
  const [jupiterLoaded, setJupiterLoaded] = useState(false);
  
  // New states for draggable overlays
  const [showOverlays, setShowOverlays] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Position states for overlays
  const [lipPosition, setLipPosition] = useState({ x: 0, y: 0 });
  const [lipScale, setLipScale] = useState(1);
  const [lipRotation, setLipRotation] = useState(0);
  
  const [exclamationPosition, setExclamationPosition] = useState({ x: 0, y: 0 });
  const [exclamationScale, setExclamationScale] = useState(1);
  const [exclamationRotation, setExclamationRotation] = useState(0);
  
  // Drag state
  const [dragging, setDragging] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // Touch gesture states
  const [touches, setTouches] = useState([]);
  const [gestureStart, setGestureStart] = useState({ distance: 0, angle: 0, scale: 1, rotation: 0 });
  
  // Refs
  const containerRef = useRef(null);
  const lipRef = useRef(null);
  const exclamationRef = useRef(null);

  // Fetch community memes from Supabase
  useEffect(() => {
    fetchCommunityMemes();
    // Load liked memes from localStorage
    const stored = localStorage.getItem('likedMemes');
    if (stored) {
      setLikedMemes(JSON.parse(stored));
    }
  }, []);

  const fetchCommunityMemes = async () => {
    try {
      setIsLoadingMemes(true);
      
      // First, get the top meme by combined score
      const { data: allMemes, error: allError } = await supabase
        .from('memes')
        .select('*')
        .order('likes_count', { ascending: false, nullsFirst: false });
      
      if (allError) throw allError;
      
      // Calculate combined scores and sort
      const memesWithScores = (allMemes || []).map(meme => ({
        ...meme,
        combinedScore: (meme.likes_count || 0) + (meme.shares_count || 0)
      })).sort((a, b) => b.combinedScore - a.combinedScore);
      
      // Get the top meme
      const topMeme = memesWithScores[0];
      
      // Get the 5 most recent memes (excluding the top meme if it's also recent)
      const { data: recentMemes, error: recentError } = await supabase
        .from('memes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (recentError) throw recentError;
      
      // Filter out the top meme from recent if it's there, and take only 5
      const filteredRecent = (recentMemes || [])
        .filter(meme => !topMeme || meme.id !== topMeme.id)
        .slice(0, 5);
      
      // Combine: top meme + 5 most recent
      const finalMemes = topMeme ? [topMeme, ...filteredRecent] : filteredRecent;
      
      setCommunityMemes(finalMemes);
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setIsLoadingMemes(false);
    }
  };

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

  // Mouse/Touch event handlers
  const handleMouseDown = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    // Check if Alt key is pressed for rotation on desktop
    if (e.altKey && e.type === 'mousedown') {
      setDragging(element + '-rotate');
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
      setDragStart({ x: clientX, y: clientY, angle });
      if (element === 'lips') {
        setStartPos({ rotation: lipRotation });
      } else {
        setStartPos({ rotation: exclamationRotation });
      }
      return;
    }
    
    setDragging(element);
    setDragStart({ x: clientX, y: clientY });
    
    if (element === 'lips') {
      setStartPos({ x: lipPosition.x, y: lipPosition.y });
    } else {
      setStartPos({ x: exclamationPosition.x, y: exclamationPosition.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    
    e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // Handle rotation
    if (dragging.includes('-rotate')) {
      const element = dragging.replace('-rotate', '');
      const rect = element === 'lips' ? lipRef.current?.getBoundingClientRect() : exclamationRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
        const deltaAngle = angle - dragStart.angle;
        
        if (element === 'lips') {
          setLipRotation(startPos.rotation + deltaAngle);
        } else {
          setExclamationRotation(startPos.rotation + deltaAngle);
        }
      }
      return;
    }
    
    // Handle regular drag - NO BOUNDARIES
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    if (dragging === 'lips') {
      setLipPosition({
        x: startPos.x + deltaX,
        y: startPos.y + deltaY
      });
    } else if (dragging === 'exclamation') {
      setExclamationPosition({
        x: startPos.x + deltaX,
        y: startPos.y + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  // Touch gesture handlers for pinch and rotate
  const handleTouchStart = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      // Single touch - start drag
      handleMouseDown(e, element);
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch/rotate
      setDragging(null); // Cancel any drag
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      setGestureStart({
        distance,
        angle,
        scale: element === 'lips' ? lipScale : exclamationScale,
        rotation: element === 'lips' ? lipRotation : exclamationRotation,
        element
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && gestureStart.element) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate new distance for pinch
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // Calculate new angle for rotation
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      // Apply scale
      const scaleDelta = distance / gestureStart.distance;
      const newScale = Math.max(0.3, Math.min(3, gestureStart.scale * scaleDelta));
      
      // Apply rotation
      const rotationDelta = angle - gestureStart.angle;
      const newRotation = gestureStart.rotation + rotationDelta;
      
      if (gestureStart.element === 'lips') {
        setLipScale(newScale);
        setLipRotation(newRotation);
      } else {
        setExclamationScale(newScale);
        setExclamationRotation(newRotation);
      }
    } else if (e.touches.length === 1 && dragging) {
      // Continue single touch drag
      handleMouseMove(e);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      setDragging(null);
      setGestureStart({ distance: 0, angle: 0, scale: 1, rotation: 0, element: null });
    }
  };

  // Add global mouse/touch listeners
  useEffect(() => {
    if (dragging) {
      // Add listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = dragging.includes('-rotate') ? 'grabbing' : 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [dragging, dragStart, startPos]);

  // Handle wheel for scaling
  const handleWheel = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    
    if (element === 'lips') {
      setLipScale(prev => Math.max(0.3, Math.min(3, prev + delta)));
    } else {
      setExclamationScale(prev => Math.max(0.3, Math.min(3, prev + delta)));
    }
  };

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
    
    // Reset positions when new image is selected
    setLipPosition({ x: 0, y: 0 });
    setExclamationPosition({ x: 0, y: 0 });
    setLipScale(1);
    setExclamationScale(1);
    setLipRotation(0);
    setExclamationRotation(0);
    
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
    e.stopPropagation();
    
    const formData = new FormData(e.target);
    const inputValue = formData.get('xhandle');
    
    // Require at least 2 characters for a valid handle
    if (inputValue && inputValue.trim().length >= 2) {
      // Add @ if user didn't include it
      const formattedHandle = inputValue.startsWith('@') ? inputValue : `@${inputValue}`;
      setXHandle(formattedHandle);
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
        
        // Set positions
        setLipPosition({ x: lipX, y: lipY });
        setExclamationPosition({ x: exclamationX, y: exclamationY });
        setLipScale(1);
        setExclamationScale(1);
        setLipRotation(0);
        setExclamationRotation(0);
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
      
      // Get the displayed image size
      const displayedImg = container.querySelector('.preview-image');
      const displayedImgRect = displayedImg.getBoundingClientRect();
      
      // Calculate scale factors
      const scaleX = img.width / displayedImgRect.width;
      const scaleY = img.height / displayedImgRect.height;
      
      // Debug logging
      console.log('Image dimensions:', { 
        original: { w: img.width, h: img.height },
        displayed: { w: displayedImgRect.width, h: displayedImgRect.height },
        scaleX, scaleY,
        lipImageSize: { w: lipImage.width, h: lipImage.height }
      });
      
      // Calculate base scale to match 120px display size
      const baseDisplaySize = 120; // This matches the CSS width
      // Simple approach: just scale based on what we see
      const lipBaseScale = (baseDisplaySize * scaleX) / lipImage.width;
      const exclamationBaseScale = (baseDisplaySize * scaleX) / exclamationImage.width;
      
      console.log('Scale calculations:', {
        baseDisplaySize,
        lipBaseScale,
        lipScale,
        finalScale: lipBaseScale * lipScale
      });
      
      // Draw lips with proper transformation order (matches CSS)
      ctx.save();
      
      // Calculate final scaled dimensions
      const finalLipScale = (lipBaseScale * lipScale) / 2;
      const scaledLipWidth = lipImage.width * finalLipScale;
      const scaledLipHeight = lipImage.height * finalLipScale;
      
      // Calculate center position in canvas coordinates
      const lipCenterX = (displayedImgRect.width / 2 + lipPosition.x) * scaleX;
      const lipCenterY = (displayedImgRect.height / 2 + lipPosition.y) * scaleY;
      
      // Translate to center, rotate, then offset for drawing
      ctx.translate(lipCenterX, lipCenterY);
      ctx.rotate(lipRotation * Math.PI / 180);
      
      // Draw centered at origin (which is now the rotated center)
      ctx.drawImage(
        lipImage,
        -scaledLipWidth / 2,
        -scaledLipHeight / 2,
        scaledLipWidth,
        scaledLipHeight
      );
      ctx.restore();
      
      // Draw exclamation with proper transformation order (matches CSS)
      ctx.save();
      
      // Calculate final scaled dimensions
      const finalExclamationScale = (exclamationBaseScale * exclamationScale) / 2;
      const scaledExclamationWidth = exclamationImage.width * finalExclamationScale;
      const scaledExclamationHeight = exclamationImage.height * finalExclamationScale;
      
      // Calculate center position in canvas coordinates
      const exclamationCenterX = (displayedImgRect.width / 2 + exclamationPosition.x) * scaleX;
      const exclamationCenterY = (displayedImgRect.height / 2 + exclamationPosition.y) * scaleY;
      
      // Translate to center, rotate, then offset for drawing
      ctx.translate(exclamationCenterX, exclamationCenterY);
      ctx.rotate(exclamationRotation * Math.PI / 180);
      
      // Draw centered at origin (which is now the rotated center)
      ctx.drawImage(
        exclamationImage,
        -scaledExclamationWidth / 2,
        -scaledExclamationHeight / 2,
        scaledExclamationWidth,
        scaledExclamationHeight
      );
      ctx.restore();
      
      // Convert to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      // Upload to Supabase Storage
      const fileName = `meme-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memes')
        .upload(fileName, blob, {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memes')
        .getPublicUrl(fileName);

      // Save to database
      const { data: memeData, error: dbError } = await supabase
        .from('memes')
        .insert({
          image_url: publicUrl,
          creator_x_handle: xHandle,
          creator_wallet: walletAddress
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Download locally
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `pumpit-meme-${Date.now()}.png`;
      a.click();
      
      setGeneratedMeme(publicUrl);
      
      // Refresh community memes
      fetchCommunityMemes();
      
      // Show share options
      setTimeout(() => {
        if (confirm('Meme created! Share it on X/Twitter?')) {
          shareOnTwitter(memeData.id);
        }
      }, 500);
      
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to save meme: ' + error.message);
    }
  };

  // Like/Unlike functionality
  const handleLike = async (memeId) => {
    const isLiked = likedMemes.includes(memeId);
    
    try {
      // Get current meme data
      const meme = communityMemes.find(m => m.id === memeId);
      if (!meme) return;
      
      // Update likes count
      const newLikesCount = isLiked ? meme.likes_count - 1 : meme.likes_count + 1;
      
      // Update in database
      const { error } = await supabase
        .from('memes')
        .update({ likes_count: newLikesCount })
        .eq('id', memeId);
        
      if (error) throw error;
      
      // Update local state
      if (isLiked) {
        setLikedMemes(prev => {
          const updated = prev.filter(id => id !== memeId);
          localStorage.setItem('likedMemes', JSON.stringify(updated));
          return updated;
        });
      } else {
        setLikedMemes(prev => {
          const updated = [...prev, memeId];
          localStorage.setItem('likedMemes', JSON.stringify(updated));
          return updated;
        });
      }
      
      // Refresh memes to show updated counts
      fetchCommunityMemes();
      
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  // Share functions with tracking
  const shareOnTwitter = async (memeId) => {
    // Find the meme to get creator info
    const meme = communityMemes.find(m => m.id === memeId);
    if (!meme) return;
    
    // Trigger animation
    setShareAnimatingId(memeId);
    setTimeout(() => setShareAnimatingId(null), 600);
    
    // Update share count FIRST
    try {
      const newShareCount = (meme.shares_count || 0) + 1;
      
      const { data, error } = await supabase
        .from('memes')
        .update({ shares_count: newShareCount })
        .eq('id', memeId)
        .select();
      
      if (error) {
        console.error('Error updating share count:', error);
      } else {
        // Update local state immediately to show the change
        setCommunityMemes(prev => prev.map(m => 
          m.id === memeId ? { ...m, shares_count: newShareCount } : m
        ));
      }
    } catch (error) {
      console.error('Error updating share count:', error);
    }
    
    // Then open Twitter share dialog with new message
    const memeUrl = `${window.location.origin}/meme/${memeId}`;
    const creatorHandle = meme.creator_x_handle || 'anonymous';
    const text = `Sharing meme created by ${creatorHandle} 🚀\n\nJoin the movement: letspumpit.com`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(memeUrl)}&hashtags=PUMPIT,Solana,PumpItOnSol`;
    window.open(twitterUrl, '_blank');
  };

  const shareOnTelegram = async (memeId, imageUrl) => {
    // Find the meme to get creator info
    const meme = communityMemes.find(m => m.id === memeId);
    if (!meme) return;
    
    // Trigger animation
    setShareAnimatingId(memeId);
    setTimeout(() => setShareAnimatingId(null), 600);
    
    // Update share count FIRST
    try {
      const newShareCount = (meme.shares_count || 0) + 1;
      
      const { data, error } = await supabase
        .from('memes')
        .update({ shares_count: newShareCount })
        .eq('id', memeId)
        .select();
      
      if (error) {
        console.error('Error updating share count:', error);
      } else {
        // Update local state immediately to show the change
        setCommunityMemes(prev => prev.map(m => 
          m.id === memeId ? { ...m, shares_count: newShareCount } : m
        ));
      }
    } catch (error) {
      console.error('Error updating share count:', error);
    }
    
    // Then open Telegram share dialog with new message
    const creatorHandle = meme.creator_x_handle || 'anonymous';
    const text = `Sharing meme created by ${creatorHandle} 🚀\n\nVisit: letspumpit.com\nJoin us at @Pumpetcto`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(imageUrl)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
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

  // Get transform style as string
  const getLipTransform = () => {
    return `translate(${lipPosition.x}px, ${lipPosition.y}px) scale(${lipScale}) rotate(${lipRotation}deg)`;
  };

  const getExclamationTransform = () => {
    return `translate(${exclamationPosition.x}px, ${exclamationPosition.y}px) scale(${exclamationScale}) rotate(${exclamationRotation}deg)`;
  };

  // Close modal handler
  const handleModalClose = (e) => {
    // Only close if clicking the modal background, not the form
    if (e.target.classList.contains('x-form-modal')) {
      setShowXForm(false);
    }
  };

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
          𝕏
        </a>
        <a href="https://www.tiktok.com/@pumper.the.pumpit" target="_blank" rel="noopener noreferrer" className="social-button">
          ♪ TikTok
        </a>
        <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer" className="social-button">
          TG
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
            <p>Making Solana smile, one meme at a time</p>
            <div className="mobile-social-icons">
              <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer" title="X/Twitter">
                𝕏
              </a>
              <a href="https://www.tiktok.com/@pumper.the.pumpit" target="_blank" rel="noopener noreferrer" title="TikTok">
                ♪
              </a>
              <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer" title="Telegram">
                TG
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
              <div className="x-form-modal" onClick={handleModalClose}>
                <form onSubmit={handleXHandleSubmit} className="x-form" onClick={(e) => e.stopPropagation()}>
                  <h3>Enter your X handle to continue</h3>
                  <input
                    type="text"
                    name="xhandle"
                    placeholder="@yourhandle"
                    required
                    minLength="2"
                    autoComplete="off"
                    autoFocus
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
                      name="xhandle"
                      placeholder="@yourhandle"
                      required
                      minLength="2"
                      autoComplete="off"
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
                onClick={(e) => {
                  // Only trigger file input if clicking on the empty upload area
                  if (!selectedFile && e.target.classList.contains('modern-upload-zone')) {
                    document.getElementById('memeImage').click();
                  }
                }}
              >
                <input 
                  type="file" 
                  id="memeImage" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                {!selectedFile ? (
                  <div className="upload-content" onClick={() => document.getElementById('memeImage').click()}>
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
                        <div
                          ref={lipRef}
                          className={`overlay-element ${dragging === 'lips' || dragging === 'lips-rotate' ? 'dragging' : ''}`}
                          style={{
                            transform: getLipTransform()
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'lips')}
                          onTouchStart={(e) => handleTouchStart(e, 'lips')}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onWheel={(e) => handleWheel(e, 'lips')}
                        >
                          <img src="/meme-assets/lips.png" alt="Lips" draggable={false} />
                        </div>
                        
                        <div
                          ref={exclamationRef}
                          className={`overlay-element ${dragging === 'exclamation' || dragging === 'exclamation-rotate' ? 'dragging' : ''}`}
                          style={{
                            transform: getExclamationTransform()
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'exclamation')}
                          onTouchStart={(e) => handleTouchStart(e, 'exclamation')}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onWheel={(e) => handleWheel(e, 'exclamation')}
                        >
                          <img src="/meme-assets/exclamation.png" alt="Exclamation" draggable={false} />
                        </div>
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
                  <p className="desktop-hint">🖱️ Drag to move • Scroll to resize • Alt+drag to rotate</p>
                  <p className="mobile-hint">👆 Drag to move • 🤏 Pinch to resize • 🔄 Twist to rotate</p>
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
            <h2>🔥 Top Community Memes</h2>
            <div className="community-memes">
              {isLoadingMemes ? (
                <div className="loading-memes">
                  <p>Loading awesome memes...</p>
                </div>
              ) : communityMemes.length > 0 ? (
                communityMemes.map((meme) => (
                  <div key={meme.id} className="meme-card">
                    <img src={meme.image_url} alt={`Community Meme by ${meme.creator_x_handle}`} />
                    <div className="meme-info">
                      <p className="creator">by {meme.creator_x_handle}</p>
                      <div className="meme-stats">
                        <button 
                          onClick={() => handleLike(meme.id)}
                          className={`like-button ${likedMemes.includes(meme.id) ? 'liked' : ''}`}
                          type="button"
                        >
                          ❤️ {meme.likes_count}
                        </button>
                        <span className={`share-counter ${meme.id === shareAnimatingId ? 'animating' : ''}`}>
                          🔄 {meme.shares_count}
                        </span>
                      </div>
                      <div className="share-buttons">
                        <button 
                          onClick={() => shareOnTwitter(meme.id)}
                          className="share-btn twitter"
                          type="button"
                        >
                          𝕏 Share
                        </button>
                        <button 
                          onClick={() => shareOnTelegram(meme.id, meme.image_url)}
                          className="share-btn telegram"
                          type="button"
                        >
                          TG Share
                        </button>
                      </div>
                    </div>
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
                <h3>𝕏 Latest from X/Twitter</h3>
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
                <h3>TG Community Updates</h3>
                <div className="community-links">
                  <a 
                    href="https://t.me/Pumpetcto" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="community-button telegram"
                  >
                    <span className="icon">TG</span>
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
                    <span className="icon">♪</span>
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
                    <span className="icon">𝕏</span>
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
          justify-content: center;
        }

        .mobile-social-icons a {
          text-decoration: none;
          transition: transform 0.3s ease;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }

        .mobile-social-icons a:hover {
          transform: scale(1.2);
          background: rgba(255, 255, 255, 0.1);
          border-color: #FFFF00;
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
          background: transparent;
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
          opacity: 0.15;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          filter: blur(2px) drop-shadow(0 0 60px rgba(255, 255, 0, 0.6));
          z-index: 0;
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
          cursor: pointer;
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
          overflow: visible;
        }

        .preview-image {
          max-width: 100%;
          max-height: 500px;
          border-radius: 10px;
          user-select: none;
          -webkit-user-drag: none;
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
          z-index: 10;
        }

        .overlay-element:active {
          cursor: grabbing;
        }

        .overlay-element.dragging {
          filter: drop-shadow(0 10px 30px rgba(255, 255, 0, 0.5));
          cursor: grabbing;
          z-index: 20;
        }

        .overlay-element img {
          width: 120px;
          height: auto;
          pointer-events: none;
          display: block;
          transform: translate(-50%, -50%);
          user-select: none;
          -webkit-user-drag: none;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
          flex-wrap: wrap;
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

        .gesture-hints .desktop-hint {
          display: block;
        }

        .gesture-hints .mobile-hint {
          display: none;
        }

        @media (max-width: 768px) {
          .gesture-hints .desktop-hint {
            display: none;
          }
          
          .gesture-hints .mobile-hint {
            display: block;
          }
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
          height: auto;
          object-fit: contain;
          max-height: 400px;
          background: #000;
        }

        .meme-info {
          padding: 1rem;
        }

        .meme-card .creator {
          text-align: center;
          color: #FFFF00;
          margin: 0.5rem 0;
          font-weight: 500;
        }

        .meme-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin: 0.5rem 0;
          color: #999;
          font-size: 0.9rem;
          align-items: center;
        }

        .like-button {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0.5rem;
          border-radius: 20px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }

        .like-button:hover {
          background: rgba(255, 255, 0, 0.1);
          color: #FFFF00;
          transform: scale(1.1);
        }

        .like-button:active {
          transform: scale(0.95);
        }

        .like-button.liked {
          color: #FFFF00;
        }

        .like-button.liked:hover {
          transform: scale(1.15);
        }

        .share-counter {
          color: #999;
          padding: 0.5rem;
          border-radius: 20px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .share-counter.animating {
          animation: shareAnimation 0.6s ease;
          color: #FFFF00;
        }

        @keyframes shareAnimation {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.3) rotate(180deg); }
          50% { transform: scale(1.3) rotate(360deg); }
          100% { transform: scale(1) rotate(360deg); }
        }

        .share-buttons {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .share-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        .share-btn:active {
          transform: scale(0.95);
        }

        .share-btn.twitter {
          background: #1DA1F2;
          color: white;
        }

        .share-btn.twitter:hover {
          background: #1a8cd8;
          transform: translateY(-1px);
        }

        .share-btn.telegram {
          background: #0088cc;
          color: white;
        }

        .share-btn.telegram:hover {
          background: #0077b3;
          transform: translateY(-1px);
        }

        .loading-memes {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
          color: #FFFF00;
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