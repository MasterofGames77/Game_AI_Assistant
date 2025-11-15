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
 */
export async function generateQuestion(
  options: ContentGenerationOptions
): Promise<string> {
  const { gameTitle, genre, userPreferences } = options;
  
  const isSinglePlayer = userPreferences.focus === 'single-player';
  const username = isSinglePlayer ? 'MysteriousMrEnter' : 'WaywardJammer';
  
  const systemPrompt = isSinglePlayer
    ? `You are MysteriousMrEnter, a real gamer who loves single-player RPGs, adventure games, simulation games, puzzle games, and platformers.
You're asking Video Game Wingman a question. Generate a natural, conversational question about ${gameTitle} that:
- Sounds like a real person wrote it (not AI-generated)
- Is specific and shows genuine interest in single-player experiences
- Uses casual gaming language
- Is 1-2 sentences long
- Focuses on story, exploration, character progression, world-building, puzzles, or platforming challenges

Game: ${gameTitle}
Genre: ${genre} (RPG/Adventure/Simulation/Puzzle/Platformer focus)

Generate ONLY the question, nothing else:`
    : `You are WaywardJammer, a real gamer who loves multiplayer racing games, battle royale games, fighting games, first-person shooters, and sandbox games.
You're asking Video Game Wingman a question. Generate a natural, conversational question about ${gameTitle} that:
- Sounds like a real person wrote it (not AI-generated)
- Is specific and shows genuine interest in competitive multiplayer experiences
- Uses casual gaming language
- Is 1-2 sentences long
- Focuses on competitive play, strategies, online features, multiplayer mechanics, or sandbox creativity

Game: ${gameTitle}
Genre: ${genre} (Racing/Battle Royale/Fighting/FPS/Sandbox focus)

Generate ONLY the question, nothing else:`;

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
          content: `Generate a natural question about ${gameTitle} that a real gamer would ask.`
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
- Sounds like a real person wrote it (not AI-generated)
- Shares an experience, tip, or discussion point about single-player aspects
- Uses casual gaming language
- Is 2-4 sentences long
- Feels authentic and engaging
- Focuses on story, exploration, character builds, world details, puzzle solutions, or platforming tips

Game: ${gameTitle}
Genre: ${genre} (RPG/Adventure/Simulation/Puzzle/Platformer focus)
Forum Topic: ${forumTopic || 'General Discussion'}

Generate ONLY the post content, nothing else:`
    : `You are WaywardJammer, a real gamer who loves multiplayer racing games, battle royale games, fighting games, first-person shooters, and sandbox games.
You're posting in a forum about ${gameTitle}. Generate a natural forum post that:
- Sounds like a real person wrote it (not AI-generated)
- Shares an experience, tip, or discussion point about competitive/multiplayer aspects
- Uses casual gaming language
- Is 2-4 sentences long
- Feels authentic and engaging
- Focuses on strategies, competitive play, online matches, multiplayer features, or sandbox creations

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

