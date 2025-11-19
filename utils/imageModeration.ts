import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import { SafeSearchResult, ModerationResult } from '../types';

const getGoogleCredentials = () => {
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (error) {
      console.error('Error parsing Google credentials:', error);
      return null;
    }
  }
  return null;
};

/**
 * Check if SafeSearch result indicates inappropriate content
 * Likelihood values: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
 * 
 * IMPORTANT: We check adult/violence content regardless of "spoof" status.
 * Spoof detection indicates manipulated/inauthentic images (deepfakes, etc.), but
 * fan art and drawings can still contain explicit content that must be moderated.
 * 
 * DISTINCTION: Suggestive vs Inappropriate Content
 * 
 * SUGGESTIVE (Allowed in gaming context):
 * - Character designs showing cleavage or revealing clothing
 * - Artistic depictions with suggestive poses but no explicit nudity
 * - Fan art that may be provocative but doesn't show explicit sexual acts
 * - Examples: Character in revealing outfit, suggestive pose, partial nudity (cleavage, thighs)
 * - Detection: adult=LIKELY + racy=VERY_LIKELY → ALLOWED
 * 
 * INAPPROPRIATE (Blocked):
 * - Explicit nudity (genitalia, full nudity)
 * - Pornographic content (sexual acts, explicit sexual imagery)
 * - Graphic violence (gore, extreme violence)
 * - Examples: Explicit sexual acts, full nudity, graphic violence
 * - Detection: adult=VERY_LIKELY → BLOCKED
 *              adult=LIKELY + racy=low → BLOCKED (to be safe)
 * 
 * CONTEXT CONSIDERATIONS:
 * - Fan art vs Official Art: Both subject to same rules (explicit content blocked regardless of source)
 * - Real People vs Drawings: Both subject to same rules (explicit content blocked)
 * - Intent vs Content: We moderate based on what the image shows, not the artist's intent
 *   - A drawing intended to be "artistic" but showing explicit content will be blocked
 *   - A drawing showing suggestive content (cleavage, revealing clothing) will be allowed
 * 
 * Moderation Strategy:
 * - Adult content: 
 *   * VERY_LIKELY = Definitely explicit (nudity, pornography) → BLOCK
 *   * LIKELY = Possibly explicit, but could be suggestive (cleavage, revealing clothing)
 *     - If racy is also VERY_LIKELY/LIKELY → Likely suggestive but not explicit → ALLOW
 *     - If racy is low → Might be explicit → BLOCK (to be safe)
 * - Violence: Block only on VERY_LIKELY (false positives common with game content)
 * - Medical: Block only on VERY_LIKELY (false positives from game UI elements)
 * - Racy: Used as context for adult content, not blocked alone
 */
const isInappropriateContent = (safeSearch: SafeSearchResult): { isInappropriate: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  let isInappropriate = false;

  // Check adult content (pornography, nudity)
  // VERY_LIKELY = Definitely explicit content → Always block
  if (safeSearch.adult === 'VERY_LIKELY') {
    isInappropriate = true;
    reasons.push('Sexually explicit material or nudity detected');
  }
  // LIKELY = Possibly explicit, but could be suggestive (cleavage, revealing clothing)
  // Use racy content as context to distinguish suggestive vs explicit
  else if (safeSearch.adult === 'LIKELY') {
    // If racy is VERY_LIKELY, it's likely suggestive but not explicit (cleavage, revealing clothing)
    // Allow suggestive content in gaming context (character designs, fan art)
    if (safeSearch.racy === 'VERY_LIKELY' || safeSearch.racy === 'LIKELY') {
      // Suggestive but not explicit - allow in gaming context
      // Don't add to reasons or block
    } else {
      // Adult is LIKELY but racy is low - might be explicit, block to be safe
      isInappropriate = true;
      reasons.push('Sexually explicit material or nudity detected');
    }
  }
  // POSSIBLE adult - ignore (too many false positives)

  // Check violence - LESS STRICT: Block only on VERY_LIKELY
  // POSSIBLE/LIKELY violence often false positives with game screenshots, fan art, etc.
  if (safeSearch.violence === 'VERY_LIKELY') {
    isInappropriate = true;
    reasons.push('Violent or gory content detected');
  }
  // LIKELY/POSSIBLE violence - ignore (too many false positives)

  // Check medical content - LESS STRICT: Block only on VERY_LIKELY
  // Medical content in games (health bars, UI elements, etc.) often triggers false positives
  if (safeSearch.medical === 'VERY_LIKELY') {
    isInappropriate = true;
    reasons.push('Medical content detected');
  }
  // LIKELY/POSSIBLE medical - ignore (too many false positives from game UI elements)

  // Note: We don't block on "spoof" alone - fan art and drawings are expected in gaming forums.
  // However, spoof status doesn't exempt images from adult/violence content checks.
  // Real people, deepfakes, and drawings are all subject to the same content moderation rules.

  return { isInappropriate, reasons };
};

