"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { KeyRound, Globe, Copy, Check, Trash2, RefreshCw } from "lucide-react";

interface DidWebConfig {
  configured: boolean;
  domain?: string;
  did?: string;
  didDocument?: any;
  publicJwk?: any;
  createdAt?: string;
}

export default function DidWebPage() {
  const [domain, setDomain] = useState("");
  const [config, setConfig] = useState<DidWebConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/did-web");
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!domain.trim()) {
      setError("Please enter a domain");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch("/api/did-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Failed to create did:web");
        return;
      }
      
      await fetchConfig();
      setDomain("");
    } catch (err) {
      setError("Failed to create did:web");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the did:web configuration?")) {
      return;
    }

    try {
      await fetch("/api/did-web", { method: "DELETE" });
      await fetchConfig();
    } catch (err) {
      console.error("Failed to delete config:", err);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <>
        <Header>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h2 className="text-lg font-semibold">DID:Web Management</h2>
          </div>
          <div className="ml-auto">
            <ThemeSwitch />
          </div>
        </Header>
        <Main>
          <div className="text-center py-12">Loading...</div>
        </Main>
      </>
    );
  }

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <h2 className="text-lg font-semibold">DID:Web Management</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfig}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">DID:Web Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your did:web identifier for credential issuance
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create/Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {config?.configured ? "Current Configuration" : "Create DID:Web"}
              </CardTitle>
              <CardDescription>
                {config?.configured 
                  ? "Your did:web is configured and ready to use"
                  : "Enter your domain to create a new did:web identifier"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config?.configured ? (
                <>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm">
                        {config.domain}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(config.domain!, "domain")}
                      >
                        {copied === "domain" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>DID</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                        {config.did}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(config.did!, "did")}
                      >
                        {copied === "did" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Created At</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(config.createdAt!).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button variant="destructive" onClick={handleDelete} className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Configuration
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      id="domain"
                      placeholder="openid-console.devlab.biz.id"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the domain where your did:web will be hosted
                    </p>
                  </div>
                  
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  
                  <Button onClick={handleCreate} disabled={creating} className="w-full">
                    {creating ? "Creating..." : "Create DID:Web"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* DID Document Card */}
          {config?.configured && (
            <Card>
              <CardHeader>
                <CardTitle>DID Document</CardTitle>
                <CardDescription>
                  Deploy this to <code>https://{config.domain}/.well-known/did.json</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-80">
                    {JSON.stringify(config.didDocument, null, 2)}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(JSON.stringify(config.didDocument, null, 2), "didDoc")}
                  >
                    {copied === "didDoc" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> This server also serves the DID Document at{" "}
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                      /.well-known/did.json
                    </code>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Public Key Card */}
        {config?.configured && config.publicJwk && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Public Key (JWK)</CardTitle>
              <CardDescription>
                Use this public key for verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
                  {JSON.stringify(config.publicJwk, null, 2)}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(JSON.stringify(config.publicJwk, null, 2), "pubKey")}
                >
                  {copied === "pubKey" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  );
}
