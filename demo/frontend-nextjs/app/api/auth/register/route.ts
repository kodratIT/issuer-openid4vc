import { NextRequest, NextResponse } from "next/server";
import { authStore } from "@/lib/auth-store";
import { API_BASE_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, walletKey } = body;

    // Validation
    if (!label || !walletKey) {
      return NextResponse.json(
        { error: "Wallet label and key are required" },
        { status: 400 }
      );
    }

    if (walletKey.length < 6) {
      return NextResponse.json(
        { error: "Wallet key must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if wallet with this label already exists locally
    const existingWallet = authStore.getWalletByLabel(label);
    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet with this label already exists" },
        { status: 409 }
      );
    }

    console.log(`Creating subwallet with label: ${label}`);
    console.log(`API_BASE_URL: ${API_BASE_URL}`);
    console.log(`Full endpoint: ${API_BASE_URL}/multitenancy/wallet`);

    // Create subwallet via ACA-Py multitenancy API
    const createResponse = await fetch(`${API_BASE_URL}/multitenancy/wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify({
        label: label,
        wallet_key: walletKey,
        wallet_type: "askar",
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Failed to create wallet:", createResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to create wallet", details: errorText },
        { status: createResponse.status }
      );
    }

    const walletData = await createResponse.json();
    console.log("Wallet created:", walletData.wallet_id);

    // Save wallet info locally
    const walletUser = {
      walletId: walletData.wallet_id,
      label: label,
      walletKey: walletKey,
      token: walletData.token,
      createdAt: walletData.created_at,
      state: walletData.state,
    };

    authStore.saveWallet(walletUser);

    // Create session
    const { sessionId } = authStore.createSession(walletUser);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      wallet: {
        walletId: walletData.wallet_id,
        label: label,
        state: walletData.state,
        createdAt: walletData.created_at,
      },
    });

    response.cookies.set("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to register", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