/**
 * Determine confidence level based on SafeSearch results
 * Only considers categories we actually block on
 */
const getConfidenceLevel = (safeSearch: SafeSearchResult): 'high' | 'medium' | 'low' => {
  // Count only the categories we block on:
  // - Adult: VERY_LIKELY always blocks, LIKELY blocks only if racy is low
  // - Violence: VERY_LIKELY blocks
  // - Medical: VERY_LIKELY blocks
  const veryLikelyBlocking = [
    safeSearch.adult === 'VERY_LIKELY',
    safeSearch.violence === 'VERY_LIKELY',
    safeSearch.medical === 'VERY_LIKELY'
  ].filter(Boolean).length;

  // Adult LIKELY blocks only if racy is not high (suggestive content is allowed)
  const likelyBlocking = safeSearch.adult === 'LIKELY' && 
    safeSearch.racy !== 'VERY_LIKELY' && 
    safeSearch.racy !== 'LIKELY';

  if (veryLikelyBlocking > 0) return 'high';
  if (likelyBlocking) return 'medium';
  return 'low';
};

/**
 * Moderate an image using Google Cloud Vision API SafeSearch
 * @param imagePath - Full path to the image file
 * @returns ModerationResult with approval status and details
 */
export async function moderateImage(imagePath: string): Promise<ModerationResult> {
  try {
    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Get credentials
    const credentials = getGoogleCredentials();
    if (!credentials) {
      // If credentials are not configured, allow the image (don't block)
      // This prevents false positives when the API is not set up
      console.warn('Google Cloud Vision credentials not configured - allowing image without moderation');
      return {
        isApproved: true,
        isInappropriate: false,
        reasons: [],
        safeSearch: {
          adult: 'UNKNOWN',
          violence: 'UNKNOWN',
          racy: 'UNKNOWN',
          medical: 'UNKNOWN',
          spoof: 'UNKNOWN'
        },
        confidence: 'low'
      };
    }

    // Create Vision API client
    const client = new ImageAnnotatorClient({
      credentials: credentials,
    });

    // Perform SafeSearch detection
    const [safeSearchResult] = await client.safeSearchDetection(imagePath);
    const safeSearchAnnotation = safeSearchResult.safeSearchAnnotation;

    if (!safeSearchAnnotation) {
      // If SafeSearch fails, allow the image (don't block)
      // This prevents false positives when the API returns no results
      console.warn('SafeSearch annotation not available - allowing image without moderation');
      return {
        isApproved: true,
        isInappropriate: false,
        reasons: [],
        safeSearch: {
          adult: 'UNKNOWN',
          violence: 'UNKNOWN',
          racy: 'UNKNOWN',
          medical: 'UNKNOWN',
          spoof: 'UNKNOWN'
        },
        confidence: 'low'
      };
    }

    const safeSearch: SafeSearchResult = {
      adult: String(safeSearchAnnotation.adult || 'UNKNOWN'),
      violence: String(safeSearchAnnotation.violence || 'UNKNOWN'),
      racy: String(safeSearchAnnotation.racy || 'UNKNOWN'),
      medical: String(safeSearchAnnotation.medical || 'UNKNOWN'),
      spoof: String(safeSearchAnnotation.spoof || 'UNKNOWN')
    };

    // Check if content is inappropriate
    const { isInappropriate, reasons } = isInappropriateContent(safeSearch);
    const confidence = getConfidenceLevel(safeSearch);

    return {
      isApproved: !isInappropriate,
      isInappropriate,
      reasons,
      safeSearch,
      confidence
    };

  } catch (error: any) {
    console.error('Error moderating image:', error);
    
    // On error, allow the image (don't block)
    // This prevents false positives when the API fails
    // Log the error for debugging but don't block legitimate uploads
    console.warn(`Image moderation error - allowing image: ${error.message}`);
    return {
      isApproved: true,
      isInappropriate: false,
      reasons: [],
      safeSearch: {
        adult: 'UNKNOWN',
        violence: 'UNKNOWN',
        racy: 'UNKNOWN',
        medical: 'UNKNOWN',
        spoof: 'UNKNOWN'
      },
      confidence: 'low'
    };
  }
}

/**
 * Moderate multiple images
 * @param imagePaths - Array of full paths to image files
 * @returns Array of ModerationResult for each image
 */
export async function moderateImages(imagePaths: string[]): Promise<ModerationResult[]> {
  const results = await Promise.all(
    imagePaths.map(path => moderateImage(path))
  );
  return results;
}

