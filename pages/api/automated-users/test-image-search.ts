import type { NextApiRequest, NextApiResponse } from 'next';
import { extractKeywordsFromPost, extractKeywordsSimple } from '../../../utils/imageKeywordExtractor';
import { searchGameImage, getCachedImageSearch, cacheImageSearch } from '../../../utils/automatedImageSearch';
import { verifyImageRelevance, buildSearchQuery } from '../../../utils/imageRelevanceVerifier';
import { downloadAndStoreImage } from '../../../utils/automatedImageService';

/**
 * POST /api/automated-users/test-image-search
 * 
 * Test image search functionality (Phase 1 & 2)
 * 
 * Body: {
 *   postContent: string,
 *   gameTitle: string,
 *   forumCategory?: string,
 *   testPhase?: '1' | '2' | 'both'
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postContent, gameTitle, forumCategory, testPhase = 'both' } = req.body;

  if (!postContent || !gameTitle) {
    return res.status(400).json({
      error: 'Missing required fields: postContent, gameTitle',
      example: {
        postContent: "I just finished the Ashera boss fight in Xenoblade Chronicles 3. The character design was amazing!",
        gameTitle: "Xenoblade Chronicles 3",
        forumCategory: "Gameplay",
        testPhase: "both"
      }
    });
  }

  try {
    const results: any = {
      testPhase,
      gameTitle,
      forumCategory: forumCategory || 'N/A',
      postContent: postContent.substring(0, 200) + (postContent.length > 200 ? '...' : ''),
      phase1: null,
      phase2: null,
      finalResult: null
    };

    // Test Phase 1: Simple keyword extraction
    if (testPhase === '1' || testPhase === 'both') {
      console.log('[TEST] Phase 1: Simple keyword extraction');
      const simpleKeywords = extractKeywordsSimple(postContent, gameTitle, forumCategory);

      results.phase1 = {
        keywords: simpleKeywords,
        searchQuery: `${gameTitle} ${simpleKeywords.join(' ')} screenshot`,
        tested: true
      };

      // Try searching with Phase 1 keywords
      try {
        const searchResult = await searchGameImage({
          gameTitle,
          keywords: simpleKeywords,
          postContent,
          forumCategory,
          maxResults: 5
        });

        results.phase1.searchResult = searchResult ? {
          url: searchResult.url,
          title: searchResult.title,
          relevanceScore: searchResult.relevanceScore,
          found: true
        } : {
          found: false,
          message: 'No results found'
        };
      } catch (error: any) {
        results.phase1.searchResult = {
          found: false,
          error: error.message
        };
      }
    }

    // Test Phase 2: AI-powered keyword extraction
    if (testPhase === '2' || testPhase === 'both') {
      console.log('[TEST] Phase 2: AI-powered keyword extraction');
      try {
        const extractedKeywords = await extractKeywordsFromPost(postContent, gameTitle, forumCategory);

        const allKeywords = [
          ...extractedKeywords.characters,
          ...extractedKeywords.locations,
          ...extractedKeywords.items,
          ...extractedKeywords.topics
        ];

        const searchQuery = buildSearchQuery(gameTitle, extractedKeywords);

        results.phase2 = {
          extractedKeywords: {
            characters: extractedKeywords.characters,
            locations: extractedKeywords.locations,
            items: extractedKeywords.items,
            topics: extractedKeywords.topics
          },
          allKeywords,
          searchQuery,
          tested: true
        };

        // Check cache
        const cachedImage = getCachedImageSearch(gameTitle, allKeywords);
        if (cachedImage) {
          results.phase2.cacheHit = true;
          results.phase2.cachedImage = cachedImage;
        } else {
          results.phase2.cacheHit = false;
        }

        // Try searching with Phase 2 keywords
        try {
          const searchResult = await searchGameImage({
            gameTitle,
            keywords: extractedKeywords,
            postContent,
            forumCategory,
            maxResults: 5
          });

          if (searchResult) {
            // Verify relevance
            const verification = verifyImageRelevance(
              searchResult.url,
              searchResult.title,
              gameTitle,
              extractedKeywords
            );

            results.phase2.searchResult = {
              url: searchResult.url,
              title: searchResult.title,
              relevanceScore: searchResult.relevanceScore,
              verification: {
                isRelevant: verification.isRelevant,
                confidence: verification.confidence,
                reason: verification.reason
              },
              found: true
            };

            // Test download (optional - comment out if you don't want to download during testing)
            if (verification.isRelevant && verification.confidence >= 40) {
              try {
                const downloadedPath = await downloadAndStoreImage(
                  searchResult.url,
                  gameTitle,
                  allKeywords,
                  false // Don't upload to cloud during testing
                );

                if (downloadedPath) {
                  results.phase2.downloaded = true;
                  results.phase2.downloadedPath = downloadedPath;

                  // Cache it
                  cacheImageSearch(gameTitle, allKeywords, downloadedPath);
                  results.phase2.cached = true;
                }
              } catch (downloadError: any) {
                results.phase2.downloadError = downloadError.message;
              }
            }
          } else {
            results.phase2.searchResult = {
              found: false,
              message: 'No results found from Google Custom Search. Unsplash fallback disabled (unreliable for game content).'
            };
          }
        } catch (searchError: any) {
          results.phase2.searchResult = {
            found: false,
            error: searchError.message
          };
        }
      } catch (extractionError: any) {
        results.phase2 = {
          tested: true,
          error: extractionError.message,
          fallbackToPhase1: true
        };
      }
    }

    // Summary
    results.summary = {
      phase1Working: results.phase1?.searchResult?.found || false,
      phase2Working: results.phase2?.searchResult?.found || false,
      imageDownloaded: results.phase2?.downloaded || false,
      cacheHit: results.phase2?.cacheHit || false
    };

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('[TEST] Error testing image search:', error);
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message
    });
  }
}
