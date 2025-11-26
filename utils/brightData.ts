import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';
import { CollectorDefinition, StartCollectorOptions, CollectorStartResponse, CollectionStatus, RunCollectorOptions } from '../types';

const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY;
const BRIGHT_DATA_BASE_URL = 'https://api.brightdata.com/dca';
const DEFAULT_POLL_INTERVAL_MS = 4_000;
const DEFAULT_TIMEOUT_MS = 120_000;

if (!BRIGHT_DATA_API_KEY) {
  console.warn('[BrightData] BRIGHT_DATA_API_KEY is not set. Bright Data calls will fail until it is provided.');
}

// Central cache so repeated queries reuse recently fetched datasets
const responseCache = new NodeCache({
  stdTTL: 60 * 5, // 5 minutes
  checkperiod: 60,
});

export type BrightCollectorKey =
  | 'nintendoStoreUS'
  | 'nintendoNewsUS'
  | 'playStationStoreUS'
  | 'playStationBlog'
  | 'xboxStoreCA'
  | 'xboxWireUS';

/**
 * Configure collector IDs here. Pull them from env so we do not commit secrets.
 * Fill in the env vars with the actual IDs from Bright Data.
 */
const collectorRegistry: Record<BrightCollectorKey, CollectorDefinition> = {
  nintendoStoreUS: {
    id: process.env.BRIGHT_COLLECTOR_NINTENDO_STORE_US || '',
    cacheTtlSeconds: 60 * 15,
  },
  nintendoNewsUS: {
    id: process.env.BRIGHT_COLLECTOR_NINTENDO_NEWS_US || '',
    cacheTtlSeconds: 60 * 30,
  },
  playStationStoreUS: {
    id: process.env.BRIGHT_COLLECTOR_PLAYSTATION_STORE_US || '',
    cacheTtlSeconds: 60 * 15,
  },
  playStationBlog: {
    id: process.env.BRIGHT_COLLECTOR_PLAYSTATION_BLOG || '',
    cacheTtlSeconds: 60 * 30,
  },
  xboxStoreCA: {
    id: process.env.BRIGHT_COLLECTOR_XBOX_STORE_CA || '',
    cacheTtlSeconds: 60 * 15,
  },
  xboxWireUS: {
    id: process.env.BRIGHT_COLLECTOR_XBOX_WIRE_US || '',
    cacheTtlSeconds: 60 * 30,
  },
};

const brightApi: AxiosInstance = axios.create({
  baseURL: BRIGHT_DATA_BASE_URL,
  headers: {
    Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 60_000,
});

const assertCollectorConfigured = (collectorKey: BrightCollectorKey): CollectorDefinition => {
  const definition = collectorRegistry[collectorKey];
  if (!definition) {
    throw new Error(`Collector "${collectorKey}" is not registered.`);
  }
  if (!definition.id) {
    throw new Error(
      `Collector "${collectorKey}" is missing an ID. Set BRIGHT_COLLECTOR_* env vars for each collector.`,
    );
  }
  if (!BRIGHT_DATA_API_KEY) {
    throw new Error('BRIGHT_DATA_API_KEY is not configured. Unable to call Bright Data.');
  }
  return definition;
};

const buildCacheKey = (collectorKey: BrightCollectorKey, input?: Record<string, unknown>) => {
  return `${collectorKey}:${JSON.stringify(input ?? {})}`;
};

export const startCollector = async ({
  collectorKey,
  input,
  mode,
  name,
}: StartCollectorOptions): Promise<CollectorStartResponse> => {
  const definition = assertCollectorConfigured(collectorKey);

  const payload = {
    start: mode ?? definition.defaultMode ?? 'sync',
    name: name ?? `wingman_${collectorKey}`,
    inputs: {
      ...(definition.defaultInput || {}),
      ...(input || {}),
    },
  };

  const { data } = await brightApi.post<CollectorStartResponse>(`/collectors/${definition.id}/start`, payload);
  return data;
};

export const getCollectionStatus = async (collectionId: string): Promise<CollectionStatus> => {
  const { data } = await brightApi.get<CollectionStatus>(`/collections/${collectionId}`);
  return data;
};

export const fetchCollectionData = async <T = unknown>(collectionId: string): Promise<T[]> => {
  const { data } = await brightApi.get<T[]>(`/collections/${collectionId}/data`, {
    params: { format: 'json' },
  });
  return data;
};

export const waitForCollection = async (
  collectionId: string,
  {
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<CollectionStatus> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await getCollectionStatus(collectionId);
    if (status.status === 'done' || status.status === 'failed') {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Bright Data collection ${collectionId} timed out after ${timeoutMs}ms`);
};

/**
 * High-level helper: start, wait, and fetch data with optional caching.
 */
export const runCollector = async <T = unknown>({
  collectorKey,
  input,
  mode,
  name,
  cacheKey,
  cacheTtlSeconds,
  pollIntervalMs,
  timeoutMs,
}: RunCollectorOptions): Promise<T[]> => {
  const definition = assertCollectorConfigured(collectorKey);
  const computedCacheKey = cacheKey ?? buildCacheKey(collectorKey, input);
  const ttl = cacheTtlSeconds ?? definition.cacheTtlSeconds ?? 0;

  if (ttl > 0) {
    const cached = responseCache.get<T[]>(computedCacheKey);
    if (cached) {
      return cached;
    }
  }

  const startResponse = await startCollector({ collectorKey, input, mode, name });

  const status = await waitForCollection(startResponse.collection_id, {
    pollIntervalMs,
    timeoutMs,
  });

  if (status.status === 'failed') {
    throw new Error(
      `Bright Data collection ${startResponse.collection_id} failed${status.message ? `: ${status.message}` : ''}`,
    );
  }

  const data = await fetchCollectionData<T>(startResponse.collection_id);

  if (ttl > 0) {
    responseCache.set(computedCacheKey, data, ttl);
  }

  return data;
};

export const clearBrightDataCache = () => responseCache.flushAll();