import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const setupOpenAIAssistant = async (prompt: string): Promise<string | null> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
    });

    const assistantResponse = response.choices[0].message?.content || null;
    return assistantResponse;
  } catch (error) {
    console.error("Failed to create assistant:", error);
    return null;
  }
};
