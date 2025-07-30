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
    
    const prompt = `You are a face and mouth detection expert. Analyze this image and find the EXACT location of mouths/lips and heads.

CRITICAL INSTRUCTIONS:
1. For MOUTH position:
   - Find the ACTUAL lips/mouth on the face
   - For humans: Look for the pink/red lips area between nose and chin
   - The mouth is typically at 60-70% down the face
   - NEVER place lips on chest, neck, or clothing
   - centerY should be around 0.6-0.75 for most faces

2. For EXCLAMATION position:
   - Place ABOVE the top of the head/hair
   - Should be in empty space above the person
   - centerY should be around 0.1-0.3 (lower number = higher up)
   - NEVER place on forehead or face

3. Common face proportions:
   - Eyes: 40-50% down from top
   - Nose: 50-60% down
   - MOUTH: 65-75% down
   - Chin: 80-90% down

Return coordinates as percentages (0.0 to 1.0):
{
  "faces": [{
    "faceId": 1,
    "mouthPosition": {
      "centerX": 0.5,  // horizontal center of mouth
      "centerY": 0.7,  // IMPORTANT: should be 0.65-0.75 for mouth
      "width": 0.08
    },
    "exclamationPosition": {
      "centerX": 0.5,
      "centerY": 0.15  // IMPORTANT: should be 0.1-0.3 for above head
    },
    "faceDirection": "center",
    "faceSize": 0.3
  }]
}

BE VERY PRECISE. The mouth is where people eat/speak, NOT on their chest!`;

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
    
    console.log('Gemini response:', text);
    
    let positionData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        positionData = JSON.parse(jsonMatch[0]);
        
        // Validate mouth position isn't too low
        positionData.faces.forEach(face => {
          if (face.mouthPosition.centerY > 0.8) {
            console.warn('Mouth position too low, adjusting...');
            face.mouthPosition.centerY = 0.7;
          }
          if (face.mouthPosition.centerY < 0.5) {
            console.warn('Mouth position too high, adjusting...');
            face.mouthPosition.centerY = 0.65;
          }
          
          // Ensure exclamation is truly above head
          if (face.exclamationPosition.centerY > 0.4) {
            console.warn('Exclamation too low, moving up...');
            face.exclamationPosition.centerY = 0.2;
          }
        });
        
        console.log('Final positions:', positionData);
      } else {
        throw new Error('No JSON in response');
      }
    } catch (e) {
      console.error('Parse error:', e);
      positionData = {
        faces: [{
          faceId: 1,
          mouthPosition: { centerX: 0.5, centerY: 0.7, width: 0.1 },
          exclamationPosition: { centerX: 0.5, centerY: 0.2 },
          faceDirection: "center",
          faceSize: 0.3
        }]
      };
    }
    
    return res.status(200).json(positionData);
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({
      faces: [{
        faceId: 1,
        mouthPosition: { centerX: 0.5, centerY: 0.7, width: 0.1 },
        exclamationPosition: { centerX: 0.5, centerY: 0.2 },
        faceDirection: "center",
        faceSize: 0.3
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
