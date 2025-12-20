import { logger } from "./logger";
import { API_BASE_URL } from "./config";

// Admin API untuk multitenancy wallet
const ADMIN_API_URL = API_BASE_URL;

let cachedToken: { token: string } | null = null;
let tokenInitPromise: Promise<{ token: string }> | null = null;

// Initialize token saat server startup
async function initializeToken() {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    logger.info(`Initializing multitenancy wallet token from ${ADMIN_API_URL}...`);
    const response = await fetch(`${ADMIN_API_URL}/multitenancy/wallet`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: "Alice",
        wallet_type: "askar",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize token: ${response.statusText}`);
    }

    cachedToken = await response.json();
    console.log("_______TOKEN________\n\n\n");
    console.log(cachedToken);
    logger.info("Token initialized successfully");
    
    return cachedToken!;
  } catch (error) {
    logger.error({ error }, "Failed to initialize token");
    throw error;
  }
}

// Export fungsi untuk mendapatkan token (akan auto-initialize jika belum ada)
export async function getToken() {
  if (cachedToken) {
    return cachedToken;
  }

  // Jika sedang dalam proses inisialisasi, tunggu sampai selesai
  if (tokenInitPromise) {
    return tokenInitPromise;
  }

  // Mulai inisialisasi token
  tokenInitPromise = initializeToken();
  const token = await tokenInitPromise;
  tokenInitPromise = null;
  
  return token;
}

// Auto-initialize token saat module di-load (seperti di original frontend)
// Hanya jalankan di runtime, bukan saat build time
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  // Hanya jalankan di server-side development
  getToken().catch((error) => {
    logger.error({ error }, "Failed to auto-initialize token on server startup");
  });
}
