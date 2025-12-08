import type { NextApiRequest, NextApiResponse } from 'next';
import {
  findMatchingExpert,
  findExpertsForGame,
  findExpertsForGenre,
  getMappedExpert,
  getHelpedCommonGamers,
  expertHasGame,
  expertHasGenre,
  getMatchingScore
} from '../../../utils/gamerMatching';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType, commonGamerUsername, expertUsername, gameTitle, genre } = req.body;

    if (!testType) {
      return res.status(400).json({
        error: 'Missing required field: testType',
        validTypes: [
          'findMatchingExpert',
          'findExpertsForGame',
          'findExpertsForGenre',
          'getMappedExpert',
          'getHelpedCommonGamers',
          'expertHasGame',
          'expertHasGenre',
          'getMatchingScore'
        ]
      });
    }

    switch (testType) {
      case 'findMatchingExpert': {
        if (!commonGamerUsername) {
          return res.status(400).json({
            error: 'Missing required field: commonGamerUsername',
            optional: ['gameTitle', 'genre']
          });
        }

        const result = await findMatchingExpert(commonGamerUsername, gameTitle, genre);

        return res.status(200).json({
          success: true,
          testType: 'findMatchingExpert',
          input: {
            commonGamerUsername,
            gameTitle: gameTitle || 'not provided',
            genre: genre || 'not provided'
          },
          result: result ? {
            expertUsername: result.expertUsername,
            matchType: result.matchType,
            confidence: result.confidence,
            reason: result.reason
          } : null,
          message: result
            ? `Found matching EXPERT: ${result.expertUsername} (${result.matchType}, ${result.confidence} confidence)`
            : 'No matching EXPERT found'
        });
      }

      case 'findExpertsForGame': {
        if (!gameTitle) {
          return res.status(400).json({
            error: 'Missing required field: gameTitle'
          });
        }

        const results = await findExpertsForGame(gameTitle);

        return res.status(200).json({
          success: true,
          testType: 'findExpertsForGame',
          input: { gameTitle },
          result: {
            count: results.length,
            experts: results.map(r => ({
              expertUsername: r.expertUsername,
              matchType: r.matchType,
              confidence: r.confidence,
              reason: r.reason
            }))
          },
          message: `Found ${results.length} EXPERT gamers for ${gameTitle}`
        });
      }

      case 'findExpertsForGenre': {
        if (!genre) {
          return res.status(400).json({
            error: 'Missing required field: genre'
          });
        }

        const results = await findExpertsForGenre(genre);

        return res.status(200).json({
          success: true,
          testType: 'findExpertsForGenre',
          input: { genre },
          result: {
            count: results.length,
            experts: results.map(r => ({
              expertUsername: r.expertUsername,
              matchType: r.matchType,
              confidence: r.confidence,
              reason: r.reason
            }))
          },
          message: `Found ${results.length} EXPERT gamers for ${genre} genre`
        });
      }

      case 'getMappedExpert': {
        if (!commonGamerUsername) {
          return res.status(400).json({
            error: 'Missing required field: commonGamerUsername'
          });
        }

        const expertUsername = await getMappedExpert(commonGamerUsername);

        return res.status(200).json({
          success: true,
          testType: 'getMappedExpert',
          input: { commonGamerUsername },
          result: {
            expertUsername,
            found: expertUsername !== null
          },
          message: expertUsername
            ? `Found mapped EXPERT: ${expertUsername}`
            : `No mapped EXPERT found for ${commonGamerUsername}`
        });
      }

      case 'getHelpedCommonGamers': {
        if (!expertUsername) {
          return res.status(400).json({
            error: 'Missing required field: expertUsername'
          });
        }

        const commonGamers = await getHelpedCommonGamers(expertUsername);

        return res.status(200).json({
          success: true,
          testType: 'getHelpedCommonGamers',
          input: { expertUsername },
          result: {
            count: commonGamers.length,
            commonGamers
          },
          message: `EXPERT ${expertUsername} helps ${commonGamers.length} COMMON gamer(s)`
        });
      }

      case 'expertHasGame': {
        if (!expertUsername || !gameTitle) {
          return res.status(400).json({
            error: 'Missing required fields: expertUsername, gameTitle'
          });
        }

        const hasGame = await expertHasGame(expertUsername, gameTitle);

        return res.status(200).json({
          success: true,
          testType: 'expertHasGame',
          input: { expertUsername, gameTitle },
          result: {
            hasGame,
            expertUsername,
            gameTitle
          },
          message: hasGame
            ? `${expertUsername} has ${gameTitle} in favorites`
            : `${expertUsername} does not have ${gameTitle} in favorites`
        });
      }

      case 'expertHasGenre': {
        if (!expertUsername || !genre) {
          return res.status(400).json({
            error: 'Missing required fields: expertUsername, genre'
          });
        }

        const hasGenre = await expertHasGenre(expertUsername, genre);

        return res.status(200).json({
          success: true,
          testType: 'expertHasGenre',
          input: { expertUsername, genre },
          result: {
            hasGenre,
            expertUsername,
            genre
          },
          message: hasGenre
            ? `${expertUsername} has ${genre} games in favorites`
            : `${expertUsername} does not have ${genre} games in favorites`
        });
      }

      case 'getMatchingScore': {
        if (!commonGamerUsername || !expertUsername) {
          return res.status(400).json({
            error: 'Missing required fields: commonGamerUsername, expertUsername'
          });
        }

        const score = await getMatchingScore(commonGamerUsername, expertUsername);

        return res.status(200).json({
          success: true,
          testType: 'getMatchingScore',
          input: { commonGamerUsername, expertUsername },
          result: {
            score,
            percentage: `${score}%`,
            matchQuality: score >= 70 ? 'excellent' : score >= 50 ? 'good' : score >= 30 ? 'fair' : 'poor'
          },
          message: `Matching score: ${score}/100 (${score >= 70 ? 'excellent' : score >= 50 ? 'good' : score >= 30 ? 'fair' : 'poor'} match)`
        });
      }

      default:
        return res.status(400).json({
          error: 'Invalid testType',
          validTypes: [
            'findMatchingExpert',
            'findExpertsForGame',
            'findExpertsForGenre',
            'getMappedExpert',
            'getHelpedCommonGamers',
            'expertHasGame',
            'expertHasGenre',
            'getMatchingScore'
          ]
        });
    }
  } catch (error) {
    console.error('Error testing gamer matching:', error);
    return res.status(500).json({
      error: 'Failed to test gamer matching',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}

