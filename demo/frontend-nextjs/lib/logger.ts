import pino from "pino";

// Simple logger for Next.js (no worker threads)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  browser: {
    asObject: true
  }
});
