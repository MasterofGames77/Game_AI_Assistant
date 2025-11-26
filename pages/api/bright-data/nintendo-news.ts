import type { NextApiRequest, NextApiResponse } from 'next';
import { runCollector } from '../../../utils/brightData';

const DEFAULT_CACHE_TTL_SECONDS = 60 * 10; // 10 minutes

const buildCollectorInput = (req: NextApiRequest): Record<string, unknown> => {
  const input: Record<string, unknown> = {};
  const { url, category, limit } = req.query;

  if (typeof url === 'string' && url.trim().length > 0) {
    input.url = url.trim();
  }

  if (typeof category === 'string' && category.trim().length > 0) {
    input.categoryFilter = category.trim();
  }

  if (typeof limit === 'string') {
    const parsed = Number(limit);
    if (!Number.isNaN(parsed)) {
      input.maxResults = parsed;
    }
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
    const cacheKey = `nintendoNews:${JSON.stringify(collectorInput)}`;

    const data = await runCollector({
      collectorKey: 'nintendoNewsUS',
      input: collectorInput,
      cacheKey,
      cacheTtlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    });

    return res.status(200).json({
      source: 'nintendoNewsUS',
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error('[Nintendo News Collector] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch Nintendo News data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

