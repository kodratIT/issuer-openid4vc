"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { ArrowLeft, Save } from "lucide-react";
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

export default function EditCredentialPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const credentialId = resolvedParams.id;
  const router = useRouter();
  
  const [credential, setCredential] = useState<SupportedCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    types: "",
    vct: "",
    context: "",
    logoUrl: "",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    credentialSubjectJson: "",
    claimsJson: "",
  });

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
      
      const data: SupportedCredential = await response.json();
      setCredential(data);
      
      // Populate form
      const display = data.display?.[0];
      
      // Get credentialSubject/claims as JSON string
      const credSubject = data.format === "jwt_vc_json" && data.credentialSubject
        ? JSON.stringify(data.credentialSubject, null, 2)
        : "";
      const clms = data.format === "vc+sd-jwt" && data.claims
        ? JSON.stringify(data.claims, null, 2)
        : "";
      
      setFormData({
        id: data.id || "",
        name: display?.name || "",
        types: data.type?.join(", ") || "",
        vct: data.vct || "",
        context: data["@context"]?.join(", ") || "",
        logoUrl: display?.logo?.url || "",
        backgroundColor: display?.background_color || "#ffffff",
        textColor: display?.text_color || "#000000",
        credentialSubjectJson: credSubject,
        claimsJson: clms,
      });
    } catch (err) {
      console.error('Error fetching credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credential');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Parse JSON
      let credentialSubject, claims;
      try {
        if (credential?.format === "jwt_vc_json") {
          credentialSubject = JSON.parse(formData.credentialSubjectJson);
        } else {
          claims = JSON.parse(formData.claimsJson);
        }
      } catch (error) {
        alert('Invalid JSON format in credentialSubject/claims field');
        return;
      }

      const payload = credential?.format === "jwt_vc_json"
        ? {
            format: "jwt_vc_json",
            id: formData.id,
            type: formData.types.split(",").map(t => t.trim()),
            "@context": formData.context
              ? formData.context.split(",").map(c => c.trim())
              : ["https://www.w3.org/2018/credentials/v1"],
            credentialSubject: credentialSubject,
            cryptographic_binding_methods_supported: ["did"],
            cryptographic_suites_supported: ["ES256K"],
            display: [{
              name: formData.name,
              locale: "en-US",
              ...(formData.logoUrl && {
                logo: { 
                  url: formData.logoUrl,
                  alt_text: `${formData.name} logo`
                }
              }),
              background_color: formData.backgroundColor,
              text_color: formData.textColor,
            }],
          }
        : {
            format: "vc+sd-jwt",
            id: formData.id,
            vct: formData.vct,
            claims: claims,
            sd_list: Object.keys(claims).map(key => `/${key}`),
            cryptographic_binding_methods_supported: ["did"],
            cryptographic_suites_supported: ["ES256K"],
            display: [{
              name: formData.name,
              locale: "en-US",
              ...(formData.logoUrl && {
                logo: { 
                  url: formData.logoUrl,
                  alt_text: `${formData.name} logo`
                }
              }),
              background_color: formData.backgroundColor,
              text_color: formData.textColor,
            }],
          };

      console.log('Updating credential:', payload);

      const response = await fetch(`/api/credentials/supported/${credentialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update credential');
      }

      alert('Credential updated successfully!');
      router.push(`/credentials/${credentialId}`);
    } catch (error) {
      console.error('Error updating credential:', error);
      alert(error instanceof Error ? error.message : 'Failed to update credential');
    } finally {
      setSaving(false);
    }
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
            <CardContent className="space-y-4 py-8">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/credentials/${credentialId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <h2 className="text-lg font-semibold">Edit Credential</h2>
        </div>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Edit Credential</h1>
          <p className="text-muted-foreground mt-2">
            Update credential configuration
          </p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Credential Configuration ({credential.format})</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">Credential ID *</Label>
                <Input
                  id="id"
                  required
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {credential.format === "jwt_vc_json" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="types">Types (comma separated) *</Label>
                    <Input
                      id="types"
                      required
                      placeholder="VerifiableCredential, UniversityDegree"
                      value={formData.types}
                      onChange={(e) => setFormData({...formData, types: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="context">Context</Label>
                    <Input
                      id="context"
                      value={formData.context}
                      onChange={(e) => setFormData({...formData, context: e.target.value})}
                    />
                  </div>
                </>
              )}

              {credential.format === "vc+sd-jwt" && (
                <div className="space-y-2">
                  <Label htmlFor="vct">VCT (Verifiable Credential Type) *</Label>
                  <Input
                    id="vct"
                    required
                    value={formData.vct}
                    onChange={(e) => setFormData({...formData, vct: e.target.value})}
                  />
                </div>
              )}

              {credential.format === "jwt_vc_json" ? (
                <div className="space-y-2">
                  <Label htmlFor="credentialSubject">Credential Subject (JSON) *</Label>
                  <Textarea
                    id="credentialSubject"
                    required
                    rows={10}
                    className="font-mono text-sm"
                    value={formData.credentialSubjectJson}
                    onChange={(e) => setFormData({...formData, credentialSubjectJson: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON structure untuk credential fields
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="claims">Claims (JSON) *</Label>
                  <Textarea
                    id="claims"
                    required
                    rows={10}
                    className="font-mono text-sm"
                    value={formData.claimsJson}
                    onChange={(e) => setFormData({...formData, claimsJson: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON structure untuk credential claims
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    type="url"
                    placeholder="https://..."
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bg">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg"
                      type="color"
                      className="w-20"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({...formData, backgroundColor: e.target.value})}
                    />
                    <Input
                      type="text"
                      className="flex-1"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({...formData, backgroundColor: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text"
                    type="color"
                    className="w-20"
                    value={formData.textColor}
                    onChange={(e) => setFormData({...formData, textColor: e.target.value})}
                  />
                  <Input
                    type="text"
                    className="flex-1"
                    value={formData.textColor}
                    onChange={(e) => setFormData({...formData, textColor: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-6">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/credentials/${credentialId}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
