import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface UserPreferences {
  genres: string[];
  focus: 'single-player' | 'multiplayer';
}

export interface ContentGenerationOptions {
  gameTitle: string;
  genre: string;
  userPreferences: UserPreferences;
  forumTopic?: string;
}

/**
 * Generate a natural question for an automated user
 * Questions should be direct, factual, and answerable by Video Game Wingman
 */
export async function generateQuestion(
  options: ContentGenerationOptions
): Promise<string> {
  const { gameTitle, genre, userPreferences } = options;
  
  const isSinglePlayer = userPreferences.focus === 'single-player';
  const username = isSinglePlayer ? 'MysteriousMrEnter' : 'WaywardJammer';
  
  const systemPrompt = isSinglePlayer
    ? `You are MysteriousMrEnter, a real gamer asking Video Game Wingman a direct question about ${gameTitle}.

Generate a DIRECT, FACTUAL question that Video Game Wingman can answer with specific game information. The question should:
- MUST mention the game title "${gameTitle}" in the question
- Be a direct question (start with: How, What, When, Where, Which, Who, etc.)
- Ask about SPECIFIC game facts, mechanics, items, characters, strategies, or information
- Be answerable with factual information (not opinions or feelings)
- Be 1 sentence long
- Focus on single-player game aspects like: items, characters, quests, mechanics, strategies, unlockables, secrets, release dates, platforms, differences between versions, how-to guides, etc.

EXAMPLES of good questions:
- "How do I unlock the Great Fairy's Sword in ${gameTitle}?"
- "What are the best strategies for defeating the final boss in ${gameTitle}?"
- "When was ${gameTitle} released?"
- "Which character has the highest defense stat in ${gameTitle}?"
- "What is the difference between ${gameTitle} and its remake?"
- "How to catch Mewtwo in ${gameTitle}?"

AVOID:
- Opinion-based questions ("What do you think...", "Have you noticed...")
- Conversational statements ("Dude, have you ever...")
- Casual filler words ("dude", "man", etc.) - keep it direct
- Questions that sound like forum posts
- Questions asking for personal experiences or feelings

Game: ${gameTitle}
Genre: ${genre} (RPG/Adventure/Simulation/Puzzle/Platformer focus)

Generate ONLY the direct question, nothing else:`
    : `You are WaywardJammer, a real gamer asking Video Game Wingman a direct question about ${gameTitle}.

Generate a DIRECT, FACTUAL question that Video Game Wingman can answer with specific game information. The question should:
- MUST mention the game title "${gameTitle}" in the question
- Be a direct question (start with: How, What, When, Where, Which, Who, etc.)
- Ask about SPECIFIC game facts, mechanics, items, characters, strategies, or information
- Be answerable with factual information (not opinions or feelings)
- Be 1 sentence long
- Focus on multiplayer/competitive game aspects like: strategies, character stats, unlockables, best builds, release dates, platforms, differences between versions, how-to guides, competitive tips, etc.

EXAMPLES of good questions:
- "What heavyweight kart has the highest speed in ${gameTitle}?"
- "What are the best strategies for competitive play in ${gameTitle}?"
- "When was ${gameTitle} released?"
- "Which character is the best for ranked matches in ${gameTitle}?"
- "How do I unlock all characters in ${gameTitle}?"
- "What is the difference between ${gameTitle} and its sequel?"

AVOID:
- Opinion-based questions ("What do you think...", "Have you noticed...")
- Conversational statements ("Dude, what's your go-to...")
- Casual filler words ("dude", "man", etc.) - keep it direct
- Questions that sound like forum posts
- Questions asking for personal experiences or feelings

Game: ${gameTitle}
Genre: ${genre} (Racing/Battle Royale/Fighting/FPS/Sandbox focus)

Generate ONLY the direct question, nothing else:`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a direct, factual question about ${gameTitle} that Video Game Wingman can answer with specific game information.`
        }
      ],
      temperature: 0.8, // Higher temperature for more natural variation
      max_tokens: 150
    });

    const generatedQuestion = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedQuestion) {
      throw new Error('Failed to generate question');
    }

    // Clean up the response (remove quotes if wrapped, remove "Question:" prefix, etc.)
    let cleanedQuestion = generatedQuestion
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^(Question:|Q:)\s*/i, '') // Remove "Question:" prefix
      .trim();

    return cleanedQuestion;
  } catch (error) {
    console.error('Error generating question:', error);
    throw new Error(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a natural forum post for an automated user
 */
export async function generateForumPost(
  options: ContentGenerationOptions
): Promise<string> {
  const { gameTitle, genre, userPreferences, forumTopic } = options;
  
  const isSinglePlayer = userPreferences.focus === 'single-player';
  const username = isSinglePlayer ? 'MysteriousMrEnter' : 'WaywardJammer';
  
  const systemPrompt = isSinglePlayer
    ? `You are MysteriousMrEnter, a real gamer who loves single-player RPGs, adventure games, simulation games, puzzle games, and platformers.
You're posting in a forum about ${gameTitle}. Generate a natural forum post that:
- MUST mention the game title "${gameTitle}" in the post (this is required)
- Sounds like a real person wrote it (NOT AI-generated - avoid phrases like "As an AI", "I would like to", "Hello", "In conclusion", etc.)
- Shares an experience, tip, or discussion point about single-player aspects
- Uses casual gaming language (contractions, casual words, personal experiences like "I just", "I found", etc.)
- Is 2-4 sentences long
- Feels authentic and engaging
- Focuses on story, exploration, character builds, world details, puzzle solutions, or platforming tips
- Write as if you're sharing with friends on a gaming forum

IMPORTANT: 
- Do NOT use formal language, greetings, conclusion phrases, or AI-related phrases. Write naturally and casually like a real gamer.
- You MUST include the game title "${gameTitle}" in your post.

Game: ${gameTitle}
Genre: ${genre} (RPG/Adventure/Simulation/Puzzle/Platformer focus)
Forum Topic: ${forumTopic || 'General Discussion'}

Generate ONLY the post content, nothing else:`
    : `You are WaywardJammer, a real gamer who loves multiplayer racing games, battle royale games, fighting games, first-person shooters, and sandbox games.
You're posting in a forum about ${gameTitle}. Generate a natural forum post that:
- MUST mention the game title "${gameTitle}" in the post (this is required)
- Sounds like a real person wrote it (NOT AI-generated - avoid phrases like "As an AI", "I would like to", "Hello", "In conclusion", etc.)
- Shares an experience, tip, or discussion point about competitive/multiplayer aspects
- Uses casual gaming language (contractions, casual words, personal experiences like "I just", "I found", etc.)
- Is 2-4 sentences long
- Feels authentic and engaging
- Focuses on strategies, competitive play, online matches, multiplayer features, or sandbox creations
- Write as if you're sharing with friends on a gaming forum

IMPORTANT: 
- Do NOT use formal language, greetings, conclusion phrases, or AI-related phrases. Write naturally and casually like a real gamer.
- You MUST include the game title "${gameTitle}" in your post.

Game: ${gameTitle}
Genre: ${genre} (Racing/Battle Royale/Fighting/FPS/Sandbox focus)
Forum Topic: ${forumTopic || 'General Discussion'}

Generate ONLY the post content, nothing else:`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a natural forum post about ${gameTitle} that a real gamer would write.`
        }
      ],
      temperature: 0.8, // Higher temperature for more natural variation
      max_tokens: 250
    });

    const generatedPost = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedPost) {
      throw new Error('Failed to generate forum post');
    }

    // Clean up the response (remove quotes if wrapped, remove "Post:" prefix, etc.)
    let cleanedPost = generatedPost
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^(Post:|Message:)\s*/i, '') // Remove "Post:" prefix
      .trim();

    return cleanedPost;
  } catch (error) {
    console.error('Error generating forum post:', error);
    throw new Error(`Failed to generate forum post: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract game title from generated content (helper function)
 * This can be used to verify the game title matches what was requested
 */
export function extractGameTitleFromContent(content: string, expectedGameTitle: string): string | null {
  // Simple check: if the expected game title appears in the content, return it
  const lowerContent = content.toLowerCase();
  const lowerExpected = expectedGameTitle.toLowerCase();
  
  if (lowerContent.includes(lowerExpected)) {
    return expectedGameTitle;
  }
  
  // Try to find game title patterns (words in quotes, capitalized phrases, etc.)
  // For now, return the expected title as fallback
  return expectedGameTitle;
}

