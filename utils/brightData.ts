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
    defaultInput: {
      // Add default URL if needed for trigger endpoint
      url: 'https://www.nintendo.com/store/',
    },
  },
  nintendoNewsUS: {
    id: process.env.BRIGHT_COLLECTOR_NINTENDO_NEWS_US || '',
    cacheTtlSeconds: 60 * 30,
    defaultInput: {
      // Add default URL if needed for trigger endpoint
      url: 'https://www.nintendo.com/whatsnew/',
    },
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

  // Check if ID starts with 'c_' (trigger ID) or 'cltr_' (collector ID)
  const isTriggerId = definition.id.startsWith('c_') && !definition.id.startsWith('cltr_');

  if (isTriggerId) {
    // Use trigger endpoint for c_ IDs
    // Merge defaultInput with provided input
    const mergedInput = {
      ...(definition.defaultInput || {}),
      ...(input || {}),
    };

    const payload = {
      input: Array.isArray(mergedInput) ? mergedInput : [mergedInput],
    };

    try {
      const { data } = await brightApi.post<any>(
        `trigger?collector=${definition.id}&queue_next=1`,
        payload,
      );

      // Log the response to understand the structure
      console.log(`[BrightData Trigger] Response for ${collectorKey}:`, JSON.stringify(data, null, 2));

      // Check if data is returned directly in the response (common with queue_next=1)
      if (data.data && Array.isArray(data.data)) {
        // Data is already available, return it directly
        return {
          collection_id: data.collection_id || data.id || 'direct',
          status: 'done',
          start_time: new Date().toISOString(),
          data: data.data, // Include data in response
        } as CollectorStartResponse & { data?: any[] };
      }

      // Handle different possible response formats
      // The trigger endpoint might return collection_id, id, or job_id
      const collectionId = data.collection_id || data.id || data.job_id || data.collectionId;
      
      if (!collectionId) {
        throw new Error(
          `Bright Data trigger endpoint did not return a collection ID or data. Response: ${JSON.stringify(data)}`
        );
      }

      return {
        collection_id: collectionId,
        status: data.status || 'started',
        start_time: new Date().toISOString(),
        start_eta: data.start_eta, // Include start_eta for trigger endpoints
      };
    } catch (error: any) {
      // Provide more helpful error messages
      if (error.response?.status === 403) {
        throw new Error(
          `Bright Data collector ${collectorKey} (${definition.id}) returned 403 Forbidden. ` +
          `This usually means the collector is disabled or the ID is incorrect. ` +
          `Please check your Bright Data dashboard. Error: ${error.response?.data?.error || error.message}`
        );
      }
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || error.message;
        throw new Error(
          `Bright Data collector ${collectorKey} (${definition.id}) returned 400 Bad Request. ` +
          `The trigger endpoint may require specific input fields. Error: ${errorMsg}`
        );
      }
      throw error;
    }
  } else {
    // Use collector endpoint for cltr_ IDs
    const payload = {
      start: mode ?? definition.defaultMode ?? 'sync',
      name: name ?? `wingman_${collectorKey}`,
      inputs: {
        ...(definition.defaultInput || {}),
        ...(input || {}),
      },
    };

    const { data } = await brightApi.post<CollectorStartResponse>(`collectors/${definition.id}/start`, payload);
    return data;
  }
};

