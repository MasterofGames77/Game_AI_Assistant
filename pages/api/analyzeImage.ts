// import type { NextApiRequest, NextApiResponse } from "next";
// import { ImageAnnotatorClient } from "@google-cloud/vision";
// import { getChatCompletion } from "../../utils/aiHelper";
// import path from "path";
// import fs from 'fs';

// const analyzeImage = async (req: NextApiRequest, res: NextApiResponse) => {
//   try {
//     const { question, imageFilePath } = req.body;
//     console.log("Processing request:", { question, imageFilePath });

//     // Get the base answer for the question regardless of image
//     let baseAnswer = await getChatCompletion(question);
    
//     if (!baseAnswer) {
//       baseAnswer = "I couldn't generate an answer for your question.";
//     }

//     // If no image was provided, return just the question answer
//     if (!imageFilePath) {
//       return res.status(200).json({
//         analysis: baseAnswer
//       });
//     }

//     // If image is provided, use Google Vision API
//     try {
//       const client = new ImageAnnotatorClient();
//       const imagePath = path.join(process.cwd(), 'public', imageFilePath);
      
//       // Verify file exists
//       if (!fs.existsSync(imagePath)) {
//         console.error("Image file not found:", imagePath);
//         return res.status(200).json({
//           analysis: baseAnswer
//         });
//       }

//       const [result] = await client.labelDetection(imagePath);
//       const labels = result.labelAnnotations?.map(label => label?.description).filter(Boolean) || [];
//       console.log("Vision API labels:", labels);
      
//       // Filter for gaming-related labels
//       const gamingLabels = labels.filter(label => 
//         label?.toLowerCase().includes('game') ||
//         label?.toLowerCase().includes('console') ||
//         label?.toLowerCase().includes('controller') ||
//         label?.toLowerCase().includes('screen') ||
//         label?.toLowerCase().includes('video') ||
//         label?.toLowerCase().includes('gaming')
//       );

//       // Combine the base answer with image analysis
//       const combinedAnswer = gamingLabels.length > 0
//         ? `${baseAnswer}\n\nImage Analysis: I can see this image contains: ${gamingLabels.join(', ')}. This appears to be related to video games.`
//         : `${baseAnswer}\n\nImage Analysis: While I can see the image, I don't detect any specific gaming-related elements.`;

//       return res.status(200).json({
//         analysis: combinedAnswer
//       });

//     } catch (imageError) {
//       console.error("Error analyzing image:", imageError);
//       // Return the base answer if image analysis fails
//       return res.status(200).json({
//         analysis: baseAnswer
//       });
//     }
//   } catch (error) {
//     console.error("Error in API route:", error);
//     res.status(500).json({ error: "Failed to process request." });
//   }
// };

// export default analyzeImage;