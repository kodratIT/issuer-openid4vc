import { NextRequest, NextResponse } from "next/server";
import { generateKeyPair, exportJWK } from "jose";
import { didWebCache } from "@/lib/did-web-cache";

// GET - Retrieve current did:web configuration
export async function GET() {
  try {
    const config = didWebCache.getConfig();
    
    if (!config) {
      return NextResponse.json({
        configured: false,
        message: "No did:web configured yet"
      });
    }
    
    return NextResponse.json({
      configured: true,
      domain: config.domain,
      did: config.did,
      didDocument: config.didDocument,
      createdAt: config.createdAt
    });
  } catch (error) {
    console.error("Error getting did:web config:", error);
    return NextResponse.json(
      { error: "Failed to get did:web configuration" },
      { status: 500 }
    );
  }
}

// POST - Create new did:web
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;
    
    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }
    
    console.log(`Creating did:web for domain: ${domain}`);
    
    // Generate EC P-256 key pair
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    
    // Export keys to JWK format
    const publicJwk = await exportJWK(publicKey);
    const privateJwk = await exportJWK(privateKey);
    
    // Create DID
    const did = `did:web:${domain}`;
    
    // Create DID Document
    const didDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/jws-2020/v1"
      ],
      "id": did,
      "verificationMethod": [
        {
          "id": `${did}#key-1`,
          "type": "JsonWebKey2020",
          "controller": did,
          "publicKeyJwk": {
            "kty": publicJwk.kty,
            "crv": publicJwk.crv,
            "x": publicJwk.x,
            "y": publicJwk.y
          }
        }
      ],
      "authentication": [`${did}#key-1`],
      "assertionMethod": [`${did}#key-1`],
      "service": [
        {
          "id": `${did}#oid4vci`,
          "type": "OID4VCIService",
          "serviceEndpoint": `https://${domain}`
        },
        {
          "id": `${did}#oid4vp`,
          "type": "OID4VPService",
          "serviceEndpoint": `https://${domain}`
        }
      ]
    };
    
    // Store configuration
    const config = {
      domain,
      did,
      didDocument,
      publicJwk,
      privateJwk,
      createdAt: new Date().toISOString()
    };
    
    didWebCache.setConfig(config);
    
    console.log(`Created did:web: ${did}`);
    
    return NextResponse.json({
      success: true,
      did,
      didDocument,
      publicJwk: {
        kty: publicJwk.kty,
        crv: publicJwk.crv,
        x: publicJwk.x,
        y: publicJwk.y
      },
      message: `did:web created successfully. Deploy did.json to https://${domain}/.well-known/did.json`
    });
  } catch (error) {
    console.error("Error creating did:web:", error);
    return NextResponse.json(
      { error: "Failed to create did:web", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove did:web configuration
export async function DELETE() {
  try {
    didWebCache.clearConfig();
    return NextResponse.json({ success: true, message: "did:web configuration removed" });
  } catch (error) {
    console.error("Error deleting did:web config:", error);
    return NextResponse.json(
      { error: "Failed to delete did:web configuration" },
      { status: 500 }
    );
  }
}
