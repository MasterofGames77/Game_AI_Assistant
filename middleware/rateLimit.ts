import type { NextApiRequest, NextApiResponse } from 'next';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

// Next.js compatible rate limiter wrapper
export const applyRateLimit = async (
  req: NextApiRequest,
  res: NextApiResponse,
  limiter: RateLimitRequestHandler
): Promise<void> => {
  return new Promise((resolve, reject) => {
    limiter(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      // If rate limit exceeded, res.statusCode will be 429
      if (res.statusCode === 429) {
        return reject(new Error('Rate limit exceeded'));
      }
      return resolve();
    });
  });
};

// General purpose rate limiter
const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  const limiter = rateLimit({
    windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options?.max || 100, // 100 requests default
    message: { error: options?.message || 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return limiter;
};

export const rateLimiter = createRateLimiter(); 