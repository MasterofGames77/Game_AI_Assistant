import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import axios from 'axios';

// Log environment variables (only for debugging purposes, remove in production)
console.log("Environment Variables:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_ID:", process.env.TWITCH_CLIENT_ID ? "SET" : "NOT SET");
console.log("TWITCH_CLIENT_SECRET:", process.env.TWITCH_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("TWITCH_TOKEN_URL:", process.env.TWITCH_TOKEN_URL ? "SET" : "NOT SET");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getAccessToken = async (): Promise<string> => {
  const tokenUrl = process.env.TWITCH_TOKEN_URL;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Missing environment variables');
  }

  try {
    const response = await axios.post(tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });
    console.log("Access Token Response:", response.data);
    return response.data.access_token;
  } catch (error: any) {
    console.error("Error fetching access token:", error.message);
    throw new Error('Failed to fetch access token');
  }
};

const getChatCompletion = async (question: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an AI assistant specializing in video game. You can provide detailed analytics and insights into gameplay, helping players track their progress and identify areas for improvement.' },
        { role: 'user', content: question }
      ],
      max_tokens: 700, // Increased max_tokens to allow for longer responses
    });
    console.log("OpenAI Response:", completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error.message);
    throw new Error('Failed to get completion from OpenAI');
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { question } = req.body;

  try {
    console.log("Received question:", question);
    const openAIResponse = await getChatCompletion(question);

    res.status(200).json({ answer: openAIResponse });
  } catch (error: any) {
    console.error("Error in API route:", error.message);
    res.status(500).json({ error: error.message });
  }
}