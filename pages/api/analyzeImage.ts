import type { NextApiRequest, NextApiResponse } from "next";

// Mock question analysis function
const analyzeQuestion = (question: string): string => {
  if (question.toLowerCase().includes("sonic unleashed")) {
    return "This image might be from the game Sonic Unleashed. Please provide more details.";
  }
  return "We couldn't identify the game from your question.";
};

const analyzeImage = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { question, imageFilePath } = req.body;

    // Validate input
    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    // Placeholder for actual image analysis
    let analysisResult = "No image provided for analysis.";
    if (imageFilePath) {
      // Simulated logic for analyzing the image
      console.log(`Analyzing image at: ${imageFilePath}`);
      analysisResult = `The image at ${imageFilePath} has been analyzed successfully.`;
    }

    // Analyze the question
    const questionAnalysis = analyzeQuestion(question);

    // Combine the image analysis and question analysis into a single response
    const response = `Question: ${question}\n\nAnalysis: ${analysisResult}\n\nQuestion Analysis: ${questionAnalysis}`;

    // Send the response
    res.status(200).json({ analysis: response });
  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: "Failed to analyze image." });
  }
};

export default analyzeImage;
