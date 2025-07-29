// Replace your existing generateMeme function with this updated version

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
    console.log('🚀 Starting full AI meme generation...');
    
    // Convert image to base64
    const reader = new FileReader();
    const imageDataUrl = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(selectedFile);
    });

    console.log('🧠 Sending image to AI for analysis and generation...');

    // Call our new AI generation API
    const response = await fetch('/api/generate-ai-meme', {
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
      throw new Error(errorData.error || 'AI generation failed');
    }

    const data = await response.json();
    
    if (data.success && data.memeUrl) {
      console.log('🎉 AI meme generated successfully!');
      console.log('Generation time:', data.generationTime);
      console.log('Analysis:', data.analysis);
      
      // Set the generated meme URL
      setPreview(data.memeUrl);
      setGeneratedMeme(data.memeUrl);
      
      // Add to community memes
      const newMeme = {
        url: data.memeUrl,
        creator: xHandle,
        timestamp: Date.now(),
        aiGenerated: true,
        analysis: data.analysis?.originalDescription || 'AI-generated $PUMPIT meme'
      };
      
      setCommunityMemes(prev => {
        const updated = [newMeme, ...prev].slice(0, 3);
        return updated;
      });
      
      setIsProcessing(false);
      
    } else {
      throw new Error('AI generation returned no image');
    }
    
  } catch (error) {
    console.error('AI meme generation failed:', error);
    setError(`AI generation failed: ${error.message}`);
    setIsProcessing(false);
  }
};

// Also update the downloadMeme function to handle URLs
const downloadMeme = async () => {
  if (!generatedMeme) return;
  
  try {
    // If it's a URL (from AI generation), fetch and download
    if (generatedMeme.startsWith('http')) {
      const response = await fetch(generatedMeme);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `pumpit-ai-meme-${Date.now()}.png`;
      a.click();
      
      URL.revokeObjectURL(url);
    } else {
      // Original blob URL handling
      const a = document.createElement('a');
      a.href = generatedMeme;
      a.download = `pumpit-ai-meme-${Date.now()}.png`;
      a.click();
    }
  } catch (error) {
    console.error('Download failed:', error);
    setError('Failed to download meme');
  }
};