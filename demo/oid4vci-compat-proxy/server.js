const http = require('node:http');

const TARGET_HOST = process.env.TARGET_HOST || 'issuer';
const TARGET_PORT = Number(process.env.TARGET_PORT || 8082);
const PUBLIC_URL = (process.env.OID4VCI_PUBLIC_ENDPOINT || '').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 8080);

function isMetadataPath(pathname) {
  return pathname.endsWith('/.well-known/openid-credential-issuer');
}

function isCredentialOfferPath(pathname) {
  // Matches /credential-offer or /credential-offer/{id}
  return /\/credential-offer(\/|$)/.test(pathname);
}

function addCredoCompatibilityMetadata(body) {
  if (!PUBLIC_URL) return body;

  const metadata = JSON.parse(body);
  const issuerUrl = String(metadata.credential_issuer || '').replace(/\/$/, '');
  const publicIssuerUrl = issuerUrl.replace(/^https?:\/\/[^/]+/, PUBLIC_URL);

  metadata.credential_issuer = publicIssuerUrl;
  metadata.credential_endpoint = `${publicIssuerUrl}/credential`;
  if (metadata.notification_endpoint) {
    metadata.notification_endpoint = `${publicIssuerUrl}/notification`;
  }

  // Credo holder 0.6.x expects token_endpoint as a fallback when oauth metadata is absent.
  metadata.token_endpoint = `${publicIssuerUrl}/token`;

  // Compatibility for draft 11/13/14 wallets that still look for credentials_supported.
  if (!metadata.credentials_supported && metadata.credential_configurations_supported) {
    metadata.credentials_supported = Object.entries(metadata.credential_configurations_supported).map(([id, value]) => ({
      id,
      ...value,
    }));
  }

  // Add backwards compatibility: also expose credential_configurations_supported as array
  if (!metadata.credential_configurations_supported && metadata.credentials_supported) {
    const configs = {};
    metadata.credentials_supported.forEach((cred) => {
      const { id, ...rest } = cred;
      if (id) configs[id] = rest;
    });
    if (Object.keys(configs).length > 0) {
      metadata.credential_configurations_supported = configs;
    }
  }

  return JSON.stringify(metadata);
}

/**
 * Transform credential offer response from old inline format to
 * credential_configuration_ids format (draft 13+).
 *
 * Credo / Aries Bifold wallet expects credential_configuration_ids in the offer.
 */
function transformCredentialOfferResponse(body) {
  try {
    const offer = JSON.parse(body);

    // Already has credential_configuration_ids
    if (offer.credential_configuration_ids && Array.isArray(offer.credential_configuration_ids)) {
      return body;
    }

    // Old format: credentials array with inline objects
    if (offer.credentials && Array.isArray(offer.credentials)) {
      const hasInline = offer.credentials.some((c) => typeof c === 'object' && c !== null);

      if (hasInline) {
        console.log('Transforming credential offer from old format to credential_configuration_ids');

        // Try to extract IDs from metadata if available, otherwise use format as fallback
        const ids = offer.credentials.map((c, i) => {
          if (c.id) return c.id;
          if (c.credential_configuration_id) return c.credential_configuration_id;
          // Fallback: use format + index
          return `${c.format || 'credential'}_${i}`;
        });

        delete offer.credentials;
        offer.credential_configuration_ids = ids;
        return JSON.stringify(offer);
      }

      // Already string array: just rename
      const allStrings = offer.credentials.every((c) => typeof c === 'string');
      if (allStrings) {
        offer.credential_configuration_ids = offer.credentials;
        delete offer.credentials;
        return JSON.stringify(offer);
      }
    }

    return body;
  } catch (e) {
    console.error('Failed to transform credential offer:', e);
    return body;
  }
}

const server = http.createServer((clientReq, clientRes) => {
  // Capture request body for POST requests
  const chunks = [];
  clientReq.on('data', (chunk) => chunks.push(chunk));

  clientReq.on('end', () => {
    const requestBody = chunks.length > 0 ? Buffer.concat(chunks) : null;

    const options = {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: `${TARGET_HOST}:${TARGET_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const responseChunks = [];
      proxyRes.on('data', (chunk) => responseChunks.push(chunk));
      proxyRes.on('end', () => {
        const originalBody = Buffer.concat(responseChunks);
        let responseBody = originalBody;
        const headers = { ...proxyRes.headers };

        try {
          const pathname = new URL(clientReq.url, 'http://localhost').pathname;
          if (proxyRes.statusCode === 200 && isMetadataPath(pathname)) {
            responseBody = Buffer.from(addCredoCompatibilityMetadata(originalBody.toString('utf8')));
            headers['content-type'] = 'application/json';
            headers['content-length'] = Buffer.byteLength(responseBody);
          } else if (proxyRes.statusCode === 200 && isCredentialOfferPath(pathname)) {
            responseBody = Buffer.from(transformCredentialOfferResponse(originalBody.toString('utf8')));
            headers['content-type'] = 'application/json';
            headers['content-length'] = Buffer.byteLength(responseBody);
          }
        } catch (error) {
          console.error('compatibility transform failed:', error);
        }

        clientRes.writeHead(proxyRes.statusCode || 500, headers);
        clientRes.end(responseBody);
      });
    });

    proxyReq.on('error', (error) => {
      clientRes.writeHead(502, { 'content-type': 'application/json' });
      clientRes.end(JSON.stringify({ error: error.message }));
    });

    // Log credential requests for debugging
    if (requestBody && clientReq.url.includes('/credential')) {
      try {
        const parsed = JSON.parse(requestBody.toString('utf8'));
        console.log('[PROXY] Credential request body:', JSON.stringify(parsed));
      } catch (e) {
        console.log('[PROXY] Credential request (non-JSON):', requestBody ? requestBody.toString().substring(0, 300) : 'empty');
      }
    }

    if (requestBody) {
      proxyReq.write(requestBody);
    }
    proxyReq.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OID4VCI compatibility proxy listening on ${PORT}, forwarding to ${TARGET_HOST}:${TARGET_PORT}`);
});
