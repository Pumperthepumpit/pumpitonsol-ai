import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';

export default function Home() {
  // ========== PART 1: STATE VARIABLES ==========
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
  const [sharedMemes, setSharedMemes] = useState([]);
  const [dailyMemeCount, setDailyMemeCount] = useState(0);
  const [shareAnimatingId, setShareAnimatingId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    vision: false,
    about: false
  });
  const [jupiterLoaded, setJupiterLoaded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentMemeId, setCurrentMemeId] = useState(null);
  
  const [showOverlays, setShowOverlays] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [lipPosition, setLipPosition] = useState({ x: 0, y: 0 });
  const [lipScale, setLipScale] = useState(1);
  const [lipRotation, setLipRotation] = useState(0);
  
  const [exclamationPosition, setExclamationPosition] = useState({ x: 0, y: 0 });
  const [exclamationScale, setExclamationScale] = useState(1);
  const [exclamationRotation, setExclamationRotation] = useState(0);
  
  const [dragging, setDragging] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  const [touches, setTouches] = useState([]);
  const [gestureStart, setGestureStart] = useState({ distance: 0, angle: 0, scale: 1, rotation: 0 });
  
  const containerRef = useRef(null);
  const lipRef = useRef(null);
  const exclamationRef = useRef(null);

  const [premiumUsername, setPremiumUsername] = useState('');
  const [isVerifiedPremium, setIsVerifiedPremium] = useState(false);
  const [premiumExpiry, setPremiumExpiry] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activePremiumTool, setActivePremiumTool] = useState(null);
  const [showPremiumTools, setShowPremiumTools] = useState(false);
  
  const [xConnected, setXConnected] = useState(false);
  const [xProfile, setXProfile] = useState(null);
  const [xVerified, setXVerified] = useState(false);
  const [connectingX, setConnectingX] = useState(false);
  
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [trendMeme, setTrendMeme] = useState(null);
  
  const [tokenAddress, setTokenAddress] = useState('');
  const [isAnalyzingToken, setIsAnalyzingToken] = useState(false);
  const [tokenAnalysis, setTokenAnalysis] = useState(null);
  
  const [contractCode, setContractCode] = useState('');
  const [isAnalyzingContract, setIsAnalyzingContract] = useState(false);
  const [contractMeme, setContractMeme] = useState(null);
  
  const [whitepaperFile, setWhitepaperFile] = useState(null);
  const [isProcessingWhitepaper, setIsProcessingWhitepaper] = useState(false);
  const [whitepaperMemes, setWhitepaperMemes] = useState([]);
  
  const [translationText, setTranslationText] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState({});
  
  const [viralSituation, setViralSituation] = useState('');
  const [isGeneratingViral, setIsGeneratingViral] = useState(false);
  const [viralResult, setViralResult] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [viralStats, setViralStats] = useState(null);
  
  const availableLanguages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'fil', name: 'Filipino' },
    { code: 'he', name: 'Hebrew' }
  ];
  
  const [userStats, setUserStats] = useState({
    dailyLimit: 1,
    memesCreatedToday: 0,
    remainingToday: 1,
    totalMemes: 0,
    totalLikes: 0,
    totalShares: 0
  });
  
  // ========== PART 2: USE EFFECTS ==========
  useEffect(() => {
    fetchCommunityMemes();
    fetchDailyMemeCount();
    checkPremiumStatus();
    checkXConnection();
    loadUserStats();
    
    const stored = localStorage.getItem('likedMemes');
    if (stored) {
      setLikedMemes(JSON.parse(stored));
    }
    const storedShares = localStorage.getItem('sharedMemes');
    if (storedShares) {
      setSharedMemes(JSON.parse(storedShares));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      document.body.appendChild(script);
      
      script.onload = () => {
        if (window.twttr && window.twttr.widgets) {
          window.twttr.widgets.load();
        }
      };
    }
  }, []);

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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleXCallback(code, state);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    calculateDailyLimit();
  }, [xConnected, isVerifiedPremium, xVerified]);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      
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
  
  // ========== PART 3: X CONNECTION & PREMIUM FUNCTIONS ==========
  const connectWithX = async () => {
    setConnectingX(true);
    try {
      const response = await fetch('/api/auth/x-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'initiate',
          redirectUrl: window.location.origin + '/auth/callback'
        })
      });
      
      const data = await response.json();
      if (data.authUrl) {
        localStorage.setItem('x_oauth_state', data.state);
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('X connection error:', error);
      setError('Failed to connect with X');
    } finally {
      setConnectingX(false);
    }
  };

  const handleXCallback = async (code, state) => {
    try {
      const storedState = localStorage.getItem('x_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid OAuth state');
      }
      
      const response = await fetch('/api/auth/x-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });
      
      const data = await response.json();
      if (data.success) {
        setXProfile(data.profile);
        setXConnected(true);
        setXVerified(data.profile.verified);
        
        localStorage.setItem('xProfile', JSON.stringify(data.profile));
        localStorage.setItem('xAccessToken', data.accessToken);
        
        calculateDailyLimit();
        alert(`Successfully connected as @${data.profile.username}!`);
      }
    } catch (error) {
      console.error('Callback error:', error);
      setError('Failed to complete X connection');
    }
  };

  const disconnectX = () => {
    setXConnected(false);
    setXProfile(null);
    setXVerified(false);
    localStorage.removeItem('xProfile');
    localStorage.removeItem('xAccessToken');
    calculateDailyLimit();
  };

  const checkXConnection = async () => {
    const storedXProfile = localStorage.getItem('xProfile');
    if (storedXProfile) {
      const profile = JSON.parse(storedXProfile);
      setXProfile(profile);
      setXConnected(true);
      setXVerified(profile.verified || false);
      updateUserLimits(profile);
    }
  };

  const checkPremiumStatus = async () => {
    const storedUsername = localStorage.getItem('premiumUsername');
    if (storedUsername) {
      setPremiumUsername(storedUsername);
      await verifyPremiumAccess(storedUsername);
    }
  };

  const verifyPremiumAccess = async (username) => {
    if (!username) {
      setError('Please enter your Telegram username');
      return;
    }
    
    console.log('Verifying premium for:', username);
    
    try {
      const response = await fetch('/api/verify-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success && data.isPremium) {
        setIsVerifiedPremium(true);
        setPremiumExpiry(data.expiresAt);
        localStorage.setItem('premiumUsername', username);
        calculateDailyLimit();
        alert('Premium access verified! All tools unlocked.');
        setShowPremiumModal(false);
        setError('');
        return true;
      } else {
        setIsVerifiedPremium(false);
        setError('No active premium subscription found. Subscribe via @pumpermemebot');
        return false;
      }
    } catch (error) {
      console.error('Premium verification error:', error);
      setError('Failed to verify premium status');
      return false;
    }
  };

  const loadUserStats = async () => {
    try {
      const userId = xProfile?.id || localStorage.getItem('userId') || 'anonymous';
      const today = new Date().toDateString();
      const storedStats = localStorage.getItem(`memeStats_${today}`);
      
      if (storedStats) {
        const stats = JSON.parse(storedStats);
        setUserStats(prev => ({ ...prev, ...stats }));
      }
      
      calculateDailyLimit();
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const calculateDailyLimit = () => {
    let limit = 1;
    
    if (xConnected) limit = 2;
    if (isVerifiedPremium) limit = 3;
    if (isVerifiedPremium && xConnected) limit = 5;
    if (isVerifiedPremium && xVerified) limit = 10;
    
    setUserStats(prev => ({
      ...prev,
      dailyLimit: limit,
      remainingToday: Math.max(0, limit - prev.memesCreatedToday)
    }));
  };

  const updateUserLimits = (profile) => {
    calculateDailyLimit();
  };

  const incrementMemeCount = (count = 1) => {
    const today = new Date().toDateString();
    setUserStats(prev => {
      const updated = {
        ...prev,
        memesCreatedToday: prev.memesCreatedToday + count,
        remainingToday: Math.max(0, prev.dailyLimit - (prev.memesCreatedToday + count)),
        totalMemes: prev.totalMemes + count
      };
      
      localStorage.setItem(`memeStats_${today}`, JSON.stringify(updated));
      return updated;
    });
    
    setDailyMemeCount(prev => prev + count);
  };
  
const generateViralMeme = async () => {
  if (!viralSituation) {
    setError('Please describe what you want to generate');
    return;
  }
  
  if (!isVerifiedPremium) {
    setShowPremiumModal(true);
    return;
  }
  
  setIsGeneratingViral(true);
  setError('');
  setViralResult(null);
  
  try {
    const response = await fetch('/api/viral-guarantee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: premiumUsername,
        situation: viralSituation,  // This is now the exact image description
        targetLikes: 100,
        autoPost: false
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setViralResult(data);
      
      // Save to database
      const { data: memeData, error: dbError } = await supabase
        .from('memes')
        .insert({
          image_url: data.meme.url,
          creator_x_handle: xConnected && xProfile ? xProfile.username : premiumUsername,
          creator_wallet: walletAddress,
          likes_count: 0,
          shares_count: 0,
          views_count: 0,
          topic: 'Premium Custom Meme',
          description: data.meme.userDescription,
          source: 'viral-guarantee',
          from_telegram_bot: false,
          is_premium: true,
          is_x_verified: xVerified,
          viral_guarantee_id: data.viralId
        })
        .select()
        .single();
      
      if (!dbError) {
        incrementMemeCount();
        fetchCommunityMemes();
      }
    } else {
      setError(data.message || 'Failed to generate meme');
    }
  } catch (error) {
    console.error('Generation error:', error);
    setError('Failed to generate meme');
  } finally {
    setIsGeneratingViral(false);
  }
};

// And update the UI component in your premium tools section:
// Replace the entire viral-guarantee-card div with this simpler version:

<div className="premium-tool-card viral-guarantee-card">
  <h3>🎨 Premium AI Image Generator</h3>
  <p>Generate ANY image you can imagine with Grok AI. Describe it and we'll create it!</p>
  
  <div className="viral-input-section">
    <textarea
      placeholder="Describe your image in detail...

Examples:
• 'A cat wearing a business suit giving a presentation about cryptocurrency'
• 'Wojak crying while watching Bitcoin price chart going up'
• 'Drake meme but with Pepe the frog instead'
• 'Realistic photo of a golden retriever on the moon holding a $PUMPIT flag'
• 'Anime style girl holding a Solana logo with laser eyes'

Be specific! The more detail, the better the result."
      value={viralSituation}
      onChange={(e) => setViralSituation(e.target.value)}
      rows="6"
      className="viral-situation-input"
    />
    
    <button 
      onClick={generateViralMeme} 
      disabled={isGeneratingViral || !viralSituation}
      className="viral-generate-btn"
    >
      {isGeneratingViral ? (
        <>
          <span className="spinner"></span> Creating your custom image...
        </>
      ) : (
        '🎨 Generate Custom Image'
      )}
    </button>
  </div>
  
  {viralResult && (
    <div className="viral-result">
      <div className="viral-header">
        <h4>✅ Your Custom Image is Ready!</h4>
      </div>
      
      {viralResult.optimalPostTime && (
        <div className="optimal-time-notice">
          💡 Best time to post: {new Date(viralResult.optimalPostTime).toLocaleString()}
          <span className="time-reason">(Peak engagement time for maximum reach)</span>
        </div>
      )}
      
      <div className="viral-best-meme">
        <div className="meme-display">
          <img src={viralResult.meme.url} alt="Your custom creation" />
          <p className="user-description">Your prompt: "{viralResult.meme.userDescription}"</p>
        </div>
        
        <div className="viral-actions">
          <button 
            onClick={() => {
              const a = document.createElement('a');
              a.href = viralResult.meme.url;
              a.download = 'custom-meme.png';
              a.click();
            }}
            className="download-viral-btn"
          >
            💾 Download
          </button>
          
          <button 
            onClick={() => {
              const text = viralResult.meme.caption || `Check out my custom $PUMPIT creation! 🚀`;
              const url = `${window.location.origin}`;
              const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=PUMPIT,Solana,AIArt`;
              window.open(twitterUrl, '_blank');
            }}
            className="share-viral-btn"
          >
            𝕏 Share on X
          </button>
        </div>
      </div>
    </div>
  )}
</div>

  // ========== PART 4: PREMIUM TOOLS FUNCTIONS ==========
  const fetchTrendingTopics = async () => {
    if (!isVerifiedPremium) {
      setShowPremiumModal(true);
      return;
    }
    
    setActivePremiumTool('trending');
    setIsLoadingTrending(true);
    setError('');
    
    try {
      const response = await fetch('/api/premium-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'trending',
          username: premiumUsername,
          xProfile: xConnected ? xProfile : null
        })
      });
      
      const data = await response.json();
      if (data.success && data.topics) {
        setTrendingTopics(data.topics);
      } else {
        setError(data.error || 'Failed to fetch trending topics');
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
      setError('Failed to fetch trending topics');
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const generateTrendMeme = async (topic) => {
    if (!isVerifiedPremium) {
      setShowPremiumModal(true);
      return;
    }
    
    setSelectedTrend(topic);
    setIsLoadingTrending(true);
    setError('');
    
    try {
      const response = await fetch('/api/premium-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'trend-meme',
          topic,
          username: premiumUsername
        })
      });
      
      const data = await response.json();
      if (data.success && data.memeUrl) {
        setTrendMeme(data.memeUrl);
        
        const { data: memeData, error: dbError } = await supabase
          .from('memes')
          .insert({
            image_url: data.memeUrl,
            creator_x_handle: xConnected && xProfile ? xProfile.username : premiumUsername,
            creator_wallet: walletAddress,
            likes_count: 0,
            shares_count: 0,
            views_count: 0,
            topic: topic.title || topic.name || 'Trending Topic',
            description: data.caption || `Trending meme about ${topic.title || topic.name}`,
            source: 'grok-trending',
            from_telegram_bot: false,
            is_premium: true,
            is_x_verified: xVerified
          })
          .select()
          .single();
        
        if (!dbError) {
          incrementMemeCount();
          fetchCommunityMemes();
          setCurrentMemeId(memeData.id);
          setGeneratedMeme(data.memeUrl);
          setShowShareModal(true);
        }
      } else {
        setError(data.error || 'Failed to generate trend meme');
      }
    } catch (error) {
      console.error('Error generating trend meme:', error);
      setError('Failed to generate trend meme');
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const analyzeToken = async () => {
    if (!tokenAddress) {
      setError('Please enter a token address');
      return;
    }
    
    if (!isVerifiedPremium) {
      setShowPremiumModal(true);
      return;
    }
    
    setActivePremiumTool('tokenAnalyzer');
    setIsAnalyzingToken(true);
    setTokenAnalysis(null);
    setError('');
    
    try {
      const response = await fetch('/api/premium-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'analyze-token',
          tokenAddress,
          username: premiumUsername
        })
      });
      
      const data = await response.json();
      if (data.success && data.analysis) {
        setTokenAnalysis(data.analysis);
        
        if (data.analysis.memeUrl) {
          const { data: memeData, error: dbError } = await supabase
            .from('memes')
            .insert({
              image_url: data.analysis.memeUrl,
              creator_x_handle: xConnected && xProfile ? xProfile.username : premiumUsername,
              creator_wallet: walletAddress,
              likes_count: 0,
              shares_count: 0,
              views_count: 0,
              topic: `Token Analysis: ${tokenAddress.slice(0, 8)}...`,
              description: data.analysis.summary || 'Token analysis meme',
              source: 'grok-tokenomics',
              from_telegram_bot: false,
              is_premium: true,
              is_x_verified: xVerified
            })
            .select()
            .single();
          
          if (!dbError) {
            incrementMemeCount();
            fetchCommunityMemes();
          }
        }
      } else {
        setError(data.error || 'Failed to analyze token');
      }
    } catch (error) {
      console.error('Error analyzing token:', error);
      setError('Failed to analyze token');
    } finally {
      setIsAnalyzingToken(false);
    }
  };

  const memeifyContract = async () => {
    if (!contractCode) {
      setError('Please paste smart contract code');
      return;
    }
    
    if (!isVerifiedPremium) {
      setShowPremiumModal(true);
      return;
    }
    
    setActivePremiumTool('contractMeme');
    setIsAnalyzingContract(true);
    setContractMeme(null);
    setError('');
    
    try {
      const response = await fetch('/api/premium-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'contract-meme',
          contractCode,
          username: premiumUsername
        })
      });
      
      const data = await response.json();
      if (data.success && data.memeUrl) {
        setContractMeme(data.memeUrl);
        
        const { data: memeData, error: dbError } = await supabase
          .from('memes')
          .insert({
            image_url: data.memeUrl,
            creator_x_handle: xConnected && xProfile ? xProfile.username : premiumUsername,
            creator_wallet: walletAddress,
            likes_count: 0,
            shares_count: 0,
            views_count: 0,
            topic: 'Smart Contract Meme',
            description: data.caption || 'Smart contract visualized as a meme',
            source: 'grok-contract',
            from_telegram_bot: false,
            is_premium: true,
            is_x_verified: xVerified
          })
          .select()
          .single();
        
        if (!dbError) {
          incrementMemeCount();
          fetchCommunityMemes();
          setCurrentMemeId(memeData.id);
          setGeneratedMeme(data.memeUrl);
          setShowShareModal(true);
        }
      } else {
        setError(data.error || 'Failed to create contract meme');
      }
    } catch (error) {
      console.error('Error memeifying contract:', error);
      setError('Failed to create contract meme');
    } finally {
      setIsAnalyzingContract(false);
    }
  };
  
  // ========== PART 5: MORE PREMIUM & HELPER FUNCTIONS ==========
  const processWhitepaper = async () => {
    if (!whitepaperFile) {
      setError('Please upload a whitepaper PDF');
      return;
    }
    
    if (!isVerifiedPremium) {
      setShowPremiumModal(true);
      return;
    }
    
    setActivePremiumTool('whitepaper');
    setIsProcessingWhitepaper(true);
    setWhitepaperMemes([]);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('whitepaper', whitepaperFile);
      formData.append('username', premiumUsername);
      
      const response = await fetch('/api/ai-whitepaper-memes', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success && data.memes) {
        setWhitepaperMemes(data.memes);
        
        for (const meme of data.memes) {
          const { error: dbError } = await supabase
            .from('memes')
            .insert({
              image_url: meme.url,
              creator_x_handle: xConnected && xProfile ? xProfile.username : premiumUsername,
              creator_wallet: walletAddress,
              likes_count: 0,
              shares_count: 0,
              views_count: 0,
              topic: meme.topic || 'Whitepaper Meme',
              description: meme.caption || 'Meme generated from whitepaper',
              source: 'grok-whitepaper',
              from_telegram_bot: false,
              is_premium: true,
              is_x_verified: xVerified
            });
        }
        
        incrementMemeCount(data.memes.length);
        fetchCommunityMemes();
      } else {
        setError(data.error || 'Failed to process whitepaper');
      }
    } catch (error) {
      console.error('Error processing whitepaper:', error);
      setError('Failed to process whitepaper');
    } finally {
      setIsProcessingWhitepaper(false);
    }
  };

  const translateMeme = async () => {
    if (!translationText) {
      setError('Please enter text to translate');
      return;
    }
    
    if (selectedLanguages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    
    if (!isVerifiedPremium) {
      setShowPremiumModal(true);
      return;
    }
    
    setActivePremiumTool('translator');
    setIsTranslating(true);
    setTranslations({});
    setError('');
    
    try {
      const response = await fetch('/api/premium-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'translate',
          text: translationText,
          languages: selectedLanguages,
          username: premiumUsername
        })
      });
      
      const data = await response.json();
      if (data.success && data.translations) {
        setTranslations(data.translations);
      } else {
        setError(data.error || 'Failed to translate');
      }
    } catch (error) {
      console.error('Error translating:', error);
      setError('Failed to translate');
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleLanguage = (langCode) => {
    setSelectedLanguages(prev => {
      if (prev.includes(langCode)) {
        return prev.filter(code => code !== langCode);
      } else {
        return [...prev, langCode];
      }
    });
  };

  const autoPostToX = async (memeUrl, caption) => {
    if (!xConnected || !xProfile) return;
    
    try {
      const response = await fetch('/api/x-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: localStorage.getItem('xAccessToken'),
          text: caption,
          mediaUrl: memeUrl
        })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Posted to X successfully');
      }
    } catch (error) {
      console.error('Failed to post to X:', error);
    }
  };

  const fetchDailyMemeCount = async () => {
    try {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { count, error } = await supabase
        .from('memes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());
        
      if (error) throw error;
      setDailyMemeCount(count || 0);
    } catch (error) {
      console.error('Error fetching daily meme count:', error);
      setDailyMemeCount(0);
    }
  };

  const fetchCommunityMemes = async () => {
    try {
      setIsLoadingMemes(true);
      
      const { data: allMemes, error: allError } = await supabase
        .from('memes')
        .select('*')
        .order('likes_count', { ascending: false, nullsFirst: false });
      
      if (allError) {
        console.error('Error fetching all memes:', allError);
        throw allError;
      }
      
      const memesWithScores = (allMemes || []).map(meme => ({
        ...meme,
        combinedScore: (meme.likes_count || 0) + (meme.shares_count || 0)
      })).sort((a, b) => b.combinedScore - a.combinedScore);
      
      const topMeme = memesWithScores[0];
      
      const { data: recentMemes, error: recentError } = await supabase
        .from('memes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (recentError) {
        console.error('Error fetching recent memes:', recentError);
        throw recentError;
      }
      
      const filteredRecent = (recentMemes || [])
        .filter(meme => !topMeme || meme.id !== topMeme.id)
        .slice(0, 5);
      
      const finalMemes = topMeme ? [topMeme, ...filteredRecent] : filteredRecent;
      
      console.log('Fetched memes:', finalMemes.length);
      setCommunityMemes(finalMemes);
    } catch (error) {
      console.error('Error fetching memes:', error);
      setCommunityMemes([]);
    } finally {
      setIsLoadingMemes(false);
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
  
  // ========== PART 6: MEME GENERATION & DRAG FUNCTIONS ==========
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

    if (userStats.remainingToday <= 0) {
      setError(`Daily limit reached! You can create ${userStats.dailyLimit} memes per day. Upgrade for more!`);
      return;
    }

    setSelectedFile(file);
    setError('');
    setGeneratedMeme(null);
    setShowOverlays(false);
    
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
    
    if (inputValue && inputValue.trim().length >= 2) {
      setXHandle(inputValue.trim());
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

    if (userStats.remainingToday <= 0) {
      setError(`Daily limit reached! You've used all ${userStats.dailyLimit} memes today.`);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const reader = new FileReader();
      const imageDataUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

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

      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const face = positionData.faces[0];
        
        const lipX = (face.mouthPosition.centerX - 0.5) * rect.width;
        const lipY = (face.mouthPosition.centerY - 0.5) * rect.height;
        const exclamationX = (face.exclamationPosition.centerX - 0.5) * rect.width;
        const exclamationY = (face.exclamationPosition.centerY - 0.5) * rect.height;
        
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

  const downloadMeme = async (shouldDownload = true) => {
    if (!selectedFile || !showOverlays) return;
    
    try {
      const previewContainer = containerRef.current;
      
      const canvas = await html2canvas(previewContainer, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });

      const fileName = `meme-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memes')
        .upload(fileName, blob, {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('memes')
        .getPublicUrl(fileName);

      const { data: memeData, error: dbError } = await supabase
        .from('memes')
        .insert({
          image_url: publicUrl,
          creator_x_handle: xConnected && xProfile ? xProfile.username : xHandle,
          creator_wallet: walletAddress,
          likes_count: 0,
          shares_count: 0,
          views_count: 0,
          topic: 'Website Generated Meme',
          description: `PUMPIT meme created by ${xHandle} using our AI-powered generator`,
          source: 'website',
          from_telegram_bot: false,
          is_premium: isVerifiedPremium,
          is_x_verified: xVerified
        })
        .select()
        .single();

      if (dbError) throw dbError;

      if (shouldDownload) {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `pumpit-meme-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }
      
      setGeneratedMeme(publicUrl);
      
      incrementMemeCount();
      fetchCommunityMemes();
      
      setCurrentMemeId(memeData.id);
      setShowShareModal(true);
      
      if (xConnected && localStorage.getItem('autoPostToX') === 'true') {
        const caption = `Just created a new $PUMPIT meme! 🚀\n\nCheck it out: ${window.location.origin}/meme/${memeData.id}\n\n#PUMPIT #Solana @pumpitonsol`;
        await autoPostToX(publicUrl, caption);
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to save meme: ' + error.message);
    }
  };
  
  // ========== PART 7: MOUSE/TOUCH HANDLERS & SOCIAL FUNCTIONS ==========
  const handleMouseDown = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
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
    
    if (dragging.includes('-rotate')) {
      const element = dragging.replace('-rotate', '');
      const rect = element === 'lips' ? lipRef.current?.getBoundingClientRect() : exclamationRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
        const deltaAngle = angle - dragStart.angle;
        const rotationSensitivity = 1.5;
        
        if (element === 'lips') {
          setLipRotation(startPos.rotation + (deltaAngle * rotationSensitivity));
        } else {
          setExclamationRotation(startPos.rotation + (deltaAngle * rotationSensitivity));
        }
      }
      return;
    }
    
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

  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };

  const handleShareFromModal = (platform) => {
    if (platform === 'twitter') {
      shareOnTwitter(currentMemeId);
    } else if (platform === 'telegram') {
      shareOnTelegram(currentMemeId, generatedMeme);
    }
    setShowShareModal(false);
  };

  const handleCreateAnother = () => {
    setShowShareModal(false);
    setSelectedFile(null);
    setPreview('/pumper.png');
    setShowOverlays(false);
    setGeneratedMeme(null);
    setCurrentMemeId(null);
  };

  const handleTouchStart = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      setGestureStart({ 
        distance, 
        angle, 
        scale: element === 'lips' ? lipScale : exclamationScale,
        rotation: element === 'lips' ? lipRotation : exclamationRotation
      });
      setTouches([...e.touches]);
    } else {
      handleMouseDown(e, element);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && gestureStart.distance > 0) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      const scaleChange = distance / gestureStart.distance;
      const angleChange = angle - gestureStart.angle;
      
      const element = dragging?.replace('-rotate', '');
      if (element === 'lips') {
        setLipScale(gestureStart.scale * scaleChange);
        setLipRotation(gestureStart.rotation + angleChange);
      } else if (element === 'exclamation') {
        setExclamationScale(gestureStart.scale * scaleChange);
        setExclamationRotation(gestureStart.rotation + angleChange);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setGestureStart({ distance: 0, angle: 0, scale: 1, rotation: 0 });
      setTouches([]);
    }
    handleMouseUp();
  };

  const handleWheel = (e, element) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const scaleFactor = 1 + delta;
    
    if (element === 'lips') {
      setLipScale(prev => Math.max(0.1, Math.min(3, prev * scaleFactor)));
    } else {
      setExclamationScale(prev => Math.max(0.1, Math.min(3, prev * scaleFactor)));
    }
  };

  const getLipTransform = () => {
    return `translate(${lipPosition.x}px, ${lipPosition.y}px) scale(${lipScale}) rotate(${lipRotation}deg)`;
  };

  const getExclamationTransform = () => {
    return `translate(${exclamationPosition.x}px, ${exclamationPosition.y}px) scale(${exclamationScale}) rotate(${exclamationRotation}deg)`;
  };

  const handleLike = async (memeId) => {
    if (likedMemes.includes(memeId)) return;
    
    try {
      const { data, error } = await supabase
        .from('memes')
        .update({ likes_count: supabase.sql`likes_count + 1` })
        .eq('id', memeId)
        .select();
      
      if (!error) {
        const newLikedMemes = [...likedMemes, memeId];
        setLikedMemes(newLikedMemes);
        localStorage.setItem('likedMemes', JSON.stringify(newLikedMemes));
        fetchCommunityMemes();
      }
    } catch (error) {
      console.error('Error liking meme:', error);
    }
  };

  const shareOnTwitter = async (memeId) => {
    const text = `Check out this awesome $PUMPIT meme! 🚀`;
    const url = `${window.location.origin}/meme/${memeId}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=PUMPIT,Solana`;
    
    window.open(twitterUrl, '_blank');
    
    try {
      const { error } = await supabase
        .from('memes')
        .update({ shares_count: supabase.sql`shares_count + 1` })
        .eq('id', memeId);
      
      if (!error) {
        const newSharedMemes = [...sharedMemes, memeId];
        setSharedMemes(newSharedMemes);
        localStorage.setItem('sharedMemes', JSON.stringify(newSharedMemes));
        setShareAnimatingId(memeId);
        setTimeout(() => setShareAnimatingId(null), 500);
        fetchCommunityMemes();
      }
    } catch (error) {
      console.error('Error updating share count:', error);
    }
  };

  const shareOnTelegram = async (memeId, imageUrl) => {
    const text = `Check out this awesome $PUMPIT meme! 🚀`;
    const url = `${window.location.origin}/meme/${memeId}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    
    window.open(telegramUrl, '_blank');
    
    try {
      const { error } = await supabase
        .from('memes')
        .update({ shares_count: supabase.sql`shares_count + 1` })
        .eq('id', memeId);
      
      if (!error) {
        const newSharedMemes = [...sharedMemes, memeId];
        setSharedMemes(newSharedMemes);
        localStorage.setItem('sharedMemes', JSON.stringify(newSharedMemes));
        setShareAnimatingId(memeId);
        setTimeout(() => setShareAnimatingId(null), 500);
        fetchCommunityMemes();
      }
    } catch (error) {
      console.error('Error updating share count:', error);
    }
  };

  const handleModalClose = (e) => {
    if (e.target === e.currentTarget) {
      setShowXForm(false);
    }
  };
  
  // ========== PART 8: RETURN JSX - HEAD & MODALS ==========
  return (
    <>
      <Head>
        <title>$PUMPIT - AI Meme Generator | Making Solana Smile</title>
        <meta name="description" content="Create viral $PUMPIT memes with our AI-powered generator. Join the Solana revolution!" />
        <meta property="og:title" content="$PUMPIT - AI Meme Generator" />
        <meta property="og:description" content="Making Solana smile, one meme at a time" />
        <meta property="og:image" content="/pumper.png" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="desktop-social-buttons">
        {xConnected ? (
          <div className="x-connected-badge">
            <img src={xProfile?.profileImage} alt="" />
            <span>@{xProfile?.username}</span>
            {xVerified && <span className="verified-badge">✓</span>}
            <button onClick={disconnectX} className="disconnect-btn">×</button>
          </div>
        ) : (
          <button onClick={connectWithX} className="social-button x-connect">
            {connectingX ? '...' : '𝕏 Connect'}
          </button>
        )}
        
        <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer" className="social-button">
          𝕏
        </a>
        <a href="https://www.tiktok.com/@pumper.the.pumpit" target="_blank" rel="noopener noreferrer" className="social-button">
          ♪ TikTok
        </a>
        <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer" className="social-button">
          TG
        </a>
        <a href="https://t.me/pumpermemebot" target="_blank" rel="noopener noreferrer" className="social-button telegram-bot">
          🤖 Telegram Bot
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

      {showPremiumModal && (
        <div className="premium-modal-backdrop" onClick={() => setShowPremiumModal(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPremiumModal(false)}>✕</button>
            <h2>⭐ Premium Feature</h2>
            
            <div className="x-handle-section">
              <form onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const formData = new FormData(e.target);
                const inputValue = formData.get('premiumusername');
                if (inputValue && inputValue.trim().length >= 2) {
                  setPremiumUsername(inputValue.trim());
                  verifyPremiumAccess(inputValue.trim());
                }
              }} className="x-handle-inline-form">
                <label>Enter your Telegram username to verify premium:</label>
                <div className="x-handle-input-group">
                  <input
                    type="text"
                    name="premiumusername"
                    placeholder="@yourusername"
                    required
                    minLength="2"
                    autoComplete="off"
                  />
                  <button type="submit">Verify Premium</button>
                </div>
              </form>
            </div>
            
            {error && (
              <div className="error-message" style={{
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                margin: '1rem 0',
                color: '#ff6666'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            <div className="premium-benefits">
              <h3>Premium Benefits:</h3>
              <ul>
                <li>✅ 3-10 memes per day (based on tier)</li>
                <li>✅ Access to all AI tools</li>
                <li>✅ Trending meme generator</li>
                <li>✅ Token analyzer with rugpull detection</li>
                <li>✅ Smart contract visualizer</li>
                <li>✅ Whitepaper summarizer</li>
                <li>✅ 20+ language translator</li>
                <li>✅ Priority processing</li>
              </ul>
            </div>
            <a href="https://t.me/pumpermemebot" target="_blank" className="get-premium-btn">
              Get Premium via Telegram Bot
            </a>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="share-modal-backdrop" onClick={handleCloseShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            
            <div className="modal-content">
              <h2>✅ Success!</h2>
              <p>Your meme has been created!</p>
              
              {generatedMeme && (
                <div className="modal-meme-preview">
                  <img src={generatedMeme} alt="Your created meme" />
                </div>
              )}
              
              <h3>Share your creation:</h3>
              
              <div className="modal-share-buttons">
                <button 
                  onClick={() => handleShareFromModal('twitter')}
                  className="modal-share-btn twitter"
                >
                  𝕏 Share on X
                </button>
                <button 
                  onClick={() => handleShareFromModal('telegram')}
                  className="modal-share-btn telegram"
                >
                  TG Share on Telegram
                </button>
              </div>
              
              <button onClick={handleCreateAnother} className="create-another-btn">
                ✨ Create Another
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="mobile-top-buttons">
        {xConnected ? (
          <div className="x-connected-badge-mobile">
            <span>@{xProfile?.username}</span>
          </div>
        ) : (
          <button onClick={connectWithX} className="social-button x-connect">
            𝕏
          </button>
        )}
        <a href="https://t.me/pumpermemebot" target="_blank" rel="noopener noreferrer" className="social-button telegram-bot">
          🤖 Bot
        </a>
        {walletAddress ? (
          <button className="social-button wallet-button">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </button>
        ) : (
          <button onClick={connectWallet} className="social-button wallet-button">
            Connect
          </button>
        )}
        <button 
          onClick={handleBuyClick}
          className="social-button buy-button"
        >
          🚀 Buy
        </button>
      </div>
      
      {/* ========== PART 9: MAIN CONTENT - HEADER TO PREMIUM TOOLS ========== */}
      <div className="container">
        <header>
          <div className="pumper-float">
            <img src="/pumper.png" alt="Pumper - PumpItOnSol Mascot" />
          </div>
          <div className="header-content">
            <h1>$PUMPIT</h1>
            <p>Making Solana smile, one meme at a time</p>
            
            <div className="user-stats-display">
              <div className="stat-badge">
                <span className="stat-label">Remaining:</span>
                <span className="stat-value">{userStats.remainingToday}</span>
              </div>
              {isVerifiedPremium && (
                <div className="stat-badge premium">
                  <span>⭐ Premium Active</span>
                </div>
              )}
              {xVerified && (
                <div className="stat-badge verified">
                  <span>✓ X Verified</span>
                </div>
              )}
            </div>
            
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
            <a href="#premium-tools">✨ Premium</a>
            <a href="#roadmap">Roadmap</a>
            <a href="/blog">Blog</a>
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
              <p>🔥 Burned: 29% (286M $PUMPIT)</p>
              <p>✅ Circulating: 714,268,067 $PUMPIT</p>
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
          
          {/* ========== PART 10: GENERATOR, PREMIUM TOOLS & FOOTER ========== */}
          <section id="generator" className="reveal">
            <h2>🎨 AI-Powered Meme Generator</h2>
            <p>
              Transform any image into a $PUMPIT meme! Just upload, position the overlays, and download!
            </p>
            
            <div className="daily-counter">
              <span className="fire-icon">🔥</span>
              <span className="counter-text">{dailyMemeCount} memes created today!</span>
            </div>
            
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
                    <>
                      <button 
                        onClick={() => downloadMeme(false)}
                        className="complete-button"
                      >
                        ✅ Complete
                      </button>
                      <button 
                        onClick={() => downloadMeme(true)}
                        className="download-button"
                      >
                        💾 Download Meme
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {showOverlays && (
                <div className="gesture-hints">
                  <p className="desktop-hint">🖱️ Drag to move • Scroll to resize • Alt+drag to rotate</p>
                  <p className="mobile-hint">👆 Drag to move • 🤏 Pinch to resize • 🔄 Twist to rotate</p>
                </div>
              )}
              
              {error && !showPremiumModal && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </section>

          <section id="premium-tools" className="reveal premium-section">
            <h2>✨ Premium AI Tools</h2>
            {!isVerifiedPremium ? (
              <div className="premium-cta">
                <p>Unlock advanced AI features with Premium!</p>
                <button onClick={() => setShowPremiumModal(true)} className="get-premium-btn">
                  Get Premium Access
                </button>
              </div>
            ) : (
              <div className="premium-tools-grid">
               <div className="premium-tool-card">
                 <h3>🔥 Trending Meme Generator</h3>
                 <p>Create memes from trending topics using Grok AI</p>
                 <button onClick={fetchTrendingTopics} disabled={isLoadingTrending}>
                   {isLoadingTrending ? 'Loading...' : 'Fetch Trends'}
                 </button>
                 {trendingTopics.length > 0 && (
                   <div className="trending-topics">
                     {trendingTopics.map((topic, index) => (
                       <div key={index} className="trend-item">
                         <span>{topic.title || topic.name}</span>
                         <button 
                           onClick={() => generateTrendMeme(topic)}
                           disabled={selectedTrend === topic && isLoadingTrending}
                         >
                           {selectedTrend === topic && isLoadingTrending ? 'Generating...' : 'Generate'}
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               
               <div className="premium-tool-card viral-guarantee-card">
  <h3>🎨 Premium AI Image Generator</h3>
  <p>Generate ANY image you can imagine with Grok AI. Describe it and we'll create it!</p>
  
  <div className="viral-input-section">
    <textarea
      placeholder="Describe your image in detail...

Examples:
• 'A cat wearing a business suit giving a presentation about cryptocurrency'
• 'Wojak crying while watching Bitcoin price chart going up'
• 'Drake meme but with Pepe the frog instead'
• 'Realistic photo of a golden retriever on the moon holding a $PUMPIT flag'
• 'Anime style girl holding a Solana logo with laser eyes'

Be specific! The more detail, the better the result."
      value={viralSituation}
      onChange={(e) => setViralSituation(e.target.value)}
      rows="6"
      className="viral-situation-input"
    />
    
    <button 
      onClick={generateViralMeme} 
      disabled={isGeneratingViral || !viralSituation}
      className="viral-generate-btn"
    >
      {isGeneratingViral ? (
        <>
          <span className="spinner"></span> Creating your custom image...
        </>
      ) : (
        '🎨 Generate Custom Image'
      )}
    </button>
  </div>
  
  {viralResult && (
    <div className="viral-result">
      <div className="viral-header">
        <h4>✅ Your Custom Image is Ready!</h4>
      </div>
      
      {viralResult.optimalPostTime && (
        <div className="optimal-time-notice">
          💡 Best time to post: {new Date(viralResult.optimalPostTime).toLocaleString()}
          <span className="time-reason">(Peak engagement time for maximum reach)</span>
        </div>
      )}
      
      <div className="viral-best-meme">
        <div className="meme-display">
          <img src={viralResult.meme.url} alt="Your custom creation" />
          <p className="user-description">Your prompt: "{viralResult.meme.userDescription}"</p>
        </div>
        
       <div className="viral-actions">
          <button 
            onClick={() => {
              const a = document.createElement('a');
              a.href = viralResult.meme.url;
              a.download = 'custom-meme.png';
              a.click();
            }}
            className="download-viral-btn"
          >
            💾 Download
          </button>
          
          <button 
            onClick={() => {
              const text = viralResult.meme.caption || `Check out my custom $PUMPIT creation! 🚀`;
              const url = `${window.location.origin}`;
              const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=PUMPIT,Solana,AIArt`;
              window.open(twitterUrl, '_blank');
            }}
            className="share-viral-btn"
          >
            𝕏 Share on X
          </button>
        </div>
      </div>
    </div>
  )}
