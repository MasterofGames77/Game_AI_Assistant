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
  previousPosts?: string[]; // Previous posts by this user for the same game to avoid repetition
}

export interface PostReplyOptions {
  gameTitle: string;
  genre: string;
  originalPost: string;
  originalPostAuthor: string;
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
- Ask about the BASE/VANILLA version of the game (the official release, not mods or fan-made versions)
- Be a direct question (start with: How, What, When, Where, Which, Who, etc.)
- Ask about SPECIFIC game facts, mechanics, items, characters, strategies, or information
- Be answerable with factual information (not opinions or feelings)
- Be 1 sentence long
- Focus on single-player game aspects like: items, characters, quests, mechanics, strategies, unlockables, secrets, release dates, platforms, differences between versions, how-to guides, etc.

CRITICAL ACCURACY REQUIREMENTS - READ CAREFULLY:
- ONLY ask about items, mechanics, characters, or features that ACTUALLY EXIST in ${gameTitle}
- DO NOT make up, combine, or modify item names (e.g., don't create "Super Shrink Stone" if the actual item is "Shrink Stomp")
- DO NOT invent new items by combining words from different items
- If you are unsure about the exact name of an item/mechanic/character, use GENERIC terms instead:
  * Instead of guessing item names, ask: "What items are required to brew [generic item type] in ${gameTitle}?"
  * Instead of guessing badge names, ask: "How do I obtain the [function] badge in ${gameTitle}?"
  * Instead of guessing character names, ask: "Which character has [specific trait] in ${gameTitle}?"
- FACTUAL ACCURACY is more important than sounding specific - if you're not certain about a name, use generic terms
- Double-check: Would a player who knows ${gameTitle} well recognize the item/mechanic you're asking about?

EXAMPLES of good questions:
- "How do I unlock the Great Fairy's Sword in ${gameTitle}?" (only if this item actually exists)
- "What are the best strategies for defeating the final boss in ${gameTitle}?"
- "When was ${gameTitle} released?"
- "Which character has the highest defense stat in ${gameTitle}?"
- "What is the difference between ${gameTitle} and its remake?"
- "How do I obtain badges that affect jumping in ${gameTitle}?" (generic if unsure of exact badge name)

BAD EXAMPLES (making up items):
- "What items are required to brew the Super Shrink Stone in ${gameTitle}?" (WRONG - this item doesn't exist)
- "How do I get the Mega Power Badge in ${gameTitle}?" (WRONG - if you're not certain this exists)

AVOID:
- Opinion-based questions ("What do you think...", "Have you noticed...")
- Conversational statements ("Dude, have you ever...")
- Casual filler words ("dude", "man", etc.) - keep it direct
- Questions that sound like forum posts
- Questions asking for personal experiences or feelings
- Making up or combining item/mechanic names

Game: ${gameTitle}
Genre: ${genre} (RPG/Adventure/Simulation/Puzzle/Platformer focus)

Generate ONLY the direct question, nothing else:`
    : `You are WaywardJammer, a real gamer asking Video Game Wingman a direct question about ${gameTitle}.

Generate a DIRECT, FACTUAL question that Video Game Wingman can answer with specific game information. The question should:
- MUST mention the game title "${gameTitle}" in the question
- Ask about the BASE/VANILLA version of the game (the official release, not mods or fan-made versions)
- Be a direct question (start with: How, What, When, Where, Which, Who, etc.)
- Ask about SPECIFIC game facts, mechanics, items, characters, strategies, or information
- Be answerable with factual information (not opinions or feelings)
- Be 1 sentence long
- Focus on multiplayer/competitive game aspects like: strategies, character stats, unlockables, best builds, release dates, platforms, differences between versions, how-to guides, competitive tips, etc.

CRITICAL ACCURACY REQUIREMENTS - READ CAREFULLY:
- ONLY ask about items, mechanics, characters, or features that ACTUALLY EXIST in ${gameTitle}
- DO NOT make up, combine, or modify item names (e.g., don't create "Super Power Boost" if the actual item is "Power Boost")
- DO NOT invent new items by combining words from different items
- If you are unsure about the exact name of an item/mechanic/character, use GENERIC terms instead:
  * Instead of guessing item names, ask: "What items provide [function] in ${gameTitle}?"
  * Instead of guessing ability names, ask: "Which character has [specific ability type] in ${gameTitle}?"
  * Instead of guessing weapon names, ask: "What weapons have the highest damage in ${gameTitle}?"
- FACTUAL ACCURACY is more important than sounding specific - if you're not certain about a name, use generic terms
- Double-check: Would a player who knows ${gameTitle} well recognize the item/mechanic you're asking about?

EXAMPLES of good questions:
- "What heavyweight kart has the highest speed in ${gameTitle}?" (only if this actually exists)
- "What are the best strategies for competitive play in ${gameTitle}?"
- "When was ${gameTitle} released?"
- "Which character is the best for ranked matches in ${gameTitle}?"
- "How do I unlock all characters in ${gameTitle}?"
- "What is the difference between ${gameTitle} and its sequel?"

BAD EXAMPLES (making up items):
- "How do I get the Mega Power Boost in ${gameTitle}?" (WRONG - if you're not certain this exists)
- "What items are required to craft the Super Weapon in ${gameTitle}?" (WRONG - if you're not certain this exists)

AVOID:
- Opinion-based questions ("What do you think...", "Have you noticed...")
- Conversational statements ("Dude, what's your go-to...")
- Casual filler words ("dude", "man", etc.) - keep it direct
- Questions that sound like forum posts
- Questions asking for personal experiences or feelings
- Making up or combining item/mechanic names

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
      temperature: 0.8, // Slightly higher temperature for more variation in questions
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
  const { gameTitle, genre, userPreferences, forumTopic, previousPosts = [] } = options;
  
  const isSinglePlayer = userPreferences.focus === 'single-player';
  // Determine username - check if this is for InterdimensionalHipster by checking if they have both types of genres
  const isInterdimensionalHipster = userPreferences.genres.length > 5 && 
    userPreferences.genres.some(g => ['RPG', 'Adventure', 'Simulation', 'Puzzle', 'Platformer'].includes(g)) &&
    userPreferences.genres.some(g => ['Racing', 'Battle Royale', 'Fighting', 'First-Person Shooter', 'Sandbox'].includes(g));
  
  const username = isInterdimensionalHipster ? 'InterdimensionalHipster' : (isSinglePlayer ? 'MysteriousMrEnter' : 'WaywardJammer');
  
  // Check if this is a single-player or multiplayer game based on genre
  const singlePlayerGenres = ['rpg', 'adventure', 'simulation', 'puzzle', 'platformer'];
  const isSinglePlayerGame = singlePlayerGenres.includes(genre.toLowerCase());
  
  // Build previous posts context if available
  let previousPostsContext = '';
  if (previousPosts.length > 0) {
    previousPostsContext = `\n\nCRITICAL: You have posted about ${gameTitle} before. Here are your previous posts to ensure your new post is UNIQUE and DIFFERENT:
${previousPosts.map((post, idx) => `${idx + 1}. "${post}"`).join('\n')}

CRITICAL - UNIQUENESS REQUIREMENTS (READ CAREFULLY):
- Your new post MUST be completely different from all previous posts above
- Do NOT repeat the same topics, experiences, themes, or tips from previous posts
- Write about a DIFFERENT aspect of ${gameTitle}:
  * If previous posts discussed exploration, write about combat/mechanics/story/characters instead
  * If previous posts discussed platforming, write about story/characters/items/quests instead
  * If previous posts discussed hidden items, write about main story/characters/combat instead
  * If previous posts discussed atmosphere, write about gameplay mechanics/tips/strategies instead
- Use COMPLETELY different phrasing and structure - avoid similar sentence patterns or word choices
- If you mentioned finishing the game before, don't mention it again
- If you gave tips before, give DIFFERENT tips or discuss a DIFFERENT aspect
- If you discussed a specific area/level before, discuss a DIFFERENT area/level
- Be creative and find a NEW, UNIQUE angle to discuss about ${gameTitle}
- Avoid repeating similar themes, topics, or experiences from previous posts`;
  }

  const systemPrompt = isInterdimensionalHipster
    ? `You are InterdimensionalHipster, a knowledgeable and helpful gamer who loves both single-player and multiplayer games.
You're posting in a forum about ${gameTitle}. Generate a natural forum post that:
- MUST mention the game title "${gameTitle}" in the post (this is required)
- Sounds like a real person wrote it (NOT AI-generated - avoid phrases like "As an AI", "I would like to", "Hello", "In conclusion", etc.)
- Shares an experience, tip, or discussion point about ${isSinglePlayerGame ? 'single-player' : 'multiplayer/competitive'} aspects
- Uses casual gaming language (contractions, casual words, personal experiences like "I just", "I found", etc.)
- Is 2-4 sentences long
- Feels authentic and engaging
- ${isSinglePlayerGame ? 'Focuses on story, exploration, character builds, world details, puzzle solutions, or platforming tips' : 'Focuses on strategies, competitive play, online matches, multiplayer features, or sandbox creations'}
- Write as if you're sharing with friends on a gaming forum
- Shows knowledge about the game - mention specific items, characters, locations, mechanics, or memorable moments

CRITICAL ACCURACY REQUIREMENTS:
- ${isSinglePlayerGame ? 'This is a SINGLE-PLAYER game - do NOT mention multiplayer, online matches, or competitive play features' : 'This is a MULTIPLAYER game - focus on online, competitive, or multiplayer features'}
- Spell character names, locations, and game terms CORRECTLY - double-check spelling before generating
- Only mention features that actually exist in ${gameTitle} - do NOT make up features or mechanics
- If you're unsure about a character name or feature, either omit it or use generic terms

IMPORTANT: 
- Do NOT use formal language, greetings, conclusion phrases, or AI-related phrases. Write naturally and casually like a real gamer.
- You MUST include the game title "${gameTitle}" in your post.
- You MUST reference something specific from ${gameTitle} (a character, item, location, mechanic, moment, etc.)
- FACTUAL ACCURACY is more important than sounding natural - if you're not certain about a fact, don't include it${previousPostsContext}

Game: ${gameTitle}
Genre: ${genre} (${isSinglePlayerGame ? 'Single-player' : 'Multiplayer'} focus)
Forum Topic: ${forumTopic || 'General Discussion'}

Generate ONLY the post content, nothing else:`
    : isSinglePlayer
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
- You MUST include the game title "${gameTitle}" in your post.${previousPostsContext}

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
- You MUST include the game title "${gameTitle}" in your post.${previousPostsContext}

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
      temperature: 1.0, // Maximum temperature for maximum variation and uniqueness
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
 * Generate a natural reply to an existing forum post
 * The reply should be relevant to the game, the forum topic, and respond to the specific post content
 */
export async function generatePostReply(
  options: PostReplyOptions
): Promise<string> {
  const { gameTitle, genre, originalPost, originalPostAuthor, forumTopic } = options;
  
  // Determine if this is a single-player or multiplayer game based on genre
  const singlePlayerGenres = ['rpg', 'adventure', 'simulation', 'puzzle', 'platformer'];
  const isSinglePlayerGame = singlePlayerGenres.includes(genre.toLowerCase());
  
  const systemPrompt = `You are InterdimensionalHipster, a knowledgeable and helpful gamer who loves both single-player and multiplayer games.
You're replying to a post in a forum about ${gameTitle}. The original post was written by ${originalPostAuthor}.

Generate a natural, helpful forum reply that:
- MUST mention the game title "${gameTitle}" in your reply (this is required)
- Directly responds to what ${originalPostAuthor} said in their post
- References specific game elements, mechanics, characters, or features from ${gameTitle} that relate to the discussion
- Provides helpful tips, information, or shares relevant experiences about ${gameTitle}
- Sounds like a real person wrote it (NOT AI-generated - avoid phrases like "As an AI", "I would like to", "Hello", "In conclusion", etc.)
- Uses casual gaming language (contractions, casual words, personal experiences like "I also", "I found", "Yeah", etc.)
- Is 2-4 sentences long
- Feels authentic and engaging, like you're genuinely responding to their post
- Shows knowledge about the game - mention specific items, characters, locations, mechanics, or memorable moments from ${gameTitle}
- Builds on what they said - agree, add to it, share a related experience, or provide helpful information

CRITICAL ACCURACY REQUIREMENTS:
- ${isSinglePlayerGame ? 'This is a SINGLE-PLAYER game - do NOT mention multiplayer, online matches, or competitive play features' : 'This is a MULTIPLAYER game - focus on online, competitive, or multiplayer features'}
- Spell character names, locations, and game terms CORRECTLY - double-check spelling before generating (e.g., "Taion" not "Tion" in Xenoblade Chronicles 3)
- Only mention features that actually exist in ${gameTitle} - do NOT make up features or mechanics
- If you're unsure about a character name or feature, either omit it or use generic terms
- FACTUAL ACCURACY is more important than sounding natural - if you're not certain about a fact, don't include it

IMPORTANT: 
- Do NOT use formal language, greetings, conclusion phrases, or AI-related phrases. Write naturally and casually like a real gamer.
- You MUST include the game title "${gameTitle}" in your reply.
- You MUST reference something specific from ${gameTitle} (a character, item, location, mechanic, moment, etc.)
- Make sure your reply is directly relevant to what ${originalPostAuthor} wrote - don't just talk about the game in general

Game: ${gameTitle}
Genre: ${genre} (${isSinglePlayerGame ? 'Single-player' : 'Multiplayer'} focus)
Forum Topic: ${forumTopic || 'General Discussion'}
Original Post Author: ${originalPostAuthor}

Original Post:
"${originalPost}"

Generate ONLY the reply content, nothing else:`;

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
          content: `Generate a natural, helpful reply to ${originalPostAuthor}'s post about ${gameTitle}. Make sure to reference specific game elements and respond directly to what they said.`
        }
      ],
      temperature: 0.8, // Higher temperature for more natural variation
      max_tokens: 300
    });

    const generatedReply = completion.choices[0]?.message?.content?.trim();
    
    if (!generatedReply) {
      throw new Error('Failed to generate post reply');
    }

    // Clean up the response (remove quotes if wrapped, remove "Reply:" prefix, etc.)
    let cleanedReply = generatedReply
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^(Reply:|Response:)\s*/i, '') // Remove "Reply:" prefix
      .trim();

    return cleanedReply;
  } catch (error) {
    console.error('Error generating post reply:', error);
    throw new Error(`Failed to generate post reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

