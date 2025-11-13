"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

export default function PresentTypePage({ params }: { params: Promise<{ type: string }> }) {
  const resolvedParams = use(params);
  const credentialType = resolvedParams.type;
  
  const [presentationId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<string[]>([]);
  const [qrCode, setQrCode] = useState<string>("");
  const [showDebug, setShowDebug] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/stream/present/${presentationId}`);

    eventSource.addEventListener("message", (e) => {
      setMessages((prev) => [...prev, e.data]);
    });

    eventSource.addEventListener("status", (e) => {
      setStatus(e.data);
    });

    eventSource.addEventListener("debug", (e) => {
      if (showDebug) {
        console.log("Debug:", e.data);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [presentationId, showDebug]);

  const handleRequest = async () => {
    setMessages([]);
    setQrCode("");
    setStatus("");
    setRequested(true);

    const response = await fetch(
      `/api/present/create/${presentationId}?credential-type=${credentialType}`
    );
    const svg = await response.text();
    setQrCode(svg);
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/present">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Present {credentialType === "jwt" ? "JWT VC JSON" : "SD-JWT"} Credential
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Present {credentialType === "jwt" ? "JWT VC JSON" : "SD-JWT"} Credential
          </h1>
          <p className="text-muted-foreground mt-2">
            {credentialType === "jwt"
              ? "Request a JWT VC JSON presentation"
              : "Request a Selective Disclosure JWT presentation"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Presentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!requested ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Click the button below to generate a presentation request QR code.
                </p>
                <Button onClick={handleRequest} className="w-full">
                  Create Presentation Request
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-green-600 font-medium">
                  ✓ Presentation request created
                </p>
                <Button onClick={handleRequest} variant="outline" className="w-full">
                  Regenerate Request
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? "Hide" : "Show"} Debug
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code & Status</CardTitle>
          </CardHeader>
          <CardContent>
            {qrCode && (
              <div className="flex justify-center mb-4" dangerouslySetInnerHTML={{ __html: qrCode }} />
            )}
            {status && <div className="mt-4" dangerouslySetInnerHTML={{ __html: status }} />}
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Messages ({messages.length}):</p>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="text-sm text-muted-foreground border-b pb-1"
                  dangerouslySetInnerHTML={{ __html: msg }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </Main>
    </>
  );
}
