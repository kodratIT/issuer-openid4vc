"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { 
  FileKey, 
  RefreshCw, 
  AlertCircle, 
  Plus,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

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

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<SupportedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential type?')) {
      return;
    }

    try {
      setDeleteId(id);
      const response = await fetch(`/api/credentials/supported/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      // Refresh the list
      await fetchCredentials();
      alert('Credential deleted successfully');
    } catch (err) {
      console.error('Error deleting credential:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete credential');
    } finally {
      setDeleteId(null);
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

  const getFormatBadge = (format: string) => {
    if (format === 'jwt_vc_json') return { label: 'JWT', variant: 'default' as const };
    if (format === 'vc+sd-jwt') return { label: 'SD-JWT', variant: 'secondary' as const };
    return { label: format, variant: 'outline' as const };
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <FileKey className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Credentials Management</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm"
            asChild
          >
            <Link href="/credentials/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Link>
          </Button>
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
          <h1 className="text-3xl font-bold tracking-tight">Credentials Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage credential types, formats, and configurations
          </p>
        </div>



        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={fetchCredentials}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : credentials.length === 0 ? (
            // Empty state
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileKey className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No credentials configured</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                  No credential types have been configured yet. 
                  Configure credential types through the backend API.
                </p>
                <Button onClick={fetchCredentials}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh List
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Credential list
            credentials.map((cred) => {
              const display = cred.display?.[0];
              const formatBadge = getFormatBadge(cred.format);
              
              return (
                <Card key={cred.supported_cred_id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {display?.logo && (
                          <img 
                            src={display.logo.url} 
                            alt={display.logo.alt_text || 'Credential logo'}
                            className="h-12 w-12 object-contain"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{getCredentialTypeName(cred)}</CardTitle>
                            <Badge variant={formatBadge.variant}>
                              {formatBadge.label}
                            </Badge>
                          </div>
                          <CardDescription>
                            ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{cred.supported_cred_id}</code>
                          </CardDescription>
                          
                          {cred.format === 'jwt_vc_json' && cred.type && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {cred.type.slice(0, 5).map((t, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {t === 'VerifiableCredential' ? 'VC' : t}
                                </Badge>
                              ))}
                              {cred.type.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{cred.type.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {cred.format === 'vc+sd-jwt' && cred.vct && (
                            <div className="mt-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {cred.vct}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link href={`/credentials/${cred.supported_cred_id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link href={`/credentials/${cred.supported_cred_id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(cred.supported_cred_id)}
                        disabled={deleteId === cred.supported_cred_id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteId === cred.supported_cred_id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
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
