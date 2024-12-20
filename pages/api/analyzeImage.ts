// import type { NextApiRequest, NextApiResponse } from "next";
// import vision from "@google-cloud/vision";

// // Initialize the Vision API client
// const client = new vision.ImageAnnotatorClient();

// const analyzeImage = async (req: NextApiRequest, res: NextApiResponse) => {
//   try {
//     const { question, imageFilePath } = req.body;

//     // Validate input
//     if (!question) {
//       return res.status(400).json({ error: "Question is required." });
//     }

//     if (!imageFilePath) {
//       return res.status(400).json({ error: "Image file path is required." });
//     }

//     // Perform label detection on the image
//     const [result] = await client.labelDetection(imageFilePath);
//     const labels = result.labelAnnotations || [];

//     // Extract labels
//     const identifiedLabels = labels
//       .map((label) => label.description)
//       .join(", ");

//     const analysisResult = labels.length
//       ? `Identified elements: ${identifiedLabels}`
//       : "No identifiable elements found in the image.";

//     // Combine the question with the analysis result
//     const response = `Question: ${question}\n\nAnalysis: ${analysisResult}`;

//     res.status(200).json({ analysis: response });
//   } catch (error) {
//     console.error("Error analyzing image:", error);
//     res.status(500).json({ error: "Failed to analyze image." });
//   }
// };

// export default analyzeImage;