export const getCollectionStatus = async (collectionId: string): Promise<CollectionStatus> => {
  try {
    // For trigger-based collections (IDs starting with j_), try collections endpoint
    // If that fails, it might be a job ID that needs different handling
    const { data } = await brightApi.get<CollectionStatus>(`collections/${collectionId}`);
    return data;
  } catch (error: any) {
    // If collection doesn't exist (404), it might still be processing
    // For trigger endpoints, collections might not be immediately available
    if (error.response?.status === 404) {
      // For IDs starting with j_, these might be job IDs that need different handling
      // or the collection might not be created yet
      if (collectionId.startsWith('j_')) {
        console.warn(`[BrightData] Collection ${collectionId} not found (404). This may be a job ID from trigger endpoint. Retrying...`);
        // Return a status indicating it's still processing
        return {
          collection_id: collectionId,
          status: 'processing',
          message: 'Collection not yet available, may still be processing',
        } as CollectionStatus;
      }
      // For other IDs, also treat as processing
      console.warn(`[BrightData] Collection ${collectionId} not found (404). It may still be processing.`);
      return {
        collection_id: collectionId,
        status: 'processing',
        message: 'Collection not yet available, may still be processing',
      } as CollectionStatus;
    }
    throw error;
  }
};

export const fetchCollectionData = async <T = unknown>(collectionId: string): Promise<T[]> => {
  try {
    // Try the standard collections endpoint
    const { data } = await brightApi.get<T[]>(`collections/${collectionId}/data`, {
      params: { format: 'json' },
    });
    return data;
  } catch (error: any) {
    // For trigger collections (j_ prefix), try alternative endpoints
    if (collectionId.startsWith('j_')) {
      // Try without /data suffix (some APIs use different structure)
      try {
        const { data } = await brightApi.get<T[]>(`collections/${collectionId}`, {
          params: { format: 'json' },
        });
        // If the response is an object with a data property, extract it
        if (data && typeof data === 'object' && !Array.isArray(data) && (data as any).data) {
          return (data as any).data;
        }
        // If it's already an array, return it
        if (Array.isArray(data)) {
          return data;
        }
      } catch (altError: any) {
        // If alternative endpoint also fails, throw original error
        throw error;
      }
    }
    throw error;
  }
};

