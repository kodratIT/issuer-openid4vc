import { NextRequest, NextResponse } from "next/server";
import { presentationCache } from "@/lib/cache";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { getToken } from "@/lib/token";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: presentationId } = await context.params;

  try {
    console.log(`Fetching presentation status for: ${presentationId}`);
    
    // First, get cached presentation request data to find presentation_id
    const cacheKeys = presentationCache.keys();
    console.log("Cache keys:", cacheKeys);
    
    let cachedData: any = null;
    let presDefId: string | null = null;
    
    // Find the cached data for this presentationId
    for (const key of cacheKeys) {
      const data: any = presentationCache.get(key);
      if (data && data.presentationId === presentationId) {
        cachedData = data;
        presDefId = key;
        break;
      }
    }
    
    if (!cachedData) {
      console.log("No presentation found for presentationId:", presentationId);
      return NextResponse.json({ 
        error: "Presentation not found",
        message: "No presentation data found in cache. It may have expired (TTL: 5 minutes)"
      }, { status: 404 });
    }
    
    console.log("Found cached data for pres_def_id:", presDefId);
    console.log("Cached data keys:", Object.keys(cachedData));
    
    // Get presentation_id from cached data
    const apiPresentationId = cachedData.presentationRequestData?.pres_ex_id;
    
    if (!apiPresentationId) {
      console.log("No pres_ex_id found in cached data");
      console.log("presentationRequestData:", JSON.stringify(cachedData.presentationRequestData, null, 2));
      
      // Try to get from verified data in cache
      const verifiedKey = `verified-${presentationId}`;
      const verifiedData: any = presentationCache.get(verifiedKey);
      
      if (verifiedData && verifiedData.verifiedData) {
        console.log("Found verified presentation data in cache");
        return NextResponse.json({
          state: "presentation-valid",
          data: verifiedData.verifiedData,
          verified_at: verifiedData.verifiedAt
        });
      }
      
      return NextResponse.json({ 
        error: "Presentation ID not found",
        message: "No pres_ex_id in cached data",
        state: "pending"
      }, { status: 202 });
    }
    
    console.log("Fetching presentations from API with pres_def_id:", presDefId);
    
    // Fetch presentations from backend API
    // Endpoint: GET /oid4vp/presentations?pres_def_id={pres_def_id}
    const token = await getToken();
    const url = `${API_BASE_URL}/oid4vp/presentations?pres_def_id=${presDefId}`;
    
    console.log("Fetching from URL:", url);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token.token}`,
        'X-API-KEY': API_KEY || '',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: "Presentation not found",
          message: "Presentation not found in backend. Holder may not have submitted yet.",
          state: "pending"
        }, { status: 202 });
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Presentation data from API:", JSON.stringify(data, null, 2));
    
    // Check if we have results
    if (!data.results || data.results.length === 0) {
      console.log("No presentation results found");
      return NextResponse.json({ 
        error: "Presentation not found",
        message: "No presentations found. Holder may not have submitted yet.",
        state: "pending"
      }, { status: 202 });
    }
    
    // Get the first (most recent) presentation
    const presentation = data.results[0];
    console.log("Presentation state:", presentation.state);
    console.log("Presentation verified:", presentation.verified);
    
    // Extract credential subjects from matched_credentials
    const credentialSubjects: any[] = [];
    
    if (presentation.matched_credentials) {
      Object.keys(presentation.matched_credentials).forEach((key) => {
        const credential = presentation.matched_credentials[key];
        if (credential.vc && credential.vc.credentialSubject) {
          credentialSubjects.push(credential.vc.credentialSubject);
        }
      });
    }
    
    console.log("Extracted credential subjects:", JSON.stringify(credentialSubjects, null, 2));
    
    // Return formatted response
    return NextResponse.json({
      state: presentation.state,
      verified: presentation.verified,
      presentation_id: presentation.presentation_id,
      pres_def_id: presentation.pres_def_id,
      created_at: presentation.created_at,
      updated_at: presentation.updated_at,
      credential_subjects: credentialSubjects,
      matched_credentials: presentation.matched_credentials,
      raw_presentation: presentation
    });
  } catch (error) {
    console.error("Error fetching presentation status:", error);
    return NextResponse.json({ 
      error: "Failed to fetch presentation status",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