</div>

{viralStats && (
  <div className="viral-stats-display">
    <h5>📊 Your Viral Performance:</h5>
    <div className="stats-grid">
      <div className="stat">
        <span className="stat-number">{viralStats.viralSuccess}/{viralStats.totalAttempts}</span>
        <span className="stat-label">Went Viral</span>
      </div>
      <div className="stat">
        <span className="stat-number">{Math.round(viralStats.averageLikes)}</span>
        <span className="stat-label">Avg Likes</span>
      </div>
    </div>
  </div>
)}
                
                {viralStats && (
                   <div className="viral-stats-display">
                     <h5>📊 Your Viral Performance:</h5>
                     <div className="stats-grid">
                       <div className="stat">
                         <span className="stat-number">{viralStats.viralSuccess}/{viralStats.totalAttempts}</span>
                         <span className="stat-label">Went Viral</span>
                       </div>
                       <div className="stat">
                         <span className="stat-number">{Math.round(viralStats.averageLikes)}</span>
                         <span className="stat-label">Avg Likes</span>
                       </div>
                     </div>
                   </div>
                 )}
                
                <div className="premium-tool-card">
                  <h3>💰 Token Analyzer</h3>
                  <p>Analyze any Solana token and create memes</p>
                  <input
                    type="text"
                    placeholder="Enter token address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                  />
                  <button onClick={analyzeToken} disabled={isAnalyzingToken}>
                    {isAnalyzingToken ? 'Analyzing...' : 'Analyze Token'}
                  </button>
                  {tokenAnalysis && (
                    <div className="token-analysis">
                      <p>{tokenAnalysis.summary}</p>
                      {tokenAnalysis.riskLevel && (
                        <div className="risk-level">
                          Risk Level: <span className={`risk-${tokenAnalysis.riskLevel.toLowerCase()}`}>
                            {tokenAnalysis.riskLevel}
                          </span>
                        </div>
                      )}
                      {tokenAnalysis.memeUrl && (
                        <div className="analysis-meme">
                          <img 
                            src={tokenAnalysis.memeUrl} 
                            alt="Token analysis meme" 
                            style={{ 
                              width: '100%', 
                              maxWidth: '400px', 
                              borderRadius: '10px',
                              marginTop: '1rem' 
                            }}
                          />
                          <div className="meme-actions">
                            <button onClick={() => {
                              const a = document.createElement('a');
                              a.href = tokenAnalysis.memeUrl;
                              a.download = 'token-meme.png';
                              a.click();
                            }}>Download</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="premium-tool-card">
                  <h3>📜 Contract Meme-ifier</h3>
                  <p>Turn smart contract code into memes</p>
                  <textarea
                    placeholder="Paste smart contract code"
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    rows="4"
                  />
                  <button onClick={memeifyContract} disabled={isAnalyzingContract}>
                    {isAnalyzingContract ? 'Processing...' : 'Meme-ify Contract'}
                  </button>
                  {contractMeme && (
                    <div className="contract-meme-result">
                      <h4>Your Contract Meme:</h4>
                      <img 
                        src={contractMeme} 
                        alt="Contract meme" 
                        style={{ 
                          width: '100%', 
                          maxWidth: '400px', 
                          borderRadius: '10px',
                          marginTop: '1rem' 
                        }}
                      />
                      <div className="meme-actions">
                        <button onClick={() => {
                          const a = document.createElement('a');
                          a.href = contractMeme;
                          a.download = 'contract-meme.png';
                          a.click();
                        }}>Download</button>
                        <button onClick={() => shareOnTwitter(currentMemeId)}>Share</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="premium-tool-card">
                  <h3>📄 Whitepaper to Memes</h3>
                  <p>Convert whitepapers into meme series</p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setWhitepaperFile(e.target.files[0])}
                  />
                  <button onClick={processWhitepaper} disabled={isProcessingWhitepaper || !whitepaperFile}>
                    {isProcessingWhitepaper ? 'Processing...' : 'Process Whitepaper'}
                  </button>
                  {whitepaperMemes.length > 0 && (
                    <div className="whitepaper-memes">
                      {whitepaperMemes.map((meme, index) => (
                        <img key={index} src={meme.url} alt={meme.topic} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="premium-tool-card">
                  <h3>🌍 Translation Hub</h3>
                  <p>Translate meme text to 20+ languages</p>
                  <textarea
                    placeholder="Enter text to translate"
                    value={translationText}
                    onChange={(e) => setTranslationText(e.target.value)}
                    rows="3"
                  />
                  <div className="language-selector">
                    {availableLanguages.slice(0, 5).map(lang => (
                      <label key={lang.code}>
                        <input
                          type="checkbox"
                          checked={selectedLanguages.includes(lang.code)}
                          onChange={() => toggleLanguage(lang.code)}
                        />
                        {lang.name}
                      </label>
                    ))}
                  </div>
                  <button onClick={translateMeme} disabled={isTranslating}>
                    {isTranslating ? 'Translating...' : 'Translate'}
                  </button>
                  {Object.keys(translations).length > 0 && (
                    <div className="translations">
                      {Object.entries(translations).map(([lang, text]) => (
                        <div key={lang}>
                          <strong>{lang}:</strong> {text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
          
          {/* ========== PART 11: ROADMAP, COMMUNITY, SOCIAL & FOOTER ========== */}
          <section id="roadmap" className="reveal">
            <h2>🗺️ Roadmap</h2>
            <ul>
              <li>✅ Phase 1: Launch $PUMPIT on Bonk.fun with meme identity + Pumper reveal</li>
              <li>✅ Phase 2: AI meme generator with smooth drag & drop editing</li>
              <li>✅ Phase 3: Telegram bot for easy meme creation</li>
              <li>✅ Phase 4: SEO-optimized blog for daily content</li>
              <li>✅ Phase 5: Premium tier with Grok AI integration</li>
              <li>📋 Phase 6: Community meme contests & rewards</li>
              <li>📋 Phase 7: Pumper Comic Series - Exclusive stories for $PUMPIT holders!</li>
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
                    <a href={`/meme/${meme.id}`} className="meme-link">
                      <img src={meme.image_url} alt={meme.topic || `Community Meme by ${meme.creator_x_handle}`} />
                      {meme.topic && (
                        <div className="meme-topic">{meme.topic}</div>
                      )}
                    </a>
                    {(meme.source === 'telegram' || meme.from_telegram_bot) && (
                      <a 
                        href="https://t.me/pumpermemebot" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="telegram-badge"
                      >
                        <span>🤖 Made with Telegram Bot!</span>
                        <div className="tooltip">
                          Create memes with just text - no image upload needed!<br/>
                          Try @pumpermemebot on Telegram
                        </div>
                      </a>
                    )}
                    {meme.is_premium && (
                      <div className="premium-badge">⭐ Premium</div>
                    )}
                    {meme.is_x_verified && (
                      <div className="verified-badge">✓ Verified</div>
                    )}
                    <div className="meme-info">
                      <p className="creator">by {meme.creator_x_handle}</p>
                      <div className="meme-stats">
                        <button 
                          onClick={() => handleLike(meme.id)}
                          className={`like-button ${likedMemes.includes(meme.id) ? 'liked' : ''}`}
                          type="button"
                        >
                          ❤️ {meme.likes_count || 0}
                        </button>
                        <span className={`share-counter ${meme.id === shareAnimatingId ? 'animating' : ''}`}>
                          🔄 {meme.shares_count || 0}
                        </span>
                        {meme.views_count > 0 && (
                          <span className="view-counter">
                            👀 {meme.views_count}
                          </span>
                        )}
                      </div>
                      <div className="share-buttons">
                        <button 
                          onClick={() => shareOnTwitter(meme.id)}
                          className={`share-btn twitter ${sharedMemes.includes(meme.id) ? 'shared' : ''}`}
                          type="button"
                          disabled={sharedMemes.includes(meme.id)}
                        >
                          {sharedMemes.includes(meme.id) ? '✓ Shared' : '𝕏 Share'}
                        </button>
                        <button 
                          onClick={() => shareOnTelegram(meme.id, meme.image_url)}
                          className={`share-btn telegram ${sharedMemes.includes(meme.id) ? 'shared' : ''}`}
                          type="button"
                          disabled={sharedMemes.includes(meme.id)}
                        >
                          {sharedMemes.includes(meme.id) ? '✓ Shared' : 'TG Share'}
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
                <h3>𝕏 Latest Updates</h3>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Follow us on X for latest updates!</p>
                  <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer" className="community-button twitter">
                    Visit our X Profile →
                  </a>
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
                  
                  <a 
                    href="/blog" 
                    className="community-button blog"
                  >
                    <span className="icon">📝</span>
                    <div>
                      <strong>PUMPIT Blog</strong>
                      <p>Daily meme updates & insights</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer>
          <p>© 2025 PumpItOnSol. Powered by AI & Community. 🎨🚀</p>
          <div className="footer-links">
            <a href="/blog">Blog</a>
            <span> • </span>
            <a href="https://x.com/pumpitonsol" target="_blank" rel="noopener noreferrer">Twitter</a>
            <span> • </span>
            <a href="https://t.me/Pumpetcto" target="_blank" rel="noopener noreferrer">Telegram</a>
          </div>
        </footer>
      </div>
      
      {/* ========== PART 12: ALL CSS STYLES ========== */}
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

        .social-button.telegram-bot {
          background: #0088cc;
          color: white;
          border: none;
        }

        .social-button.telegram-bot:hover {
          background: #0077b3;
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 10px 30px rgba(0, 136, 204, 0.5);
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

        .x-connected-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(29, 161, 242, 0.1);
          border: 1px solid rgba(29, 161, 242, 0.3);
          border-radius: 50px;
        }

        .x-connected-badge img {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }

        .x-connected-badge .verified-badge {
          color: #1DA1F2;
          font-weight: bold;
        }

        .x-connected-badge .disconnect-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0 0.25rem;
        }

        .x-connected-badge .disconnect-btn:hover {
          color: #ff4444;
        }

        .premium-modal-backdrop, .share-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .premium-modal, .share-modal {
          background: rgba(20, 20, 20, 0.98);
          border: 2px solid #FFFF00;
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 2rem;
          position: relative;
        }

        .premium-modal .modal-close, .share-modal .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: #FFFF00;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .premium-modal h2, .share-modal h2 {
          color: #FFFF00;
          margin-bottom: 1rem;
        }

        .premium-input {
          width: 100%;
          padding: 1rem;
          margin: 1rem 0;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 0, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 1rem;
        }

        .verify-premium-btn, .get-premium-btn {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          margin-top: 1rem;
          text-align: center;
          text-decoration: none;
          display: block;
        }

        .premium-benefits {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .premium-benefits h3 {
          color: #FFD700;
          margin-bottom: 1rem;
        }

        .premium-benefits ul {
          list-style: none;
          padding: 0;
        }

        .premium-benefits li {
          padding: 0.5rem 0;
          color: #ccc;
        }

        .modal-content {
          text-align: center;
        }

        .modal-meme-preview {
          margin: 1.5rem 0;
          border-radius: 10px;
          overflow: hidden;
        }

        .modal-meme-preview img {
          width: 100%;
          max-width: 300px;
          height: auto;
          border-radius: 10px;
        }

        .modal-share-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin: 1.5rem 0;
          flex-wrap: wrap;
        }

        .modal-share-btn {
          padding: 1rem 2rem;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          font-size: 1rem;
        }

        .modal-share-btn.twitter {
          background: #1DA1F2;
          color: white;
        }

        .modal-share-btn.telegram {
          background: #0088cc;
          color: white;
        }

        .create-another-btn {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .user-stats-display {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .stat-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-badge.premium {
          background: rgba(255, 215, 0, 0.1);
          border-color: #FFD700;
          color: #FFD700;
        }

        .stat-badge.verified {
          background: rgba(29, 161, 242, 0.1);
          border-color: #1DA1F2;
          color: #1DA1F2;
        }

        .stat-label {
          color: #999;
          font-size: 0.85rem;
        }

        .stat-value {
          color: #FFFF00;
          font-weight: bold;
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

        .daily-counter {
          text-align: center;
          margin: 1.5rem 0;
          padding: 1rem;
          background: rgba(255, 255, 0, 0.05);
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 0, 0.2);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .fire-icon {
          font-size: 1.5rem;
          animation: flicker 1.5s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
        }

        .counter-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: #FFFF00;
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
          touch-action: none;
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

        .overlay-element::before {
          content: '';
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          z-index: -1;
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

        .primary-button, .secondary-button, .download-button, .complete-button {
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

        .secondary-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .download-button, .complete-button {
          background: linear-gradient(135deg, #00ff00, #00cc00);
          color: white;
        }

        .gesture-hints {
          text-align: center;
          margin-top: 1rem;
          padding: 0.5rem;
          background: rgba(255, 255, 0, 0.05);
          border-radius: 10px;
        }

        .desktop-hint {
          display: block;
        }

        .mobile-hint {
          display: none;
        }

        .error-message {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 10px;
          padding: 1rem;
          margin: 1rem 0;
          color: #ff6666;
          text-align: center;
        }

        .premium-section {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.03), rgba(255, 255, 0, 0.03));
        }

        .premium-cta {
          text-align: center;
          padding: 2rem;
        }

        .premium-tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .premium-tool-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 2rem;
        }

        .premium-tool-card h3 {
          color: #FFD700;
          margin-bottom: 1rem;
        }

        .premium-tool-card p {
          color: #ccc;
          margin-bottom: 1rem;
        }

        .premium-tool-card button {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .generated-trend-meme, .analysis-meme, .contract-meme-result {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 0, 0.05);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 0, 0.2);
        }
        
        .meme-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          justify-content: center;
        }
        
        .meme-actions button {
          padding: 0.5rem 1.5rem;
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          border-radius: 25px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .meme-actions button:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(255, 255, 0, 0.4);
        }
        
        .risk-level {
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          display: inline-block;
        }
        
        .risk-low { color: #00ff00; }
        .risk-medium { color: #ffff00; }
        .risk-high { color: #ff0000; }
        
        .trend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          margin: 0.5rem 0;
        }
        
        .trend-item button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .community-memes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .meme-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
        }

        .meme-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.2);
        }

        .meme-link {
          display: block;
          position: relative;
        }

        .meme-link img {
          width: 100%;
          height: auto;
          display: block;
        }

        .meme-topic {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
          padding: 1rem;
          color: white;
          font-weight: bold;
        }

        .telegram-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #0088cc;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.3s ease;
        }

        .telegram-badge:hover .tooltip {
          display: block;
        }

        .tooltip {
          display: none;
          position: absolute;
          top: 100%;
          right: 0;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 1rem;
          border-radius: 10px;
          margin-top: 0.5rem;
          width: 250px;
          font-size: 0.85rem;
          line-height: 1.4;
          z-index: 100;
        }

        .premium-badge, .verified-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .premium-badge {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: black;
        }

        .verified-badge {
          background: #1DA1F2;
          color: white;
        }

        .meme-info {
          padding: 1.5rem;
        }

        .creator {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .meme-stats {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1rem;
        }

        .like-button {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .like-button.liked {
          background: rgba(255, 0, 0, 0.2);
          border-color: #ff0000;
          color: #ff6666;
        }

        .share-counter, .view-counter {
          color: #999;
          font-size: 0.9rem;
        }

        .share-counter.animating {
          animation: shareAnimation 0.5s ease;
        }

        @keyframes shareAnimation {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); color: #FFFF00; }
          100% { transform: scale(1); }
        }

        .share-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .share-btn {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          font-size: 0.85rem;
        }

        .share-btn.twitter {
          border-color: #1DA1F2;
          background: rgba(29, 161, 242, 0.1);
        }

        .share-btn.telegram {
          border-color: #0088cc;
          background: rgba(0, 136, 204, 0.1);
        }

        .share-btn.shared {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .placeholder {
          background: rgba(255, 255, 255, 0.03);
          border: 2px dashed rgba(255, 255, 0, 0.2);
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .placeholder-content {
          text-align: center;
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
          background: rgba(255, 255, 255, 0.03);
          border-radius: 15px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .social-card h3 {
          color: #FFFF00;
          margin-bottom: 1.5rem;
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
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          text-decoration: none;
          color: white;
          transition: all 0.3s ease;
        }

        .community-button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateX(5px);
        }

        .community-button .icon {
          font-size: 2rem;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
        }

        .community-button.telegram .icon {
          background: rgba(0, 136, 204, 0.2);
        }

        .community-button.twitter .icon {
          background: rgba(29, 161, 242, 0.2);
        }

        .community-button.tiktok .icon {
          background: rgba(255, 0, 80, 0.2);
        }

        .community-button.blog .icon {
          background: rgba(255, 255, 0, 0.2);
        }

        .community-button strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .community-button p {
          color: #999;
          font-size: 0.85rem;
          margin: 0;
        }

        footer {
          text-align: center;
          padding: 3rem 1rem;
          margin-top: 5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-links {
          margin-top: 1rem;
          color: #999;
        }

        .footer-links a {
          color: #FFFF00;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer-links a:hover {
          color: #FFD700;
          text-decoration: underline;
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
          }

          .desktop-hint {
            display: none;
          }

          .mobile-hint {
            display: block;
          }

          h1 {
            font-size: 3rem;
          }

          h2 {
            font-size: 2rem;
          }

          section {
            padding: 2rem 1.5rem;
            margin: 2rem auto;
          }

          .token-grid {
            grid-template-columns: 1fr;
          }

          .premium-tools-grid {
            grid-template-columns: 1fr;
          }

          .community-memes {
            grid-template-columns: 1fr;
          }

          .social-grid {
            grid-template-columns: 1fr;
          }

          .main-nav {
            display: none;
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

          .modal-share-buttons {
            flex-direction: column;
          }

          .modal-share-btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          h1 {
            font-size: 2.5rem;
          }

          header {
            padding: 3rem 1rem 2rem;
          }

          .pumper-float img {
            width: 150px;
            height: 150px;
          }
        }
        .viral-guarantee-card {
  background: linear-gradient(135deg, rgba(255, 0, 0, 0.05), rgba(255, 215, 0, 0.05));
  border: 2px solid rgba(255, 215, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.viral-guarantee-card::before {
  content: '🔥';
  position: absolute;
  top: -20px;
  right: -20px;
  font-size: 100px;
  opacity: 0.1;
  animation: float 3s ease-in-out infinite;
}

.viral-situation-input {
  width: 100%;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 0, 0.3);
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  margin-bottom: 1rem;
  resize: vertical;
}

.viral-generate-btn {
  width: 100%;
  padding: 1.2rem;
  background: linear-gradient(135deg, #ff0000, #ffff00);
  color: black;
  border: none;
  border-radius: 50px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.viral-generate-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(255, 255, 0, 0.5);
}

.viral-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.3);
  border-top-color: black;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.viral-result {
  margin-top: 2rem;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 0, 0.3);
}

.viral-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.viral-guarantee-badge {
  background: linear-gradient(135deg, #00ff00, #00cc00);
  color: black;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.guarantee-info {
  font-size: 0.7rem;
  opacity: 0.8;
}

.optimal-time-notice {
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid rgba(255, 255, 0, 0.3);
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  text-align: center;
}

.time-reason {
  display: block;
  font-size: 0.85rem;
  color: #999;
  margin-top: 0.25rem;
}

.viral-best-meme {
  margin-bottom: 2rem;
}

.meme-display {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 1rem;
  margin: 1rem 0;
}

.meme-display img {
  width: 100%;
  max-width: 500px;
  border-radius: 10px;
  margin: 0 auto;
  display: block;
}

.meme-caption {
  margin-top: 1rem;
  font-size: 1.1rem;
  text-align: center;
  color: #ffff00;
}

.viral-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.download-viral-btn, .auto-post-status, .connect-for-auto {
  padding: 0.75rem 2rem;
  border-radius: 25px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.download-viral-btn {
  background: linear-gradient(135deg, #ffff00, #ffd700);
  color: black;
}

.auto-post-status {
  background: rgba(0, 255, 0, 0.2);
  border: 1px solid #00ff00;
  color: #00ff00;
  cursor: default;
}

.connect-for-auto {
  background: #1da1f2;
  color: white;
}

.variations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.variation-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.variation-card:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 0, 0.5);
}

.variation-card.selected {
  border: 2px solid #ffff00;
  background: rgba(255, 255, 0, 0.1);
}

.variation-style {
  display: block;
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 0.5rem;
  text-align: center;
}

.variation-card img {
  width: 100%;
  border-radius: 5px;
}

.variation-caption {
  font-size: 0.75rem;
  margin-top: 0.5rem;
  color: #ccc;
}

.ai-pick {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #ffff00;
  color: black;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
}

.viral-stats-display {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(255, 255, 0, 0.05);
  border-radius: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #ffff00;
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: #999;
  margin-top: 0.25rem;
}
.share-viral-btn {
  background: #1DA1F2;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 25px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.share-viral-btn:hover {
  background: #1a8cd8;
  transform: scale(1.05);
}
     .user-description {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #FFFF00;
  font-style: italic;
  color: #ccc;
  font-size: 0.9rem;
}
      `}</style>
    </>
  );
}