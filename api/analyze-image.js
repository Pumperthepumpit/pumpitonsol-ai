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
    
    // Much more specific prompt based on what works
    const prompt = `You are analyzing an image to place overlays. Return EXACT coordinates.

CRITICAL: Look at the image and identify:
1. WHERE IS THE MOUTH? The mouth is where lips are, where people speak/eat. 
   - For a person in a suit on phone: mouth is on their FACE (not on tie/chest)
   - Mouth is between nose and chin
   - Usually around 65-70% down the face

2. WHERE IS THE TOP OF HEAD? 
   - The highest point of their head/hair
   - Exclamations go ABOVE this point in empty space

For a typical face:
- Eyes: Y = 0.4-0.45
- Nose tip: Y = 0.55
- MOUTH CENTER: Y = 0.65-0.7
- Chin: Y = 0.8

Return this exact JSON structure:
{
  "faces": [
    {
      "faceId": 1,
      "mouthPosition": {
        "centerX": 0.5,
        "centerY": 0.68,
        "width": 0.08
      },
      "exclamationPosition": {
        "centerX": 0.5,
        "centerY": 0.15
      },
      "faceDirection": "center",
      "faceSize": 0.25
    }
  ]
}

IMPORTANT: 
- mouthPosition.centerY MUST be between 0.6 and 0.75
- exclamationPosition.centerY MUST be between 0.1 and 0.3
- These are percentages where 0=top, 1=bottom`;

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
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        positionData = JSON.parse(jsonMatch[0]);
        
        // Validate and fix positions if needed
        if (positionData.faces && positionData.faces.length > 0) {
          positionData.faces.forEach((face, index) => {
            // Log what AI detected
            console.log(`Face ${index + 1} detected:`, {
              mouth: face.mouthPosition,
              exclamation: face.exclamationPosition
            });
            
            // Ensure mouth is in reasonable range
            if (!face.mouthPosition.centerY || face.mouthPosition.centerY < 0.6 || face.mouthPosition.centerY > 0.75) {
              console.log(`Fixing mouth position from ${face.mouthPosition.centerY} to 0.68`);
              face.mouthPosition.centerY = 0.68;
            }
            
            // Ensure exclamation is above head
            if (!face.exclamationPosition.centerY || face.exclamationPosition.centerY > 0.3) {
              console.log(`Fixing exclamation position from ${face.exclamationPosition.centerY} to 0.15`);
              face.exclamationPosition.centerY = 0.15;
            }
            
            // Ensure centerX values exist
            face.mouthPosition.centerX = face.mouthPosition.centerX || 0.5;
            face.exclamationPosition.centerX = face.exclamationPosition.centerX || 0.5;
            
            // Ensure other values
            face.mouthPosition.width = face.mouthPosition.width || 0.08;
            face.faceSize = face.faceSize || 0.25;
            face.faceDirection = face.faceDirection || "center";
          });
        } else {
          throw new Error('No faces detected');
        }
      } else {
        throw new Error('No valid JSON in response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response was:', text);
      
      // Return default centered positions
      positionData = {
        faces: [{
          faceId: 1,
          mouthPosition: {
            centerX: 0.5,
            centerY: 0.68,  // Standard mouth position
            width: 0.08
          },
          exclamationPosition: {
            centerX: 0.5,
            centerY: 0.15   // Above head
          },
          faceDirection: "center",
          faceSize: 0.25
        }]
      };
    }
    
    console.log('Returning position data:', JSON.stringify(positionData, null, 2));
    return res.status(200).json(positionData);
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Always return valid position data even on error
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
        faceSize: 0.25
      }]
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
