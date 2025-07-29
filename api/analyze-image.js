import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const imageFormat = image.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpeg';
    const mimeType = `image/${imageFormat}`;

    const prompt = `You are a precision meme positioning expert. Analyze this image for PNG overlay placement.

For each face detected, provide EXACT positioning data as percentages (0.0 to 1.0) of image dimensions.

Return JSON in this EXACT format:
{
  "imageWidth": <estimated_pixel_width>,
  "imageHeight": <estimated_pixel_height>,
  "faces": [
    {
      "faceId": 1,
      "mouthPosition": {
        "centerX": 0.X,  // mouth center X as percentage (0.0-1.0)
        "centerY": 0.Y,  // mouth center Y as percentage (0.0-1.0) 
        "width": 0.Z,    // mouth width as percentage for lip scaling
        "angle": 0.0     // face rotation in radians
      },
      "exclamationPosition": {
        "centerX": 0.X,  // center point for 3 exclamations
        "centerY": 0.Y   // above head position
      },
      "faceDirection": "left" | "center" | "right",
      "faceSize": 0.X,  // face size as percentage for scaling
      "confidence": 0.9
    }
  ]
}

CRITICAL REQUIREMENTS:
- Use percentages (0.0-1.0) for all coordinates
- mouthPosition.centerX/Y = exact center where PNG lips should be placed
- exclamationPosition = where center exclamation mark goes (other 2 will be offset)
- faceDirection affects exclamation spacing (left face = marks spread left)
- Be extremely precise - this controls PNG placement

Return ONLY valid JSON, no other text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini positioning response:', text);
    
    let positionData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        positionData = JSON.parse(jsonMatch[0]);
        
        if (!positionData.faces || !Array.isArray(positionData.faces)) {
          throw new Error('Invalid response - missing faces array');
        }
        
        positionData.faces.forEach((face, index) => {
          if (!face.mouthPosition || typeof face.mouthPosition.centerX !== 'number') {
            throw new Error(`Face ${index} missing valid mouth position`);
          }
        });
        
        console.log('✅ Parsed positioning data:', JSON.stringify(positionData, null, 2));
        
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini positioning:', text);
      return res.status(500).json({ 
        error: 'Failed to parse positioning data',
        details: text,
        parseError: parseError.message
      });
    }

    return res.status(200).json(positionData);

  } catch (error) {
    console.error('Gemini positioning error:', error);
    return res.status(500).json({ 
      error: 'Failed to get positioning data',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};