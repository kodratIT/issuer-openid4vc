# Frontend Migration Plan: Express+EJS → Next.js + shadcn/ui

## Overview
Migrate the OID4VC demo frontend from Express.js + EJS templates to Next.js 14+ with shadcn/ui, maintaining ALL existing business logic and functionality.

## Current Architecture Analysis

### Tech Stack (Current)
- **Framework**: Express.js v4.21.2
- **View Engine**: EJS templates
- **Client-Side**: HTMX 2.0.1 + Server-Sent Events (SSE)
- **Styling**: W3.CSS
- **State Management**: EventEmitter + NodeCache
- **API Client**: Axios v1.12.0
- **Logging**: Pino v9.3.2
- **QR Code**: qrcode-svg v1.1.0

### Key Features to Preserve
1. **Credential Issuance Flow**
   - JWT-VC-JSON credentials
   - SD-JWT credentials
   - Real-time QR code generation
   - Server-Sent Events for status updates

2. **Presentation Flow**
   - JWT VC JSON presentations
   - SD-JWT presentations
   - Real-time verification status

3. **ACA-Py Integration**
   - Webhook handling (/webhook/*)
   - Multitenancy token management
   - Credential exchange caching
   - Presentation caching

## Target Architecture

### Tech Stack (New)
- **Framework**: Next.js 14+ (App Router)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Client-Side**: React 18+ with Server Components
- **State Management**: React Context + Zustand
- **API Routes**: Next.js Route Handlers
- **Streaming**: Next.js Streaming API / ReadableStream
- **Logging**: Pino (keep existing)
- **QR Code**: qrcode.react or qrcode-svg (keep)

### Project Structure
```
frontend-nextjs/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Home page (/)
│   ├── issue/
│   │   ├── page.tsx           # Issue form page
│   │   └── [type]/page.tsx    # JWT/SDJWT specific forms
│   ├── present/
│   │   ├── page.tsx           # Presentation page
│   │   └── [type]/page.tsx    # JWT/SDJWT presentation
│   └── api/
│       ├── issue/route.ts     # POST /api/issue
│       ├── present/route.ts   # POST /api/present
│       ├── stream/
│       │   ├── issue/[id]/route.ts
│       │   └── present/[id]/route.ts
│       └── webhook/
│           └── [...path]/route.ts
├── components/
│   ├── ui/                    # shadcn components
│   ├── sidebar.tsx
│   ├── qr-code-display.tsx
│   ├── event-stream.tsx
│   └── forms/
│       ├── jwt-credential-form.tsx
│       └── sdjwt-credential-form.tsx
├── lib/
│   ├── aca-py/
│   │   ├── credentials.ts     # Credential issuance logic
│   │   ├── presentations.ts   # Presentation logic
│   │   └── webhooks.ts        # Webhook handlers
│   ├── cache.ts               # NodeCache wrapper
│   ├── events.ts              # EventEmitter singleton
│   └── logger.ts              # Pino logger setup
└── public/
    └── ... (static assets)
```

## Migration Strategy

### Phase 1: Project Setup (frontend-developer)
**Droid**: frontend-developer
**Duration**: ~30 minutes

**Tasks**:
1. Create new Next.js 14 project with App Router
2. Install shadcn/ui: `npx shadcn-ui@latest init`
3. Configure Tailwind CSS
4. Install dependencies:
   ```json
   {
     "axios": "^1.12.0",
     "node-cache": "^5.1.2",
     "pino": "^9.3.2",
     "pino-colada": "^2.2.2",
     "qrcode-svg": "^1.1.0",
     "uuid": "^10.0.0",
     "zustand": "^4.4.0",
     "qrcode.react": "^3.1.0"
   }
   ```
5. Set up environment variables (.env.local)

**Deliverables**:
- `package.json` with all dependencies
- `tailwind.config.ts` configured
- `components.json` for shadcn
- Basic project structure

### Phase 2: Core Business Logic Migration (backend-typescript-architect)
**Droid**: backend-typescript-architect
**Duration**: ~45 minutes

**Tasks**:
1. Extract business logic from `index.js` into TypeScript modules:
   - `lib/aca-py/credentials.ts`:
     - `issueJwtCredential()`
     - `issueSdJwtCredential()`
   - `lib/aca-py/presentations.ts`:
     - `createJwtVcPresentation()`
     - `createSdJwtPresentation()`
   - `lib/aca-py/webhooks.ts`:
     - `handleOid4vciWebhook()`
     - `handleOid4vpWebhook()`

2. Create utility modules:
   - `lib/cache.ts`: NodeCache singleton
   - `lib/events.ts`: EventEmitter singleton for SSE
   - `lib/logger.ts`: Pino logger configuration
   - `lib/api-client.ts`: Axios instance with auth

3. Type definitions:
   - Create `types/aca-py.ts` for all API interfaces
   - Credential exchange types
   - Presentation definition types

**Deliverables**:
- All business logic in TypeScript
- Type-safe API calls
- Zero logic changes (only refactoring to TS)

### Phase 3: API Routes Implementation (backend-typescript-architect)
**Droid**: backend-typescript-architect
**Duration**: ~45 minutes

**Tasks**:
1. Create Next.js API routes mirroring Express routes:

   **`app/api/issue/route.ts`** (POST):
   - Accept form data (fname, lname, email/age, credential-type)
   - Call `issueJwtCredential()` or `issueSdJwtCredential()`
   - Return 200 immediately
   - Emit events for SSE stream

   **`app/api/stream/issue/[id]/route.ts`** (GET):
   - Implement Server-Sent Events using ReadableStream
   - Listen to EventEmitter for the specific registration ID
   - Stream messages, debug info, QR codes

   **`app/api/present/[type]/route.ts`** (GET):
   - Generate presentation request
   - Return QR code data

   **`app/api/stream/present/[id]/route.ts`** (GET):
   - SSE stream for presentation status

   **`app/api/webhook/[...path]/route.ts`** (POST):
   - Handle OID4VCI webhooks
   - Handle OID4VP webhooks
   - Emit events to appropriate streams

2. Implement token management:
   - Initialize multitenancy wallet on server startup
   - Store token globally (or in singleton)

**Deliverables**:
- All API routes functional
- SSE streaming working
- Webhook handling preserved

### Phase 4: UI Components with shadcn (frontend-developer)
**Droid**: frontend-developer
**Duration**: ~60 minutes

**Tasks**:
1. Install shadcn components:
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   npx shadcn-ui@latest add form
   npx shadcn-ui@latest add input
   npx shadcn-ui@latest add label
   npx shadcn-ui@latest add select
   npx shadcn-ui@latest add separator
   npx shadcn-ui@latest add badge
   npx shadcn-ui@latest add alert
   ```

2. Create layout components:
   - `components/sidebar.tsx`: Navigation sidebar (replaces w3-sidebar)
   - `app/layout.tsx`: Root layout with sidebar

3. Create page components:
   - `app/page.tsx`: Home page
   - `app/issue/page.tsx`: Issue credential selector
   - `app/issue/[type]/page.tsx`: JWT/SDJWT forms
   - `app/present/page.tsx`: Presentation selector
   - `app/present/[type]/page.tsx`: JWT/SDJWT presentation

4. Create feature components:
   - `components/forms/jwt-credential-form.tsx`: Form with validation
   - `components/forms/sdjwt-credential-form.tsx`: Form with validation
   - `components/qr-code-display.tsx`: QR code renderer
   - `components/event-stream.tsx`: SSE listener component
   - `components/status-display.tsx`: Status messages

**Deliverables**:
- All pages using shadcn components
- Responsive design (mobile-friendly)
- Modern UI matching W3.CSS functionality

### Phase 5: Real-time Features (frontend-developer)
**Droid**: frontend-developer
**Duration**: ~30 minutes

**Tasks**:
1. Create `hooks/useEventStream.ts`:
   - Connect to SSE endpoint
   - Parse event types (message, debug-message, qrcode, status)
   - Update React state

2. Create `hooks/useIssuanceStream.ts`:
   - Specific hook for credential issuance
   - Handle QR code updates
   - Handle status messages

3. Create `hooks/usePresentationStream.ts`:
   - Specific hook for presentations
   - Handle verification status

4. Implement real-time updates in components:
   - QR code appears when emitted
   - Messages stream to UI
   - Debug toggle for technical details

**Deliverables**:
- Working SSE in React
- Real-time QR code display
- Status updates working

### Phase 6: Testing & Validation (test-automator)
**Droid**: test-automator
**Duration**: ~40 minutes

**Tasks**:
1. Test all flows:
   - JWT credential issuance
   - SD-JWT credential issuance
   - JWT VC JSON presentation
   - SD-JWT presentation
   - Webhook handling

2. Test SSE streaming:
   - Message delivery
   - QR code display
   - Error handling

3. Compare with original Express app:
   - API calls match exactly
   - Logic flow identical
   - UI behavior equivalent

4. Test Docker build:
   - Update Dockerfile for Next.js
   - Test docker-compose integration

**Deliverables**:
- All features verified working
- No regressions from original
- Docker deployment ready

### Phase 7: Documentation & Cleanup (code-reviewer)
**Droid**: code-reviewer
**Duration**: ~20 minutes

**Tasks**:
1. Review code quality
2. Ensure TypeScript types are complete
3. Update README with Next.js instructions
4. Document environment variables
5. Clean up unused dependencies

**Deliverables**:
- Clean, maintainable code
- Updated documentation
- Production-ready

## Key Implementation Notes

### Server-Sent Events in Next.js
```typescript
// app/api/stream/issue/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const listener = (data: any) => {
        if (data.type === 'message') {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${data.message}\n\n`)
          );
        }
        // ... handle other event types
      };
      
      events.on(`issuance-${params.id}`, listener);
      
      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        events.off(`issuance-${params.id}`, listener);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Form Handling with shadcn
```typescript
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

export function JwtCredentialForm({ registrationId }: Props) {
  const form = useForm();
  
  const onSubmit = async (data: FormData) => {
    await fetch('/api/issue', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        registrationId,
        'credential-type': 'jwt',
      }),
    });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="fname" ... />
        <FormField name="lname" ... />
        <FormField name="email" ... />
        <Button type="submit">Issue Credential</Button>
      </form>
    </Form>
  );
}
```

## Docker Configuration

### Updated Dockerfile
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

## Timeline Estimate
- **Phase 1**: 30 min
- **Phase 2**: 45 min
- **Phase 3**: 45 min
- **Phase 4**: 60 min
- **Phase 5**: 30 min
- **Phase 6**: 40 min
- **Phase 7**: 20 min

**Total**: ~4.5 hours (270 minutes)

## Success Criteria
✅ All original functionality preserved
✅ No changes to business logic
✅ Modern UI with shadcn/ui
✅ TypeScript throughout
✅ SSE streaming works
✅ Webhooks handled correctly
✅ Docker deployment ready
✅ Mobile responsive
✅ Better developer experience

## Migration Execution Command
To execute this migration with Factory orchestrator:
```bash
# Create the orchestrator task file
cat > /tmp/nextjs-migration-task.md << 'EOF'
Migrate the OID4VC demo frontend from Express.js to Next.js following the plan in orchestrator/migration-nextjs-plan.md. Execute phases 1-7 in sequence, coordinating between frontend-developer, backend-typescript-architect, test-automator, and code-reviewer droids.
EOF

# Execute with Factory CLI
factory orchestrate -f /tmp/nextjs-migration-task.md
```
