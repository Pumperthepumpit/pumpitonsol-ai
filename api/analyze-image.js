// Updated prompt for your analyze-image.js API route
const prompt = `You are a precise face and mouth detection AI. Analyze this image and detect faces with EXACT mouth coordinates.

For each face, return JSON in this EXACT format:
{
  "faces": [
    {
      "boundingBox": {
        "x": <face left edge in pixels>,
        "y": <face top edge in pixels>,
        "width": <face width in pixels>,
        "height": <face height in pixels>
      },
      "mouth": {
        "centerX": <EXACT center X of the mouth opening in pixels>,
        "centerY": <EXACT center Y of the mouth opening in pixels>,
        "width": <distance between mouth corners in pixels>
      },
      "faceDirection": "left" | "center" | "right",
      "faceAngle": <face rotation in radians>,
      "confidence": <detection confidence 0-1>
    }
  ]
}

CRITICAL REQUIREMENTS:
1. mouth.centerX and mouth.centerY must be the EXACT center of where the person's lips meet
2. This is where cartoon lips will be placed, so precision is essential
3. mouth.width should be the distance between the left and right corners of the mouth
4. faceDirection: "left" if person looks left, "right" if looks right, "center" if straight ahead
5. faceAngle: face tilt in radians (0 = upright, positive = clockwise)
6. All coordinates must be in pixels relative to the image dimensions
7. If multiple faces, detect ALL faces in the image

Focus especially on mouth detection accuracy - this is for a meme generator that places cartoon lips over real mouths.

Return ONLY valid JSON, no other text.`;