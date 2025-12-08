import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  getCommonGamers, 
  getExpertGamers, 
  findMatchingExpert,
  createCommonGamerPost,
  createExpertGamerReply,
  getUserPreferences
} from '../../../utils/automatedUsersService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType, username, commonGamerUsername, gameTitle, genre } = req.body;

    if (!testType) {
      return res.status(400).json({ 
        error: 'Missing required field: testType',
        validTypes: [
          'getCommonGamers',
          'getExpertGamers',
          'findMatchingExpert',
          'createCommonGamerPost',
          'createExpertGamerReply'
        ]
      });
    }

    switch (testType) {
      case 'getCommonGamers': {
        const commonGamers = await getCommonGamers();
        return res.status(200).json({
          success: true,
          testType: 'getCommonGamers',
          result: {
            count: commonGamers.length,
            gamers: commonGamers
          },
          message: `Found ${commonGamers.length} COMMON gamers`
        });
      }

      case 'getExpertGamers': {
        const expertGamers = await getExpertGamers();
        return res.status(200).json({
          success: true,
          testType: 'getExpertGamers',
          result: {
            count: expertGamers.length,
            gamers: expertGamers
          },
          message: `Found ${expertGamers.length} EXPERT gamers`
        });
      }

      case 'findMatchingExpert': {
        if (!commonGamerUsername) {
          return res.status(400).json({ 
            error: 'Missing required field: commonGamerUsername',
            optional: ['gameTitle', 'genre']
          });
        }

        const matchingExpert = await findMatchingExpert(
          commonGamerUsername,
          gameTitle,
          genre
        );

        return res.status(200).json({
          success: true,
          testType: 'findMatchingExpert',
          input: {
            commonGamerUsername,
            gameTitle: gameTitle || 'not provided',
            genre: genre || 'not provided'
          },
          result: {
            matchedExpert: matchingExpert,
            found: matchingExpert !== null
          },
          message: matchingExpert 
            ? `Found matching EXPERT: ${matchingExpert}`
            : 'No matching EXPERT found'
        });
      }

      case 'createCommonGamerPost': {
        if (!username) {
          return res.status(400).json({ 
            error: 'Missing required field: username'
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(404).json({ 
            error: `User ${username} not found or has no preferences`
          });
        }

        if (!preferences.gamerProfile || preferences.gamerProfile.type !== 'common') {
          return res.status(400).json({ 
            error: `User ${username} is not a COMMON gamer`,
            userType: preferences.gamerProfile?.type || 'unknown'
          });
        }

        const result = await createCommonGamerPost(username, preferences);

        return res.status(result.success ? 200 : 500).json({
          success: result.success,
          testType: 'createCommonGamerPost',
          input: {
            username
          },
          result: {
            success: result.success,
            message: result.message,
            error: result.error,
            details: result.details
          },
          message: result.success 
            ? 'COMMON gamer post created successfully'
            : `Failed to create post: ${result.error}`
        });
      }

      case 'createExpertGamerReply': {
        if (!username) {
          return res.status(400).json({ 
            error: 'Missing required field: username'
          });
        }

        const preferences = await getUserPreferences(username);
        if (!preferences) {
          return res.status(404).json({ 
            error: `User ${username} not found or has no preferences`
          });
        }

        if (!preferences.gamerProfile || preferences.gamerProfile.type !== 'expert') {
          return res.status(400).json({ 
            error: `User ${username} is not an EXPERT gamer`,
            userType: preferences.gamerProfile?.type || 'unknown'
          });
        }

        const result = await createExpertGamerReply(username, preferences);

        return res.status(result.success ? 200 : 500).json({
          success: result.success,
          testType: 'createExpertGamerReply',
          input: {
            username
          },
          result: {
            success: result.success,
            message: result.message,
            error: result.error,
            details: result.details
          },
          message: result.success 
            ? 'EXPERT gamer reply created successfully'
            : `Failed to create reply: ${result.error}`
        });
      }

      default:
        return res.status(400).json({ 
          error: 'Invalid testType',
          validTypes: [
            'getCommonGamers',
            'getExpertGamers',
            'findMatchingExpert',
            'createCommonGamerPost',
            'createExpertGamerReply'
          ]
        });
    }
  } catch (error) {
    console.error('Error testing service layer:', error);
    return res.status(500).json({
      error: 'Failed to test service layer',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}

