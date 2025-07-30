import Replicate from 'replicate';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Initialize Replicate with API token
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    console.log('🐾 Running animal face detection...');
    
    // Use a vision model that can detect animals
    const output = await replicate.run(
      "salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746",
      {
        input: {
          image: image,
          task: "image_captioning"
        }
      }
    );
    
    // Parse the caption to detect animal presence
    const caption = (output || '').toLowerCase();
    console.log('🐾 Image caption:', caption);
    
    let faces = [];
    
    // Check if caption mentions common animals
    const animalKeywords = ['dog', 'cat', 'puppy', 'kitten', 'pet', 'animal', 'bird', 'rabbit', 'hamster', 'mouse', 'bear', 'lion', 'tiger'];
    const hasAnimal = animalKeywords.some(keyword => caption.includes(keyword));
    
    if (hasAnimal) {
      // For animals, estimate face position based on typical composition
      // Most pet photos have the animal face in center-upper area
      faces = [{
        mouthPosition: {
          centerX: 0.5,   // Center horizontally
          centerY: 0.65,  // Slightly lower for animal snouts
          width: 0.12
        },
        exclamationPosition: {
          centerX: 0.5,
          centerY: 0.2   // Above head
        },
        faceDirection: "center",
        faceSize: 0.35,  // Animals often take up more of the frame
        confidence: 0.7,
        animalType: animalKeywords.find(keyword => caption.includes(keyword)) || 'animal'
      }];
      
      // Adjust positions based on animal type
      if (caption.includes('cat') || caption.includes('kitten')) {
        faces[0].mouthPosition.centerY = 0.68; // Cats have smaller snouts
        faces[0].faceSize = 0.3;
      } else if (caption.includes('dog') || caption.includes('puppy')) {
        faces[0].mouthPosition.centerY = 0.65; // Dogs have longer snouts
        faces[0].faceSize = 0.35;
      }
    }
    
    console.log(`🐾 Detected ${faces.length} animal face(s)`);
    
    return res.status(200).json({
      faces: faces,
      metadata: {
        model: 'replicate-animal',
        caption: caption,
        processedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Animal detection error:', error);
    
    // Return empty result instead of error to allow fallback
    return res.status(200).json({
      faces: [],
      metadata: {
        error: error.message,
        model: 'replicate-animal',
        processedAt: new Date().toISOString()
      }
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