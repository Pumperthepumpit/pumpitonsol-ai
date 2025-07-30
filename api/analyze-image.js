import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Initialize Gemini AI with API key from environment
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const { image } = req.body;
    
    // Validate that an image was provided
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Extract base64 data and determine image format
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const imageFormat = image.match(/^data:image\/(\w+);base64,/)?.[1] || 'jpeg';
    const mimeType = `image/${imageFormat}`;
    
    // Enhanced prompt for more accurate face detection and positioning
    const prompt = `You are analyzing an image to place overlays on faces. Return EXACT coordinates as percentages (0-1).

CRITICAL INSTRUCTIONS:
1. DETECT ALL FACES in the image
2. For EACH face, identify:
   - MOUTH POSITION: The lips/mouth area where people speak/eat
     * Usually located at 65-70% down from top of head
     * Between nose and chin
     * NOT on chest, tie, or clothing
   - HEAD TOP: The highest point of the head/hair
     * Exclamations go ABOVE this in empty space

FACE ANATOMY GUIDELINES:
- Forehead top: Y = 0.1-0.2
- Eyes: Y = 0.35-0.45
- Nose tip: Y = 0.5-0.6
- MOUTH CENTER: Y = 0.65-0.72
- Chin bottom: Y = 0.75-0.85

Return ONLY this JSON structure (no other text):
{
  "faces": [
    {
      "faceId": 1,
      "mouthPosition": {
        "centerX": [0-1, horizontal position of mouth center],
        "centerY": [0.6-0.75, vertical position of mouth center],
        "width": [0.06-0.12, mouth width relative to image]
      },
      "exclamationPosition": {
        "centerX": [0-1, horizontal position above head],
        "centerY": [0.05-0.3, vertical position above head]
      },
      "faceDirection": ["left", "center", or "right"],
      "faceSize": [0.1-0.5, relative size of face in image],
      "confidence": [0-1, detection confidence]
    }
  ]
}

IMPORTANT RULES:
- Detect ALL visible faces, even partial ones
- mouthPosition.centerY MUST be between 0.6 and 0.75
- exclamationPosition.centerY MUST be between 0.05 and 0.3
- All coordinates are percentages where 0=top/left, 1=bottom/right
- If multiple faces, return array with all faces
- Face IDs should be unique integers starting from 1`;

    // Generate content with Gemini
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
    
    console.log('Gemini raw response:', text);
    
    let positionData;
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        positionData = JSON.parse(jsonMatch[0]);
        
        // Validate and enhance the response
        if (positionData.faces && positionData.faces.length > 0) {
          positionData.faces.forEach((face, index) => {
            // Log detected positions for debugging
            console.log(`Face ${index + 1} detected:`, {
              mouth: face.mouthPosition,
              exclamation: face.exclamationPosition,
              confidence: face.confidence
            });
            
            // Validate and fix mouth position
            if (!face.mouthPosition) {
              face.mouthPosition = {};
            }
            
            // Ensure mouth Y is in realistic range
            if (!face.mouthPosition.centerY || 
                face.mouthPosition.centerY < 0.6 || 
                face.mouthPosition.centerY > 0.75) {
              console.log(`Adjusting mouth Y from ${face.mouthPosition.centerY} to 0.68`);
              face.mouthPosition.centerY = 0.68;
            }
            
            // Ensure mouth X is valid
            face.mouthPosition.centerX = face.mouthPosition.centerX || 0.5;
            face.mouthPosition.centerX = Math.max(0, Math.min(1, face.mouthPosition.centerX));
            
            // Set mouth width
            face.mouthPosition.width = face.mouthPosition.width || 0.08;
            face.mouthPosition.width = Math.max(0.06, Math.min(0.12, face.mouthPosition.width));
            
            // Validate exclamation position
            if (!face.exclamationPosition) {
              face.exclamationPosition = {};
            }
            
            // Ensure exclamation Y is above head
            if (!face.exclamationPosition.centerY || 
                face.exclamationPosition.centerY > 0.3 ||
                face.exclamationPosition.centerY < 0.05) {
              console.log(`Adjusting exclamation Y from ${face.exclamationPosition.centerY} to 0.15`);
              face.exclamationPosition.centerY = 0.15;
            }
            
            // Ensure exclamation X matches face X by default
            if (!face.exclamationPosition.centerX) {
              face.exclamationPosition.centerX = face.mouthPosition.centerX;
            }
            face.exclamationPosition.centerX = Math.max(0, Math.min(1, face.exclamationPosition.centerX));
            
            // Set other properties
            face.faceSize = face.faceSize || 0.25;
            face.faceSize = Math.max(0.1, Math.min(0.5, face.faceSize));
            
            face.faceDirection = face.faceDirection || "center";
            if (!["left", "center", "right"].includes(face.faceDirection)) {
              face.faceDirection = "center";
            }
            
            // Add confidence if not provided
            face.confidence = face.confidence || 0.9;
            
            // Ensure face ID
            face.faceId = face.faceId || (index + 1);
          });
          
          // Sort faces by size (larger faces first)
          positionData.faces.sort((a, b) => (b.faceSize || 0.25) - (a.faceSize || 0.25));
          
        } else {
          throw new Error('No faces detected in response');
        }
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response was:', text);
      
      // Return default centered position as fallback
      positionData = {
        faces: [{
          faceId: 1,
          mouthPosition: {
            centerX: 0.5,
            centerY: 0.68,
            width: 0.08
          },
          exclamationPosition: {
            centerX: 0.5,
            centerY: 0.15
          },
          faceDirection: "center",
          faceSize: 0.25,
          confidence: 0.5
        }]
      };
    }
    
    // Add metadata to response
    positionData.metadata = {
      imageFormat: imageFormat,
      processedAt: new Date().toISOString(),
      model: "gemini-1.5-flash"
    };
    
    console.log('Returning position data:', JSON.stringify(positionData, null, 2));
    return res.status(200).json(positionData);
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Return a more detailed error response while still providing usable defaults
    return res.status(200).json({
      faces: [{
        faceId: 1,
        mouthPosition: {
          centerX: 0.5,
          centerY: 0.68,
          width: 0.08
        },
        exclamationPosition: {
          centerX: 0.5,
          centerY: 0.15
        },
        faceDirection: "center",
        faceSize: 0.25,
        confidence: 0.3
      }],
      metadata: {
        error: error.message,
        fallback: true,
        processedAt: new Date().toISOString()
      }
    });
  }
}

// Configure API route to handle larger image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
