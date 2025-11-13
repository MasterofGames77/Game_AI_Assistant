import type { NextApiRequest, NextApiResponse } from "next";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import path from "path";
import fs from 'fs';
import { getChatCompletion } from "../../utils/aiHelper";

const getGoogleCredentials = () => {
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (error) {
      console.error('Error parsing Google credentials:', error);
      return null;
    }
  }
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, imageFilePath, imageUrl } = req.body;
    console.log("Processing request:", { question, imageFilePath, imageUrl });

    // Get the base answer for the question using existing game databases
    let baseAnswer = await getChatCompletion(question);
    
    if (!baseAnswer) {
      baseAnswer = "I couldn't generate an answer for your question.";
    }

    // Determine image path - support both local file paths and cloud URLs
    let imagePath: string | null = null;
    
    if (imageUrl) {
      // If imageUrl is provided (from cloud storage), download it temporarily for analysis
      // Note: Google Vision API needs a local file path, so we download cloud images temporarily
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const tempPath = path.join(process.cwd(), 'tmp', 'analysis', `temp-${Date.now()}.jpg`);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(tempPath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        imagePath = tempPath;
      } catch (error) {
        console.error("Error downloading image from URL:", error);
        // Fall back to base answer if image download fails
        return res.status(200).json({
          analysis: baseAnswer,
          error: "Could not download image for analysis"
        });
      }
    } else if (imageFilePath) {
      // Local file path (development mode or local storage)
      imagePath = path.join(process.cwd(), 'public', imageFilePath);
    }

    // If no image was provided, return just the question answer
    if (!imagePath) {
      return res.status(200).json({
        analysis: baseAnswer
      });
    }

    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      console.error("Image file not found:", imagePath);
      return res.status(200).json({
        analysis: baseAnswer,
        error: "Image file not found"
      });
    }

    // If image is provided, use Google Vision API
    try {
      const credentials = getGoogleCredentials();
      if (!credentials) {
        console.error("Google Cloud Vision credentials not configured");
        return res.status(200).json({
          analysis: baseAnswer,
          error: "Image analysis service not configured"
        });
      }

      const client = new ImageAnnotatorClient({
        credentials: credentials,
      });
      
      // Get both labels and text from the image
      const [labelResult] = await client.labelDetection(imagePath);
      const [textResult] = await client.textDetection(imagePath);
      
      const labels = labelResult.labelAnnotations?.map(label => label?.description).filter(Boolean) || [];
      const detectedText = textResult.textAnnotations?.[0]?.description || '';
      
      console.log("Vision API labels:", labels);
      console.log("Detected text:", detectedText);

      // Clean up temporary file if it was downloaded from cloud storage
      if (imageUrl && imagePath.startsWith(path.join(process.cwd(), 'tmp'))) {
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanupError) {
          console.error("Error cleaning up temp file:", cleanupError);
        }
      }

      // Combine all detected information
      const imageAnalysis = [];
      
      if (labels.length > 0) {
        imageAnalysis.push(`I can see: ${labels.join(', ')}`);
      }
      
      if (detectedText) {
        imageAnalysis.push(`I can read the following text: ${detectedText}`);
      }

      // Combine the base answer with image analysis
      const combinedAnswer = imageAnalysis.length > 0
        ? `${baseAnswer}\n\nBased on the image you provided:\n${imageAnalysis.join('\n')}`
        : `${baseAnswer}\n\nI analyzed the image but couldn't detect any specific gaming-related elements.`;

      return res.status(200).json({
        analysis: combinedAnswer,
        imageAnalysis: {
          labels,
          detectedText,
          labelCount: labels.length
        }
      });

    } catch (imageError) {
      console.error("Error analyzing image:", imageError);
      
      // Clean up temporary file if it was downloaded from cloud storage
      if (imageUrl && imagePath && imagePath.startsWith(path.join(process.cwd(), 'tmp'))) {
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanupError) {
          console.error("Error cleaning up temp file:", cleanupError);
        }
      }
      
      return res.status(200).json({
        analysis: baseAnswer,
        error: "Failed to analyze image"
      });
    }
  } catch (error) {
    console.error("Error in API route:", error);
    res.status(500).json({ error: "Failed to process request." });
  }
}
