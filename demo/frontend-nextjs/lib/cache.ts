import NodeCache from "node-cache";

// Cache for credential exchanges (5 minutes TTL)
export const exchangeCache = new NodeCache({ stdTTL: 300, checkperiod: 400 });

// Cache for presentations (5 minutes TTL)
export const presentationCache = new NodeCache({ stdTTL: 300, checkperiod: 400 });
