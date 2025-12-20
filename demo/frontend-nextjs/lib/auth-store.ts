import NodeCache from "node-cache";
import { v4 as uuidv4 } from "uuid";

interface WalletUser {
  walletId: string;
  label: string;
  walletKey: string; // Store for re-authentication
  token: string;
  createdAt: string;
  state: string;
}

interface Session {
  walletId: string;
  label: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

// Wallet user store (maps walletId to user data)
const walletCache = new NodeCache({ stdTTL: 0 });

// Session store (24 hour TTL)
const sessionCache = new NodeCache({ stdTTL: 86400 });

export const authStore = {
  // Wallet operations
  saveWallet: (walletData: WalletUser): void => {
    walletCache.set(walletData.walletId, walletData);
    walletCache.set(`label:${walletData.label.toLowerCase()}`, walletData.walletId);
  },

  getWalletById: (walletId: string): WalletUser | null => {
    return walletCache.get<WalletUser>(walletId) || null;
  },

  getWalletByLabel: (label: string): WalletUser | null => {
    const walletId = walletCache.get<string>(`label:${label.toLowerCase()}`);
    if (!walletId) return null;
    return walletCache.get<WalletUser>(walletId) || null;
  },

  updateWalletToken: (walletId: string, token: string): void => {
    const wallet = walletCache.get<WalletUser>(walletId);
    if (wallet) {
      wallet.token = token;
      walletCache.set(walletId, wallet);
    }
  },

  // Session operations
  createSession: (wallet: WalletUser): { sessionId: string; session: Session } => {
    const sessionId = uuidv4();
    const session: Session = {
      walletId: wallet.walletId,
      label: wallet.label,
      token: wallet.token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    sessionCache.set(sessionId, session);
    return { sessionId, session };
  },

  getSession: (sessionId: string): Session | null => {
    return sessionCache.get<Session>(sessionId) || null;
  },

  deleteSession: (sessionId: string): void => {
    sessionCache.del(sessionId);
  },

  // Get all wallets (for admin)
  getAllWallets: (): Omit<WalletUser, "walletKey">[] => {
    const keys = walletCache.keys().filter((k) => !k.startsWith("label:"));
    return keys.map((k) => {
      const wallet = walletCache.get<WalletUser>(k)!;
      const { walletKey, ...safeWallet } = wallet;
      return safeWallet;
    });
  },
};
