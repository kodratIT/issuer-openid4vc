import { NextResponse } from "next/server";
import { didWebCache } from "@/lib/did-web-cache";

// GET /.well-known/did.json - Serve DID Document
export async function GET() {
  try {
    const config = didWebCache.getConfig();
    
    if (!config || !config.didDocument) {
      return NextResponse.json(
        { error: "DID Document not found. Please configure did:web first." },
        { status: 404 }
      );
    }
    
    return NextResponse.json(config.didDocument, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Error serving did.json:", error);
    return NextResponse.json(
      { error: "Failed to serve DID Document" },
      { status: 500 }
    );
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
