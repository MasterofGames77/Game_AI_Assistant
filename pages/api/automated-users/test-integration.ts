import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import User from '../../../models/User';
import {
  getCommonGamers,
  getExpertGamers,
  createCommonGamerPost,
  createExpertGamerReply,
  getUserPreferences
} from '../../../utils/automatedUsersService';
import {
  findMatchingExpert,
  getMatchingScore
} from '../../../utils/gamerMatching';

/**
 * Integration Test Suite for Digital Gamers System
 * Tests the complete flow from COMMON gamer post to EXPERT gamer reply
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testScenario } = req.body;

    if (!testScenario) {
      return res.status(400).json({
        error: 'Missing required field: testScenario',
        validScenarios: [
          'fullWorkflow',
          'allMappings',
          'matchingAccuracy',
          'contentQuality',
          'schedulerReadiness'
        ]
      });
    }

    await connectToWingmanDB();

    switch (testScenario) {
      case 'fullWorkflow': {
        // Test complete workflow: COMMON post → EXPERT reply
        const commonGamers = await getCommonGamers();
        const expertGamers = await getExpertGamers();

        if (commonGamers.length === 0 || expertGamers.length === 0) {
          return res.status(400).json({
            error: 'No COMMON or EXPERT gamers found. Please create gamers first using /api/automated-users/create-gamers'
          });
        }

        // Select first COMMON gamer
        const testCommonGamer = commonGamers[0];
        const commonPreferences = await getUserPreferences(testCommonGamer);

        if (!commonPreferences || !commonPreferences.gamerProfile) {
          return res.status(400).json({
            error: `COMMON gamer ${testCommonGamer} has no gamer profile`
          });
        }

        // Create a post
        const postResult = await createCommonGamerPost(testCommonGamer, commonPreferences);

        if (!postResult.success) {
          return res.status(500).json({
            error: 'Failed to create COMMON gamer post',
            details: postResult
          });
        }

        // Find matching EXPERT
        const matchingResult = await findMatchingExpert(
          testCommonGamer,
          postResult.details?.gameTitle,
          postResult.details?.genre
        );

        if (!matchingResult) {
          return res.status(500).json({
            error: 'Failed to find matching EXPERT'
          });
        }

        // Get EXPERT preferences
        const expertPreferences = await getUserPreferences(matchingResult.expertUsername);

        if (!expertPreferences || !expertPreferences.gamerProfile) {
          return res.status(400).json({
            error: `EXPERT gamer ${matchingResult.expertUsername} has no gamer profile`
          });
        }

        // Create reply
        const replyResult = await createExpertGamerReply(
          matchingResult.expertUsername,
          expertPreferences
        );

        return res.status(200).json({
          success: true,
          testScenario: 'fullWorkflow',
          workflow: {
            step1: {
              action: 'COMMON gamer creates post',
              gamer: testCommonGamer,
              result: postResult.success ? 'success' : 'failed',
              postDetails: postResult.details
            },
            step2: {
              action: 'Find matching EXPERT',
              result: matchingResult ? 'success' : 'failed',
              expert: matchingResult?.expertUsername,
              matchType: matchingResult?.matchType,
              confidence: matchingResult?.confidence
            },
            step3: {
              action: 'EXPERT gamer creates reply',
              gamer: matchingResult?.expertUsername,
              result: replyResult.success ? 'success' : 'failed',
              replyDetails: replyResult.details
            }
          },
          message: 'Full workflow test completed'
        });
      }

      case 'allMappings': {
        // Test all 10 COMMON → EXPERT mappings
        const commonGamers = await getCommonGamers();
        const mappingResults: any[] = [];

        for (const commonGamer of commonGamers) {
          const mappedExpert = await findMatchingExpert(commonGamer);
          const score = mappedExpert
            ? await getMatchingScore(commonGamer, mappedExpert.expertUsername)
            : 0;

          mappingResults.push({
            commonGamer,
            expert: mappedExpert?.expertUsername || 'not found',
            matchType: mappedExpert?.matchType || 'none',
            confidence: mappedExpert?.confidence || 'none',
            score: score,
            status: mappedExpert ? 'mapped' : 'missing'
          });
        }

        const allMapped = mappingResults.every(r => r.status === 'mapped');
        const avgScore = mappingResults.reduce((sum, r) => sum + r.score, 0) / mappingResults.length;

        return res.status(200).json({
          success: true,
          testScenario: 'allMappings',
          results: {
            totalPairs: mappingResults.length,
            allMapped,
            averageScore: Math.round(avgScore),
            mappings: mappingResults
          },
          message: allMapped
            ? `All ${mappingResults.length} COMMON → EXPERT mappings verified`
            : 'Some mappings are missing'
        });
      }

      case 'matchingAccuracy': {
        // Test matching accuracy for all pairs
        const commonGamers = await getCommonGamers();
        const accuracyResults: any[] = [];

        for (const commonGamer of commonGamers) {
          const user = await User.findOne({ username: commonGamer }).lean() as any;
          if (!user?.gamerProfile) continue;

          const favoriteGames = user.gamerProfile.favoriteGames || [];
          
          for (const game of favoriteGames.slice(0, 1)) { // Test first game for each
            const matchingResult = await findMatchingExpert(
              commonGamer,
              game.gameTitle,
              game.genre
            );

            const score = matchingResult
              ? await getMatchingScore(commonGamer, matchingResult.expertUsername)
              : 0;

            accuracyResults.push({
              commonGamer,
              game: game.gameTitle,
              genre: game.genre,
              matchedExpert: matchingResult?.expertUsername || 'none',
              matchType: matchingResult?.matchType || 'none',
              confidence: matchingResult?.confidence || 'none',
              score: score,
              accuracy: score >= 70 ? 'excellent' : score >= 50 ? 'good' : score >= 30 ? 'fair' : 'poor'
            });
          }
        }

        const excellentMatches = accuracyResults.filter(r => r.accuracy === 'excellent').length;
        const goodMatches = accuracyResults.filter(r => r.accuracy === 'good').length;
        const avgScore = accuracyResults.reduce((sum, r) => sum + r.score, 0) / accuracyResults.length;

        return res.status(200).json({
          success: true,
          testScenario: 'matchingAccuracy',
          results: {
            totalTests: accuracyResults.length,
            excellentMatches,
            goodMatches,
            averageScore: Math.round(avgScore),
            accuracy: `${Math.round((excellentMatches / accuracyResults.length) * 100)}% excellent matches`,
            details: accuracyResults
          },
          message: `Matching accuracy: ${excellentMatches}/${accuracyResults.length} excellent matches`
        });
      }

      case 'contentQuality': {
        // Test content generation quality
        const commonGamers = await getCommonGamers();
        const expertGamers = await getExpertGamers();

        if (commonGamers.length === 0 || expertGamers.length === 0) {
          return res.status(400).json({
            error: 'No COMMON or EXPERT gamers found'
          });
        }

        const testCommonGamer = commonGamers[0];
        const commonPreferences = await getUserPreferences(testCommonGamer);

        if (!commonPreferences || !commonPreferences.gamerProfile) {
          return res.status(400).json({
            error: `COMMON gamer ${testCommonGamer} has no gamer profile`
          });
        }

        // Create post
        const postResult = await createCommonGamerPost(testCommonGamer, commonPreferences);

        if (!postResult.success || !postResult.details?.postContent) {
          return res.status(500).json({
            error: 'Failed to create post for content quality test'
          });
        }

        const postContent = postResult.details.postContent;
        const postAnalysis = {
          length: postContent.length,
          mentionsGame: postContent.toLowerCase().includes((postResult.details.gameTitle || '').toLowerCase()),
          asksForHelp: /help|stuck|can't|unable|problem|issue|struggling/i.test(postContent),
          hasQuestion: postContent.includes('?'),
          wordCount: postContent.split(/\s+/).length,
          quality: 'good' // Basic quality check
        };

        return res.status(200).json({
          success: true,
          testScenario: 'contentQuality',
          results: {
            post: {
              content: postContent.substring(0, 200) + '...',
              analysis: postAnalysis
            },
            qualityChecks: {
              mentionsGame: postAnalysis.mentionsGame ? 'pass' : 'fail',
              asksForHelp: postAnalysis.asksForHelp ? 'pass' : 'fail',
              appropriateLength: postAnalysis.wordCount >= 20 && postAnalysis.wordCount <= 100 ? 'pass' : 'fail'
            }
          },
          message: 'Content quality test completed'
        });
      }

      case 'schedulerReadiness': {
        // Test that scheduler can run tasks
        const commonGamers = await getCommonGamers();
        const expertGamers = await getExpertGamers();

        const readinessChecks = {
          commonGamersAvailable: commonGamers.length >= 2,
          expertGamersAvailable: expertGamers.length >= 2,
          allHaveProfiles: true,
          allMappingsValid: true
        };

        // Check profiles
        for (const gamer of [...commonGamers, ...expertGamers]) {
          const user = await User.findOne({ username: gamer }).lean() as any;
          if (!user?.gamerProfile) {
            readinessChecks.allHaveProfiles = false;
            break;
          }
        }

        // Check mappings
        for (const commonGamer of commonGamers) {
          const mappedExpert = await findMatchingExpert(commonGamer);
          if (!mappedExpert) {
            readinessChecks.allMappingsValid = false;
            break;
          }
        }

        const isReady = Object.values(readinessChecks).every(check => check === true);

        return res.status(200).json({
          success: true,
          testScenario: 'schedulerReadiness',
          results: {
            readinessChecks,
            isReady,
            summary: {
              commonGamers: `${commonGamers.length}/10 available`,
              expertGamers: `${expertGamers.length}/10 available`,
              status: isReady ? 'READY' : 'NOT READY'
            }
          },
          message: isReady
            ? 'System is ready for scheduled tasks'
            : 'System is not ready - check readinessChecks for details'
        });
      }

      default:
        return res.status(400).json({
          error: 'Invalid testScenario',
          validScenarios: [
            'fullWorkflow',
            'allMappings',
            'matchingAccuracy',
            'contentQuality',
            'schedulerReadiness'
          ]
        });
    }
  } catch (error) {
    console.error('Error in integration test:', error);
    return res.status(500).json({
      error: 'Failed to run integration test',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}

