# OID4VC Demo - Next.js Frontend

Migrated from Express.js + EJS to Next.js 14+ with shadcn/ui.

## Features

- ✅ Next.js 14+ with App Router
- ✅ TypeScript throughout
- ✅ shadcn/ui components with Tailwind CSS
- ✅ Server-Sent Events (SSE) for real-time updates
- ✅ ACA-Py integration
- ✅ **Token auto-initialization saat startup** (tidak perlu manual input)
- ✅ JWT VC JSON credential issuance
- ✅ SD-JWT credential issuance
- ✅ JWT VC JSON presentations
- ✅ SD-JWT presentations
- ✅ Webhook handling
- ✅ QR code generation
- ✅ Environment variables sama seperti frontend demo yang lama

## Architecture

All business logic is preserved from the original Express.js implementation:

- **`lib/aca-py/credentials.ts`** - JWT and SD-JWT credential issuance logic
- **`lib/aca-py/presentations.ts`** - JWT VC JSON and SD-JWT presentation logic
- **`lib/cache.ts`** - NodeCache for exchange and presentation caching
- **`lib/events.ts`** - EventEmitter for SSE streaming
- **`lib/logger.ts`** - Pino logger configuration
- **`lib/config.ts`** - Global configuration
- **`lib/token.ts`** - Multitenancy token management

## API Routes

- **POST `/api/issue`** - Start credential issuance
- **GET `/api/stream/issue/[id]`** - SSE stream for issuance updates
- **GET `/api/present/create/[id]`** - Create presentation request
- **GET `/api/stream/present/[id]`** - SSE stream for presentation updates  
- **POST `/api/webhook/[...path]`** - ACA-Py webhook receiver

## Pages

- **`/`** - Home page
- **`/issue`** - Select credential type to issue
- **`/issue/jwt`** - Issue JWT VC JSON credential
- **`/issue/sdjwt`** - Issue SD-JWT credential
- **`/present`** - Select presentation type
- **`/present/jwt`** - Request JWT VC JSON presentation
- **`/present/sdjwt`** - Request SD-JWT presentation

## Environment Variables

Create a `.env.local` file:

```env
# Admin API URL (issuer.devlab.biz.id)
# Endpoint untuk token, credential operations, did creation, dll
CLOUDFLARE_TUNNEL_URL=https://issuer.devlab.biz.id

# OID4VCI Public Endpoint (issuer-v2.devlab.biz.id) 
# Endpoint untuk wallet/holder akses credential offer via QR code
OID4VCI_ENDPOINT=https://issuer-v2.devlab.biz.id

# Public Endpoint (for Wallet Access)
OID4VCI_PUBLIC_ENDPOINT=https://issuer-v2.devlab.biz.id
```

**Endpoint Explanation:**
- `CLOUDFLARE_TUNNEL_URL` = **Admin API** (issuer.devlab.biz.id)
  - Used for: Token, DID creation, credential schema, exchange, offer
  - Backend operations endpoint
  
- `OID4VCI_ENDPOINT` = **Public OID4VCI API** (issuer-v2.devlab.biz.id)
  - Used for: Wallet access via QR code
  - Public-facing credential offer endpoint

**Token API Key:** Diinisiasi otomatis saat server startup (tidak perlu manual input)

**Flow Documentation:** Lihat [ENDPOINT_FLOW.md](./ENDPOINT_FLOW.md) untuk complete credential issuance flow

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t oid4vc-nextjs .
docker run -p 3000:3000 -e API_BASE_URL=http://aca-py:3001 oid4vc-nextjs
```

## Logic Preservation

All business logic from `frontend/index.js` has been migrated to TypeScript with **zero changes** to the logic itself. Only the framework changed from Express to Next.js.

### Credential Issuance Flow (Identical)

1. Create credential schema
2. Create DID
3. Create credential exchange
4. Get credential offer
5. Generate QR code
6. Listen for webhooks

### Presentation Flow (Identical)

1. Create presentation definition
2. Create presentation request  
3. Generate QR code
4. Listen for verification webhooks

## Migration Notes

- Uses Next.js SSE via ReadableStream (replaces Express res.write)
- Server components for initial rendering
- Client components for interactivity
- shadcn/ui replaces W3.CSS
- All ACA-Py API calls preserved exactly
