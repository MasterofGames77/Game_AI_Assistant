// import type { NextApiRequest, NextApiResponse } from 'next';
// import fs from 'fs';
// import path from 'path';
// import OpenAI from 'openai';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY!,
// });

// type AnalysisResponse = {
//   description: string;
// };

// // Modify analyzeImage to return data instead of requiring `res`
// export async function analyzeImage(filePath: string): Promise<AnalysisResponse> {
//   try {
//     const fullFilePath = path.join(process.cwd(), 'public', filePath);

//     if (!fs.existsSync(fullFilePath)) {
//       throw new Error('Image not found');
//     }

//     const imageData = fs.readFileSync(fullFilePath);

//     const prompt = `Analyze this image to determine the game level, setting, or objectives: ${filePath}`;

//     const response = await openai.completions.create({
//       model: "text-davinci-003",
//       prompt,
//       max_tokens: 800,
//       temperature: 0.7,
//     });

//     const description = response.choices[0]?.text?.trim() || 'Description not available';

//     return { description };
//   } catch (error) {
//     console.error('Error analyzing image:', error);
//     throw new Error('Failed to analyze image');
//   }
// }

// // For handling API requests directly if needed
// export default async function analyzeImageHandler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method === 'POST' && req.body.filePath) {
//     try {
//       const analysisResult = await analyzeImage(req.body.filePath);
//       res.status(200).json(analysisResult);
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to analyze image' });
//     }
//   } else {
//     res.status(400).json({ error: 'Invalid request' });
//   }
// }