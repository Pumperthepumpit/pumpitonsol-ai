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
    
    const prompt = `You are an expert at detecting faces and mouths in ANY type of image - humans, animals, cartoons, anime, drawings, etc.

Your task is to find ANY face-like structure and identify where to place cartoon lips and exclamation marks for a meme.

WHAT TO LOOK FOR:
- Human faces (real photos or drawings)
- Animal faces (dogs, cats, frogs, birds, etc.)
- Cartoon/anime characters
- Anthropomorphic objects with faces
- Basically ANYTHING that has eyes and could have a mouth

POSITIONING RULES:
1. MOUTH/LIPS POSITION:
   - For humans: Find the actual mouth/lips
   - For animals: Find the mouth, muzzle, or beak area
   - For cartoons: Find the mouth or where it should be
   - If no clear mouth: Place it where a mouth would logically be (below eyes/nose area)
   - For creatures facing sideways: Adjust position accordingly

2. EXCLAMATION POSITION:
   - Place ABOVE the head/top of the character
   - For animals with ears: Place above the ears
   - For characters with hats/accessories: Place above those

3. IF NO CLEAR FACE IS FOUND:
   - Look for the main subject/character in the image
   - Place lips in the lower-middle area of that subject
   - Place exclamations above the subject

Return JSON with coordinates as percentages (0.0 to 1.0):
{
  "imageWidth": 1000,
  "imageHeight": 1000,
  "faces": [
    {
      "faceId": 1,
      "subjectType": "human|animal|cartoon|object",
      "subjectName": "dog|cat|person|frog|etc",
      "mouthPosition": {
        "centerX": 0.5,    // horizontal position (0=left, 1=right)
        "centerY": 0.7,    // vertical position (0=top, 1=bottom)
        "width": 0.1,      // suggested width based on subject size
        "angle": 0.0       // rotation if face is tilted
      },
      "exclamationPosition": {
        "centerX": 0.5,    // usually aligned with face center
        "centerY": 0.2     // above the subject
      },
      "faceDirection": "left|center|right",
      "faceSize": 0.3,     // how much of image the face takes up
      "confidence": 0.9,
      "notes": "Detected a dog facing left, mouth is on the muzzle"
    }
  ],
  "debugInfo": "Describe what you see and why you placed items there"
}

IMPORTANT:
- Always find SOMETHING to put lips on - be creative!
- Adjust positions based on the subject (animal mouths are different from human mouths)
- If multiple subjects, detect all of them
- Include helpful notes about what you detected

Return ONLY valid JSON.`;

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
    
    console.log('Gemini analysis response:', text);
    
    let positionData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        positionData = JSON.parse(jsonMatch[0]);
        
        if (!positionData.faces || !Array.isArray(positionData.faces)) {
          // If no faces found, create a default placement
          console.log('No faces detected, using default placement');
          positionData = {
            faces: [{
              faceId: 1,
              subjectType: "unknown",
              subjectName: "main subject",
              mouthPosition: {
                centerX: 0.5,
                centerY: 0.65,
                width: 0.15,
                angle: 0
              },
              exclamationPosition: {
                centerX: 0.5,
                centerY: 0.25
              },
              faceDirection: "center",
              faceSize: 0.3,
              confidence: 0.5,
              notes: "No clear face detected, using default positioning"
            }]
          };
        }
        
        // Adjust positions based on subject type
        positionData.faces.forEach((face, index) => {
          console.log(`Detected ${face.subjectType}: ${face.subjectName}`);
          
          // Animal-specific adjustments
          if (face.subjectType === 'animal') {
            // Animals often have mouths lower or more forward
            if (face.subjectName?.includes('dog') || face.subjectName?.includes('wolf')) {
              // Dogs have snouts, adjust forward if side view
              if (face.faceDirection === 'left') {
                face.mouthPosition.centerX = Math.max(0.2, face.mouthPosition.centerX - 0.1);
              } else if (face.faceDirection === 'right') {
                face.mouthPosition.centerX = Math.min(0.8, face.mouthPosition.centerX + 0.1);
              }
            }
            
            if (face.subjectName?.includes('cat')) {
              // Cats have smaller mouths
              face.mouthPosition.width = Math.min(0.08, face.mouthPosition.width);
            }
            
            if (face.subjectName?.includes('bird')) {
              // Birds have beaks, make lips smaller
              face.mouthPosition.width = Math.min(0.06, face.mouthPosition.width);
            }
          }
          
          // Cartoon adjustments
          if (face.subjectType === 'cartoon') {
            // Cartoons often have exaggerated features
            face.mouthPosition.width = Math.max(0.12, face.mouthPosition.width);
          }
          
          // Ensure positions are within bounds
          face.mouthPosition.centerX = Math.max(0.1, Math.min(0.9, face.mouthPosition.centerX));
          face.mouthPosition.centerY = Math.max(0.3, Math.min(0.9, face.mouthPosition.centerY));
          face.exclamationPosition.centerX = Math.max(0.1, Math.min(0.9, face.exclamationPosition.centerX));
          face.exclamationPosition.centerY = Math.max(0.05, Math.min(0.5, face.exclamationPosition.centerY));
          
          // Default face size if missing
          if (!face.faceSize || face.faceSize === 0) {
            face.faceSize = 0.25;
          }
        });
        
        console.log('✅ Final positioning data:', JSON.stringify(positionData, null, 2));
        
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      // Return default positioning as fallback
      positionData = {
        faces: [{
          faceId: 1,
          subjectType: "unknown",
          subjectName: "subject",
          mouthPosition: {
            centerX: 0.5,
            centerY: 0.65,
            width: 0.15,
            angle: 0
          },
          exclamationPosition: {
            centerX: 0.5,
            centerY: 0.25
          },
          faceDirection: "center",
          faceSize: 0.3,
          confidence: 0.3,
          notes: "Error in detection, using default positioning"
        }]
      };
    }
    
    return res.status(200).json(positionData);
    
  } catch (error) {
    console.error('Gemini positioning error:', error);
    // Return default positioning as ultimate fallback
    return res.status(200).json({
      faces: [{
        faceId: 1,
        subjectType: "unknown",
        subjectName: "subject",
        mouthPosition: {
          centerX: 0.5,
          centerY: 0.65,
          width: 0.15,
          angle: 0
        },
        exclamationPosition: {
          centerX: 0.5,
          centerY: 0.25
        },
        faceDirection: "center",
        faceSize: 0.3,
        confidence: 0.1,
        notes: "API error, using default positioning"
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
