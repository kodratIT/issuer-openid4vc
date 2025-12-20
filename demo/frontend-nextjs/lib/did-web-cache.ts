import NodeCache from "node-cache";

interface DidWebConfig {
  domain: string;
  did: string;
  didDocument: any;
  publicJwk: any;
  privateJwk: any;
  createdAt: string;
}

// Cache for did:web configuration (no TTL - persistent until restart)
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const CONFIG_KEY = "did-web-config";

export const didWebCache = {
  getConfig: (): DidWebConfig | null => {
    return cache.get<DidWebConfig>(CONFIG_KEY) || null;
  },
  
  setConfig: (config: DidWebConfig): void => {
    cache.set(CONFIG_KEY, config);
  },
  
  clearConfig: (): void => {
    cache.del(CONFIG_KEY);
  },
  
  getPrivateKey: (): any | null => {
    const config = cache.get<DidWebConfig>(CONFIG_KEY);
    return config?.privateJwk || null;
  },
  
  getPublicKey: (): any | null => {
    const config = cache.get<DidWebConfig>(CONFIG_KEY);
    return config?.publicJwk || null;
  },
  
  getDid: (): string | null => {
    const config = cache.get<DidWebConfig>(CONFIG_KEY);
    return config?.did || null;
  }
};
