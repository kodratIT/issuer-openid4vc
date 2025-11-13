// Global configuration - menggunakan env variables yang sama dengan frontend demo
export const CLOUDFLARE_TUNNEL_URL = process.env.CLOUDFLARE_TUNNEL_URL || "http://localhost:3001";
export const OID4VCI_ENDPOINT = process.env.OID4VCI_ENDPOINT || "http://localhost:8082";
export const OID4VCI_PUBLIC_ENDPOINT = process.env.OID4VCI_PUBLIC_ENDPOINT || process.env.OID4VCI_ENDPOINT || "http://localhost:8082";

// API_BASE_URL = Admin API endpoint (issuer.devlab.biz.id)
// Digunakan untuk semua credential operations (create, exchange, offer, dll)
export const API_BASE_URL = CLOUDFLARE_TUNNEL_URL;
export const API_KEY = process.env.API_KEY;

// Track supported credential creation status
export let jwtVcSupportedCredCreated = false;
export let sdJwtSupportedCredCreated = false;
export let jwtVcSupportedCredID = "";
export let sdJwtSupportedCredID = "";

export function setJwtVcSupportedCred(id: string) {
  jwtVcSupportedCredID = id;
  jwtVcSupportedCredCreated = true;
}

export function setSdJwtSupportedCred(id: string) {
  sdJwtSupportedCredID = id;
  sdJwtSupportedCredCreated = true;
}

export function getJwtVcSupportedCred() {
  return { id: jwtVcSupportedCredID, created: jwtVcSupportedCredCreated };
}

export function getSdJwtSupportedCred() {
  return { id: sdJwtSupportedCredID, created: sdJwtSupportedCredCreated };
}
