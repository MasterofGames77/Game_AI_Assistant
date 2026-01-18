import { DailyChallenge } from "../types";

/**
 * Static list of daily challenges for the Daily Challenge system
 * Challenges cover:
 * - Genre-based (using achievement names from detectedGenre)
 * - Interaction-based (using interactionType values)
 * - Category-based (using questionCategory values)
 * - Count-based (number of questions asked today)
 */
export const DAILY_CHALLENGES: DailyChallenge[] = [
  // Genre-based challenges
  {
    id: "rpg_quest",
    title: "RPG Quest",
    description: "Ask a question about an RPG game",
    criteria: { type: "genre", value: "rpgEnthusiast" },
    icon: "⚔️",
  },
  {
    id: "action_fan",
    title: "Action Fan",
    description: "Ask about an action game",
    criteria: { type: "genre", value: "actionAficionado" },
    icon: "🎮",
  },
  {
    id: "adventure_seeker",
    title: "Adventure Seeker",
    description: "Explore an adventure game",
    criteria: { type: "genre", value: "adventureAddict" },
    icon: "🗺️",
  },
  {
    id: "puzzle_solver",
    title: "Puzzle Solver",
    description: "Get help with a puzzle game",
    criteria: { type: "genre", value: "puzzlePro" },
    icon: "🧩",
  },
  {
    id: "strategy_game",
    title: "Strategic Thinker",
    description: "Get help with a strategy game",
    criteria: { type: "genre", value: "strategySpecialist" },
    icon: "♟️",
  },
  {
    id: "shooter_specialist",
    title: "Shooter Specialist",
    description: "Ask about a shooter game",
    criteria: { type: "genre", value: "shooterSpecialist" },
    icon: "🔫",
  },
  {
    id: "sports_champion",
    title: "Sports Champion",
    description: "Ask about a sports game",
    criteria: { type: "genre", value: "sportsChampion" },
    icon: "🏆",
  },
  {
    id: "platformer_pro",
    title: "Platformer Pro",
    description: "Ask about a platformer game",
    criteria: { type: "genre", value: "platformerPro" },
    icon: "🦘",
  },
  {
    id: "horror_hero",
    title: "Horror Hero",
    description: "Ask about a horror game",
    criteria: { type: "genre", value: "horrorHero" },
    icon: "👻",
  },
  {
    id: "fighting_fanatic",
    title: "Fighting Fanatic",
    description: "Ask about a fighting game",
    criteria: { type: "genre", value: "fightingFanatic" },
    icon: "🥊",
  },
  {
    id: "rogue_renegade",
    title: "Rogue Renegade",
    description: "Ask about a rogue-like game",
    criteria: { type: "genre", value: "rogueRenegade" },
    icon: "🔥",
  },

  // Interaction-based challenges
  {
    id: "strategy_master",
    title: "Strategy Master",
    description: "Get a strategy tip for any game",
    criteria: { type: "interaction", value: "strategy_tip" },
    icon: "🧠",
  },
  {
    id: "detailed_guide",
    title: "Deep Dive",
    description: "Request a detailed guide",
    criteria: { type: "interaction", value: "detailed_guide" },
    icon: "📚",
  },
  {
    id: "quick_fact",
    title: "Quick Fact Finder",
    description: "Ask a quick factual question",
    criteria: { type: "interaction", value: "quick_fact" },
    icon: "⚡",
  },
  {
    id: "comparison",
    title: "Comparison Expert",
    description: "Compare game options",
    criteria: { type: "interaction", value: "comparison" },
    icon: "⚖️",
  },
  {
    id: "item_lookup",
    title: "Item Hunter",
    description: "Look up an item or equipment",
    criteria: { type: "interaction", value: "item_lookup" },
    icon: "🎒",
  },
  {
    id: "fast_tip",
    title: "Quick Learner",
    description: "Get a fast tip",
    criteria: { type: "interaction", value: "fast_tip" },
    icon: "💡",
  },

  // Category-based challenges
  {
    id: "boss_fight",
    title: "Boss Buster",
    description: "Ask about a boss fight",
    criteria: { type: "category", value: "boss_fight" },
    icon: "👹",
  },
  {
    id: "level_walkthrough",
    title: "Level Explorer",
    description: "Get help with a level or walkthrough",
    criteria: { type: "category", value: "level_walkthrough" },
    icon: "🗝️",
  },
  {
    id: "strategy_category",
    title: "Tactical Thinker",
    description: "Ask a strategy question",
    criteria: { type: "category", value: "strategy" },
    icon: "🎯",
  },
  {
    id: "character_build",
    title: "Character Builder",
    description: "Ask about a character or class",
    criteria: { type: "category", value: "character" },
    icon: "🛡️",
  },
  {
    id: "achievement_hunter",
    title: "Achievement Hunter",
    description: "Ask about achievements or completion",
    criteria: { type: "category", value: "achievement" },
    icon: "🏅",
  },
  {
    id: "general_gameplay",
    title: "Game Explorer",
    description: "Ask a general gameplay question",
    criteria: { type: "category", value: "general_gameplay" },
    icon: "🎲",
  },

  // Count-based challenges
  {
    id: "three_questions",
    title: "Daily Explorer",
    description: "Ask 3 questions today",
    criteria: { type: "count", value: 3 },
    icon: "🌟",
  },
  {
    id: "five_questions",
    title: "Active Gamer",
    description: "Ask 5 questions today",
    criteria: { type: "count", value: 5 },
    icon: "⭐",
  },
  {
    id: "ten_questions",
    title: "Power User",
    description: "Ask 10 questions today",
    criteria: { type: "count", value: 10 },
    icon: "💫",
  },
];

