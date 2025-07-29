import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Remove data:image/jpeg;base64, prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // Prepare the prompt for Gemini
    const prompt = `Analyze this image and detect faces. For each face found, return the exact coordinates in this JSON format:
    {
      "faces": [
        {
          "boundingBox": {
            "x": <left position>,
            "y": <top position>,
            "width": <width>,
            "height": <height>
          },
          "mouth": {
            "centerX": <mouth center X>,
            "centerY": <mouth center Y>,
            "width": <mouth width>,
            "height": <mouth height>
          },
          "faceDirection": "left" | "center" | "right",
          "faceAngle": <rotation in radians>
        }
      ]
    }
    
    Important:
    - Coordinates should be in pixels relative to image dimensions
    - Detect if the face is looking left, center, or right
    - Include face rotation angle
    - Be precise with mouth location for placing oversized cartoon lips
    
    Return ONLY the JSON, no other text.`;

    // Call Gemini Vision API
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    let faceData;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        faceData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return res.status(500).json({ 
        error: 'Failed to parse face detection results',
        details: text 
      });
    }

    return res.status(200).json(faceData);

  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze image',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow larger images
    },
  },
};