import { NextRequest, NextResponse } from "next/server";
import { createJwtVcPresentation, createSdJwtPresentation } from "@/lib/aca-py/presentations";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  let credentialType = searchParams.get("credential-type");
  let credential: any = null;

  try {
    // If credentialType looks like a UUID, fetch the credential details to get the format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (credentialType && uuidRegex.test(credentialType)) {
      console.log(`Fetching credential details for UUID: ${credentialType}`);
      
      // Use internal API route instead of direct backend call
      const baseUrl = request.url.split('/api/')[0];
      const response = await fetch(
        `${baseUrl}/api/credentials/supported/${credentialType}`,
        {
          headers: {
            'accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch credential details: ${response.status}`);
        return NextResponse.json({ 
          error: "Invalid credential type",
          message: "Could not find credential with the provided ID"
        }, { status: 400 });
      }

      credential = await response.json();
      
      if (!credential || !credential.format) {
        return NextResponse.json({ 
          error: "Invalid credential type",
          message: "Credential not found or invalid format"
        }, { status: 400 });
      }

      // Map format to our internal credential type
      if (credential.format === "jwt_vc_json") {
        credentialType = "jwt";
      } else if (credential.format === "vc+sd-jwt") {
        credentialType = "sdjwt";
      } else {
        return NextResponse.json({ 
          error: "Invalid credential type",
          message: `Unsupported credential format: ${credential.format}`
        }, { status: 400 });
      }

      console.log(`Mapped UUID to credential type: ${credential.format} -> ${credentialType}`);
    }

    let qrcodeSvg: string;

    if (credentialType === "jwt") {
      qrcodeSvg = await createJwtVcPresentation(id, credential);
    } else if (credentialType === "sdjwt") {
      qrcodeSvg = await createSdJwtPresentation(id, credential);
    } else {
      return NextResponse.json({ 
        error: "Invalid credential type",
        message: "Credential type must be 'jwt' or 'sdjwt'"
      }, { status: 400 });
    }

    return new Response(qrcodeSvg, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error creating presentation:", error);
    return NextResponse.json({ 
      error: "Failed to create presentation",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
