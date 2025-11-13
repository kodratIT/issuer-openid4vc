"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { ArrowLeft, Edit, Trash2, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function ViewCredentialPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const credentialId = resolvedParams.id;
  const router = useRouter();
  
  const [credential, setCredential] = useState<SupportedCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCredential();
  }, [credentialId]);

  const fetchCredential = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/credentials/supported/${credentialId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch credential');
      }
      
      const data = await response.json();
      setCredential(data);
    } catch (err) {
      console.error('Error fetching credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credential');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/supported/${credentialId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      alert('Credential deleted successfully');
      router.push('/credentials');
    } catch (err) {
      console.error('Error deleting credential:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete credential');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormatBadge = (format: string) => {
    if (format === 'jwt_vc_json') return { label: 'JWT VC JSON', variant: 'default' as const };
    if (format === 'vc+sd-jwt') return { label: 'SD-JWT', variant: 'secondary' as const };
    return { label: format, variant: 'outline' as const };
  };

  if (loading) {
    return (
      <>
        <Header>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/credentials">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
          <div className="ml-auto"><ThemeSwitch /></div>
        </Header>
        <Main>
          <Skeleton className="h-10 w-64 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </Main>
      </>
    );
  }

  if (error || !credential) {
    return (
      <>
        <Header>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/credentials">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
          <div className="ml-auto"><ThemeSwitch /></div>
        </Header>
        <Main>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">{error || 'Credential not found'}</p>
              <Button asChild className="mt-4">
                <Link href="/credentials">Back to Credentials</Link>
              </Button>
            </CardContent>
          </Card>
        </Main>
      </>
    );
  }

  const display = credential.display?.[0];
  const formatBadge = getFormatBadge(credential.format);

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/credentials">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <h2 className="text-lg font-semibold">View Credential</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href={`/credentials/${credentialId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {display?.logo && (
              <img 
                src={display.logo.url} 
                alt={display.logo.alt_text || 'Logo'}
                className="h-16 w-16 object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {display?.name || credential.id}
              </h1>
              <Badge variant={formatBadge.variant} className="mt-2">
                {formatBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Credential ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded">
                    {credential.supported_cred_id}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(credential.supported_cred_id)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Format</Label>
                <p className="mt-1 text-sm">{credential.format}</p>
              </div>

              <div>
                <Label>Display Name</Label>
                <p className="mt-1 text-sm">{display?.name || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Format Specific */}
          {credential.format === 'jwt_vc_json' && (
            <Card>
              <CardHeader>
                <CardTitle>JWT VC JSON Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {credential.type && (
                  <div>
                    <Label>Types</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {credential.type.map((t, i) => (
                        <Badge key={i} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {credential["@context"] && (
                  <div>
                    <Label>Context</Label>
                    <pre className="mt-1 text-sm bg-muted px-3 py-2 rounded overflow-x-auto">
                      {JSON.stringify(credential["@context"], null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {credential.format === 'vc+sd-jwt' && credential.vct && (
            <Card>
              <CardHeader>
                <CardTitle>SD-JWT Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>VCT (Verifiable Credential Type)</Label>
                  <code className="block mt-1 text-sm bg-muted px-3 py-2 rounded">
                    {credential.vct}
                  </code>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Display Configuration */}
          {display && (
            <Card>
              <CardHeader>
                <CardTitle>Display Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {display.logo && (
                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <img 
                        src={display.logo.url} 
                        alt={display.logo.alt_text || 'Logo'}
                        className="h-12 w-12 object-contain border rounded p-1"
                      />
                      <code className="text-sm text-muted-foreground">
                        {display.logo.url}
                      </code>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="h-8 w-8 rounded border"
                        style={{ backgroundColor: display.background_color }}
                      />
                      <code className="text-sm">{display.background_color}</code>
                    </div>
                  </div>

                  <div>
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="h-8 w-8 rounded border"
                        style={{ backgroundColor: display.text_color }}
                      />
                      <code className="text-sm">{display.text_color}</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw JSON */}
          <Card>
            <CardHeader>
              <CardTitle>Raw JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted px-3 py-2 rounded overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(credential, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-muted-foreground">{children}</div>;
}
