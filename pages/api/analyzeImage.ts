// import type { NextApiRequest, NextApiResponse } from 'next';
// import fs from 'fs';
// import path from 'path';
// import OpenAI from 'openai';

// // Initialize OpenAI client with your API key
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// type AnalysisResponse = {
//   description: string;
// };

// export default async function analyzeImageHandler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   try {
//     // Check for POST request and the presence of `filePath` in the body
//     if (req.method !== 'POST' || !req.body.filePath) {
//       return res.status(400).json({ error: 'Invalid request' });
//     }

//     const { filePath } = req.body;

//     // Full path to the image file
//     const fullFilePath = path.join(process.cwd(), 'public', filePath);

//     // Check if the file exists
//     if (!fs.existsSync(fullFilePath)) {
//       return res.status(404).json({ error: 'Image not found' });
//     }

//     // Load the image data
//     const imageData = fs.readFileSync(fullFilePath);

//     // Use a prompt to guide the model's response based on image context
//     const prompt = `Analyze this image file for details on game level, setting, or objectives: ${filePath}`;

//     // Perform text-based analysis using the text model
//     const response = await openai.completions.create({
//       model: "text-davinci-003",
//       prompt,
//       max_tokens: 800,
//       temperature: 0.7,
//     });

//     // Extract the model's response
//     const description = response.choices[0]?.text?.trim() || 'Description not available';

//     // Return the response
//     const analysisResult: AnalysisResponse = {
//       description,
//     };

//     return res.status(200).json(analysisResult);
//   } catch (error) {
//     console.error('Error analyzing image:', error);
//     return res.status(500).json({ error: 'Failed to analyze image' });
//   }
// }