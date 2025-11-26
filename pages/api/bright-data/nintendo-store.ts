import type { NextApiRequest, NextApiResponse } from 'next';
import { runCollector } from '../../../utils/brightData';

const DEFAULT_CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

const buildCollectorInput = (req: NextApiRequest): Record<string, unknown> => {
  const input: Record<string, unknown> = {};

  const { url, selectors, maxResults, includeDetails } = req.query;

  if (typeof url === 'string' && url.trim().length > 0) {
    input.url = url.trim();
  }

  if (typeof selectors === 'string' && selectors.trim().length > 0) {
    input.targetSelectors = selectors.trim();
  }

  if (typeof maxResults === 'string') {
    const parsed = Number(maxResults);
    if (!Number.isNaN(parsed)) {
      input.maxResults = parsed;
    }
  }

  if (typeof includeDetails === 'string') {
    input.includeDetails = includeDetails.toLowerCase() === 'true';
  }

  return input;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const collectorInput = buildCollectorInput(req);
    const cacheKey = `nintendoStore:${JSON.stringify(collectorInput)}`;

    const data = await runCollector({
      collectorKey: 'nintendoStoreUS',
      input: collectorInput,
      cacheKey,
      cacheTtlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    });

    return res.status(200).json({
      source: 'nintendoStoreUS',
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error('[Nintendo Store Collector] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch Nintendo Store data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

