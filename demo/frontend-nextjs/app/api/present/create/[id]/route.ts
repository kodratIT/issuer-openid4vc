import { NextRequest, NextResponse } from "next/server";
import { createJwtVcPresentation, createSdJwtPresentation } from "@/lib/aca-py/presentations";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const credentialType = searchParams.get("credential-type");

  try {
    let qrcodeSvg: string;

    if (credentialType === "jwt") {
      qrcodeSvg = await createJwtVcPresentation(id);
    } else if (credentialType === "sdjwt") {
      qrcodeSvg = await createSdJwtPresentation(id);
    } else {
      return NextResponse.json({ error: "Invalid credential type" }, { status: 400 });
    }

    return new Response(qrcodeSvg, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error creating presentation:", error);
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 });
  }
}
