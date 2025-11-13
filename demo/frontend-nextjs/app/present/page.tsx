"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { useRouter } from "next/navigation";
import { ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";

interface SupportedCredential {
  supported_cred_id: string;
  format: string;
  id: string;
  type?: string[];
  vct?: string;
  "@context"?: string[];
  display?: Array<{
    name?: string;
    locale?: string;
    logo?: {
      url?: string;
      alt_text?: string;
    };
    background_color?: string;
    text_color?: string;
  }>;
  credentialSubject?: any;
  claims?: any;
}

export default function PresentPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<SupportedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching supported credentials...');
      
      const response = await fetch('/api/credentials/supported');
      
      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }
      
      const data = await response.json();
      console.log('Fetched credentials:', data);
      setCredentials(data.results || []);
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const getCredentialTypeName = (cred: SupportedCredential) => {
    if (cred.display && cred.display[0]?.name) {
      return cred.display[0].name;
    }
    if (cred.type && Array.isArray(cred.type)) {
      return cred.type.filter(t => t !== 'VerifiableCredential').join(', ') || cred.id;
    }
    return cred.vct || cred.id;
  };

  const getCredentialDescription = (cred: SupportedCredential) => {
    const formatLabel = cred.format === 'jwt_vc_json' ? 'JWT VC JSON' : 
                       cred.format === 'vc+sd-jwt' ? 'SD-JWT' : cred.format;
    return `Format: ${formatLabel}`;
  };

  const getFormatBadge = (format: string) => {
    if (format === 'jwt_vc_json') return { label: 'JWT', variant: 'default' as const };
    if (format === 'vc+sd-jwt') return { label: 'SD-JWT', variant: 'secondary' as const };
    return { label: format, variant: 'outline' as const };
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Present Credentials</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchCredentials}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Present Credential</h1>
          <p className="text-muted-foreground mt-2">
            Select the type of credential presentation to verify
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Error loading credentials</p>
              <p className="text-sm mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={fetchCredentials}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : credentials.length === 0 ? (
            // Empty state
            <div className="col-span-full">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No credentials configured</h3>
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    No credential types have been configured yet. 
                    Please configure credential types in the backend first.
                  </p>
                  <Button onClick={fetchCredentials}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh List
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Credential cards
            credentials.map((cred) => {
              const display = cred.display?.[0];
              const backgroundColor = display?.background_color;
              const textColor = display?.text_color;
              const formatBadge = getFormatBadge(cred.format);
              
              return (
                <Card 
                  key={cred.supported_cred_id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                  onClick={() => router.push(`/present/${cred.supported_cred_id}`)}
                  style={{
                    backgroundColor: backgroundColor || undefined,
                    color: textColor || undefined,
                  }}
                >
                  <CardHeader>
                    {display?.logo && (
                      <img 
                        src={display.logo.url} 
                        alt={display.logo.alt_text || 'Credential logo'}
                        className="h-12 w-12 object-contain mb-2"
                      />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex-1">{getCredentialTypeName(cred)}</CardTitle>
                      <Badge variant={formatBadge.variant}>
                        {formatBadge.label}
                      </Badge>
                    </div>
                    <CardDescription style={{ color: textColor ? `${textColor}CC` : undefined }}>
                      {getCredentialDescription(cred)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cred.format === 'jwt_vc_json' && cred.type && (
                      <div className="text-sm mb-4">
                        <p className="font-medium mb-1 text-xs text-muted-foreground">Types:</p>
                        <div className="flex flex-wrap gap-1">
                          {cred.type.slice(0, 3).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {t === 'VerifiableCredential' ? 'VC' : t}
                            </Badge>
                          ))}
                          {cred.type.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{cred.type.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {cred.format === 'vc+sd-jwt' && cred.vct && (
                      <div className="text-sm mb-4">
                        <p className="font-medium mb-1 text-xs text-muted-foreground">VCT:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                          {cred.vct}
                        </code>
                      </div>
                    )}
                    
                    <Button className="w-full" variant="default">
                      Verify Credential
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Main>
    </>
  );
}
