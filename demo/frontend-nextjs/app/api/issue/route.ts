import { NextRequest, NextResponse } from "next/server";
import { issueJwtCredential, issueSdJwtCredential, issueCredential } from "@/lib/aca-py/credentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Issue API received:", body);

    // Check if this is new generic format (from CRUD)
    if (body.supported_cred_id && body.credential_data) {
      const { supported_cred_id, credential_data, registrationId } = body;
      await issueCredential(supported_cred_id, credential_data, registrationId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Backward compatibility: old static format (jwt/sdjwt)
    const { fname: firstName, lname: lastName, email, age, registrationId, "credential-type": credentialType } = body;

    if (credentialType === "jwt") {
      await issueJwtCredential(firstName, lastName, email, registrationId);
    } else if (credentialType === "sdjwt") {
      const ageNum = parseInt(age);
      await issueSdJwtCredential(firstName, lastName, ageNum, registrationId);
    } else {
      return NextResponse.json({ error: "Invalid credential type or missing parameters" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error issuing credential:", error);
    return NextResponse.json({ 
      error: "Failed to issue credential",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
