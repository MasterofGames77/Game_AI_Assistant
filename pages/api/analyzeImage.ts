// import type { NextApiRequest, NextApiResponse } from "next";
// import { ImageAnnotatorClient } from "@google-cloud/vision";
// import { getChatCompletion } from "../../utils/aiHelper";
// import path from "path";
// import fs from 'fs';

// const getGoogleCredentials = () => {
//     if (process.env.NODE_ENV === 'production') {
//       // For production: use credentials from environment variable
//       return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}');
//     } else {
//       // For development: use local JSON file
//       return require('../../path/to/your/credentials.json');
//     }
//   };

// const analyzeImage = async (req: NextApiRequest, res: NextApiResponse) => {
//   try {
//     const { question, imageFilePath } = req.body;
//     console.log("Processing request:", { question, imageFilePath });

//     // Get the base answer for the question using existing game databases
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
      
//       if (!fs.existsSync(imagePath)) {
//         console.error("Image file not found:", imagePath);
//         return res.status(200).json({
//           analysis: baseAnswer
//         });
//       }

//       // Get both labels and text from the image
//       const [labelResult] = await client.labelDetection(imagePath);
//       const [textResult] = await client.textDetection(imagePath);
      
//       const labels = labelResult.labelAnnotations?.map(label => label?.description).filter(Boolean) || [];
//       const detectedText = textResult.textAnnotations?.[0]?.description || '';
      
//       console.log("Vision API labels:", labels);
//       console.log("Detected text:", detectedText);

//       // Combine all detected information
//       const imageAnalysis = [];
      
//       if (labels.length > 0) {
//         imageAnalysis.push(`I can see: ${labels.join(', ')}`);
//       }
      
//       if (detectedText) {
//         imageAnalysis.push(`I can read the following text: ${detectedText}`);
//       }

//       // Combine the base answer with image analysis
//       const combinedAnswer = imageAnalysis.length > 0
//         ? `${baseAnswer}\n\nBased on the image you provided:\n${imageAnalysis.join('\n')}`
//         : `${baseAnswer}\n\nI analyzed the image but couldn't detect any specific gaming-related elements.`;

//       return res.status(200).json({
//         analysis: combinedAnswer
//       });

//     } catch (imageError) {
//       console.error("Error analyzing image:", imageError);
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
// export { getGoogleCredentials };