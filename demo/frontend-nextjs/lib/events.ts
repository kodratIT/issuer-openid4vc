import { EventEmitter } from 'node:events';

// Global EventEmitter singleton for SSE
export const events = new EventEmitter();
