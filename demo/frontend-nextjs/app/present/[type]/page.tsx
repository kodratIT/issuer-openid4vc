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
  const [credentialInfo, setCredentialInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [presentationData, setPresentationData] = useState<any>(null);

  // Fetch credential info if credentialType is a UUID
  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(credentialType)) {
      fetch(`/api/credentials/supported/${credentialType}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setCredentialInfo(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch credential info:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [credentialType]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/stream/present/${presentationId}`);

    eventSource.addEventListener("message", (e) => {
      console.log("📨 Message event:", e.data);
      setMessages((prev) => [...prev, e.data]);
    });

    eventSource.addEventListener("status", (e) => {
      console.log("📊 Status event:", e.data);
      setStatus(e.data);
      
      // If presentation is verified, fetch the presentation data
      if (e.data.includes("Presentation Verified")) {
        console.log("🔍 Fetching presentation status from API...");
        fetchPresentationStatus();
      }
    });

    eventSource.addEventListener("presentation-data", (e) => {
      console.log("📦 Received presentation-data event");
      console.log("📦 Raw event data:", e.data);
      try {
        const data = JSON.parse(e.data);
        console.log("📦 Parsed presentation data:", data);
        setPresentationData(data);
      } catch (error) {
        console.error("❌ Failed to parse presentation data:", error);
        console.error("❌ Raw data was:", e.data);
      }
    });

    eventSource.addEventListener("debug", (e) => {
      if (showDebug) {
        console.log("🐛 Debug:", e.data);
      }
    });

    // Generic listener to catch all events
    eventSource.onmessage = (e) => {
      console.log("🔔 Generic event received:", e);
    };

    eventSource.onerror = (e) => {
      console.error("❌ SSE Error:", e);
    };

    return () => {
      console.log("🔌 Closing SSE connection");
      eventSource.close();
    };
  }, [presentationId, showDebug]);

  const fetchPresentationStatus = async () => {
    try {
      console.log("🔍 Fetching presentation status for:", presentationId);
      const response = await fetch(`/api/present/status/${presentationId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Failed to fetch presentation status:", errorData);
        
        // If pending (202), show message
        if (response.status === 202) {
          setMessages((prev) => [...prev, "⏳ Waiting for holder to submit presentation..."]);
        }
        return;
      }
      
      const data = await response.json();
      console.log("✅ Presentation status data:", data);
      
      // Extract credential subjects from the response
      if (data.credential_subjects && data.credential_subjects.length > 0) {
        console.log("📦 Setting presentation data from credential_subjects");
        // If multiple subjects, merge them or use the first one
        if (data.credential_subjects.length === 1) {
          setPresentationData(data.credential_subjects[0]);
        } else {
          // Multiple credentials, show all
          setPresentationData({
            multiple_credentials: true,
            credentials: data.credential_subjects
          });
        }
      } else if (data.verified_claims) {
        console.log("📦 Setting presentation data from verified_claims");
        setPresentationData(data.verified_claims);
      } else if (data.presentation) {
        console.log("📦 Setting presentation data from presentation");
        setPresentationData(data.presentation);
      } else {
        console.log("📦 Setting full data as presentation data");
        setPresentationData(data);
      }
    } catch (error) {
      console.error("❌ Error fetching presentation status:", error);
    }
  };

  const handleRequest = async () => {
    setMessages([]);
    setQrCode("");
    setStatus("");
    setPresentationData(null);
    setRequested(true);

    try {
      const response = await fetch(
        `/api/present/create/${presentationId}?credential-type=${credentialType}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        setMessages([`Error: ${errorData.error}${errorData.message ? ` - ${errorData.message}` : ''}`]);
        return;
      }
      
      const svg = await response.text();
      setQrCode(svg);
    } catch (error) {
      console.error("Failed to create presentation:", error);
      setMessages([`Error: Failed to create presentation request`]);
    }
  };

  const getCredentialDisplayName = () => {
    if (credentialInfo) {
      if (credentialInfo.display?.[0]?.name) {
        return credentialInfo.display[0].name;
      }
      if (credentialInfo.type && Array.isArray(credentialInfo.type)) {
        return credentialInfo.type.filter((t: string) => t !== 'VerifiableCredential').join(', ') || credentialInfo.id;
      }
      return credentialInfo.vct || credentialInfo.id;
    }
    return credentialType === "jwt" ? "JWT VC JSON" : 
           credentialType === "sdjwt" ? "SD-JWT" : 
           credentialType;
  };

  const getCredentialFormat = () => {
    if (credentialInfo) {
      return credentialInfo.format === 'jwt_vc_json' ? 'JWT VC JSON' : 
             credentialInfo.format === 'vc+sd-jwt' ? 'SD-JWT' : 
             credentialInfo.format;
    }
    return credentialType === "jwt" ? "JWT VC JSON" : 
           credentialType === "sdjwt" ? "SD-JWT" : 
           "Unknown";
  };

  if (loading) {
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
            <h2 className="text-lg font-semibold">Loading...</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch />
          </div>
        </Header>
        <Main>
          <div className="text-center py-12">Loading credential information...</div>
        </Main>
      </>
    );
  }

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
            Present {getCredentialDisplayName()} Credential
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Present {getCredentialDisplayName()} Credential
          </h1>
          <p className="text-muted-foreground mt-2">
            Request a {getCredentialFormat()} presentation
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
            {requested && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={fetchPresentationStatus}
              >
                Check Presentation Status
              </Button>
            )}
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

        {presentationData && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Verified Presentation Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-3">
                      ✓ Presentation Successfully Verified
                    </p>
                    
                    {presentationData.multiple_credentials ? (
                      // Multiple credentials
                      <div className="space-y-4">
                        {presentationData.credentials.map((cred: any, idx: number) => (
                          <div key={idx} className="border-t pt-3 first:border-t-0 first:pt-0">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              Credential {idx + 1}
                            </p>
                            <div className="space-y-3">
                              {Object.entries(cred).filter(([key]) => key !== 'id').map(([key, value]) => (
                                <div key={key} className="flex flex-col space-y-1">
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-sm font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Single credential
                      <div className="space-y-3">
                        {Object.entries(presentationData).filter(([key]) => key !== 'id').map(([key, value]) => (
                          <div key={key} className="flex flex-col space-y-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Raw JSON
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto">
                      {JSON.stringify(presentationData, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Main>
    </>
  );
}
