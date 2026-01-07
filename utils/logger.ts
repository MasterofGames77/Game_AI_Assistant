import winston from 'winston';

// Custom log format
const logFormat = winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create the logger factory function
export const createLogger = (service: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
      logFormat
    ),
    defaultMeta: { service },
    transports: [
      // Console transport for development
      new winston.transports.Console(),
      
      // File transport for production
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
};

// Export default logger for general use
export const logger = createLogger('app');

// Error handling for uncaught exceptions
// Note: These handlers are set up in server.ts with better error handling
// Only set up here if not in a Next.js/server context
// The server.ts handlers provide more detailed logging and graceful shutdown
if (process.env.NODE_ENV === 'production' && !process.env.SERVER_INITIALIZED) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    // Better error serialization - don't try to serialize promises
    const errorInfo: any = {};
    if (reason instanceof Error) {
      errorInfo.error = reason.message;
      errorInfo.stack = reason.stack;
      errorInfo.name = reason.name;
    } else {
      errorInfo.reason = String(reason);
    }
    logger.error('Unhandled Rejection:', errorInfo);
  });
} 