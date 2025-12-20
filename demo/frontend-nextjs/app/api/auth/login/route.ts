import { NextRequest, NextResponse } from "next/server";
import { authStore } from "@/lib/auth-store";
import { API_BASE_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletId, walletKey } = body;

    // Validation
    if (!walletId || !walletKey) {
      return NextResponse.json(
        { error: "Wallet ID and key are required" },
        { status: 400 }
      );
    }

    console.log(`Getting token for wallet: ${walletId}`);

    // Get token from ACA-Py multitenancy API
    const tokenResponse = await fetch(
      `${API_BASE_URL}/multitenancy/wallet/${walletId}/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          wallet_key: walletKey,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to get token:", tokenResponse.status, errorText);
      
      if (tokenResponse.status === 404) {
        return NextResponse.json(
          { error: "Wallet not found" },
          { status: 404 }
        );
      }
      
      if (tokenResponse.status === 401 || tokenResponse.status === 403) {
        return NextResponse.json(
          { error: "Invalid wallet key" },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to authenticate", details: errorText },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("Token obtained for wallet:", walletId);

    // Get or create wallet user
    let walletUser = authStore.getWalletById(walletId);
    
    if (walletUser) {
      // Update token
      authStore.updateWalletToken(walletId, tokenData.token);
      walletUser.token = tokenData.token;
    } else {
      // Create new wallet user entry
      walletUser = {
        walletId: walletId,
        label: `Wallet-${walletId.substring(0, 8)}`,
        walletKey: walletKey,
        token: tokenData.token,
        createdAt: new Date().toISOString(),
        state: "active",
      };
      authStore.saveWallet(walletUser);
    }

    // Create session
    const { sessionId } = authStore.createSession(walletUser);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      wallet: {
        walletId: walletUser.walletId,
        label: walletUser.label,
        state: walletUser.state,
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to login", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