export const waitForCollection = async (
  collectionId: string,
  {
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<CollectionStatus> => {
  const start = Date.now();
  
  // For trigger-based collections (IDs starting with j_), wait a bit longer initially
  // as they may take time to be created and become accessible
  if (collectionId.startsWith('j_')) {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds initially
  }

  while (Date.now() - start < timeoutMs) {
    const status = await getCollectionStatus(collectionId);
    
    // Handle processing/started status (when collection isn't found yet or is starting)
    if (status.status === 'processing' || status.status === 'started' || status.status === 'building' || status.status === 'running') {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }
    
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
  
  // Check if trigger endpoint returned data directly
  if (startResponse.data && Array.isArray(startResponse.data)) {
    console.log(`[BrightData] Trigger endpoint returned data directly for ${collectorKey}`);
    const data = startResponse.data as T[];
    if (ttl > 0) {
      responseCache.set(computedCacheKey, data, ttl);
    }
    return data;
  }

  // For trigger-based collections (IDs starting with j_), they run asynchronously
  // We need to wait for the job to complete, then fetch the data
  const isTriggerCollection = startResponse.collection_id.startsWith('j_') || startResponse.collection_id === 'direct';
  
  if (isTriggerCollection) {
    console.log(`[BrightData] Trigger collection ${startResponse.collection_id} started. Waiting for completion...`);
    
    // If start_eta is provided, wait until that time has passed
    if (startResponse.start_eta) {
      const etaTime = new Date(startResponse.start_eta).getTime();
      const now = Date.now();
      if (etaTime > now) {
        const waitTime = etaTime - now + 1000; // Wait until ETA + 1 second buffer
        console.log(`[BrightData] Waiting ${Math.ceil(waitTime / 1000)}s until start_eta: ${startResponse.start_eta}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    
    // Poll for completion by checking status first, then fetching data
    // Jobs typically take 1-6 minutes, but can take longer
    const triggerPollInterval = 10_000; // 10 seconds
    const triggerTimeout = timeoutMs || 15 * 60 * 1000; // Default 15 minutes for trigger jobs (increased from 10)
    const startTime = Date.now();
    
    // Wait a bit after start_eta before starting to poll (jobs need time to actually start)
    const initialWait = 30_000; // Wait 30 seconds after start_eta before first poll
    console.log(`[BrightData] Waiting ${initialWait / 1000}s before starting to poll...`);
    await new Promise((resolve) => setTimeout(resolve, initialWait));
    
    while (Date.now() - startTime < triggerTimeout) {
      try {
        // First, try to check the status
        const status = await getCollectionStatus(startResponse.collection_id);
        
        // If status is done, try to fetch the data
        if (status.status === 'done') {
          try {
            const data = await fetchCollectionData<T>(startResponse.collection_id);
            console.log(`[BrightData] Trigger collection ${startResponse.collection_id} completed successfully`);
            if (ttl > 0) {
              responseCache.set(computedCacheKey, data, ttl);
            }
            return data;
          } catch (dataError: any) {
            // If status is done but data fetch fails, log and continue polling
            // Sometimes there's a delay between status=done and data availability
            console.warn(`[BrightData] Status is done but data not yet available: ${dataError.message}`);
          }
        }
        
        // If status is failed, throw error
        if (status.status === 'failed') {
          throw new Error(
            `Bright Data trigger collection ${startResponse.collection_id} failed${status.message ? `: ${status.message}` : ''}`
          );
        }
        
        // Status is still processing
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.floor((triggerTimeout - (Date.now() - startTime)) / 1000);
        console.log(`[BrightData] Trigger collection ${startResponse.collection_id} status: ${status.status} (${elapsed}s elapsed, ~${remaining}s remaining)`);
        
      } catch (error: any) {
        // If we get a 404 on status check, the job might still be processing
        if (error.response?.status === 404 || error.message?.includes('not found')) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.floor((triggerTimeout - (Date.now() - startTime)) / 1000);
          console.log(`[BrightData] Trigger collection ${startResponse.collection_id} still processing... (${elapsed}s elapsed, ~${remaining}s remaining)`);
          
          // Also try fetching data directly in case status endpoint doesn't work but data is available
          try {
            const data = await fetchCollectionData<T>(startResponse.collection_id);
            console.log(`[BrightData] Trigger collection ${startResponse.collection_id} data available (status endpoint returned 404)`);
            if (ttl > 0) {
              responseCache.set(computedCacheKey, data, ttl);
            }
            return data;
          } catch (dataError: any) {
            // Data not ready yet, continue polling
          }
        } else {
          // For other errors, throw immediately
          throw error;
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, triggerPollInterval));
    }
    
    throw new Error(
      `Bright Data trigger collection ${startResponse.collection_id} timed out after ${Math.floor(triggerTimeout / 1000)}s. ` +
      `The job may still be processing. Check your Bright Data dashboard for status.`
    );
  }

  // For regular collectors, poll for status
  if (!isTriggerCollection) {
    console.log(`[BrightData] Started collector ${collectorKey} with collection_id: ${startResponse.collection_id}`);

    const status = await waitForCollection(startResponse.collection_id, {
      pollIntervalMs,
      timeoutMs,
    });

    console.log(`[BrightData] Collection ${startResponse.collection_id} final status: ${status.status}`);

    if (status.status === 'failed') {
      throw new Error(
        `Bright Data collection ${startResponse.collection_id} failed${status.message ? `: ${status.message}` : ''}`,
      );
    }

    // Only try to fetch data if status is 'done'
    if (status.status !== 'done') {
      throw new Error(
        `Bright Data collection ${startResponse.collection_id} did not complete. Status: ${status.status}${status.message ? ` - ${status.message}` : ''}`
      );
    }

    const data = await fetchCollectionData<T>(startResponse.collection_id);
    if (ttl > 0) {
      responseCache.set(computedCacheKey, data, ttl);
    }
    return data;
  }

  // For trigger collections that aren't done, throw an error
  throw new Error(
    `Bright Data trigger collection ${startResponse.collection_id} is not ready. ` +
    `Status: ${startResponse.status}. Trigger endpoints may require a different approach.`
  );
};

export const clearBrightDataCache = () => responseCache.flushAll();