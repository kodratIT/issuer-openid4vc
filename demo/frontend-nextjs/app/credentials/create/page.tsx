"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { ArrowLeft, Save, Plus, Trash2, Eye, Code } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CredentialField {
  id: string;
  key: string;
  displayName: string;
  hasDisplay: boolean;
  isRequired: boolean;
}

export default function CreateCredentialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"jwt_vc_json" | "vc+sd-jwt">("jwt_vc_json");
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  
  // JWT VC JSON fields
  const [jwtFormData, setJwtFormData] = useState({
    id: "",
    name: "",
    types: "VerifiableCredential,UniversityDegreeCredential",
    context: "https://www.w3.org/2018/credentials/v1,https://www.w3.org/2018/credentials/examples/v1",
    logoUrl: "",
    backgroundColor: "#ffffff",
    textColor: "#000000",
  });
  
  // JWT Fields Builder
  const [jwtFields, setJwtFields] = useState<CredentialField[]>([
    { id: "1", key: "given_name", displayName: "Given Name", hasDisplay: true, isRequired: true },
    { id: "2", key: "gpa", displayName: "GPA", hasDisplay: true, isRequired: false },
    { id: "3", key: "last_name", displayName: "Surname", hasDisplay: true, isRequired: true },
  ]);

  // SD-JWT fields
  const [sdJwtFormData, setSdJwtFormData] = useState({
    id: "",
    name: "",
    vct: "",
    logoUrl: "",
    backgroundColor: "#ffffff",
    textColor: "#000000",
  });
  
  // SD-JWT Fields Builder
  const [sdJwtFields, setSdJwtFields] = useState<CredentialField[]>([
    { id: "1", key: "first_name", displayName: "First Name", hasDisplay: true, isRequired: true },
    { id: "2", key: "last_name", displayName: "Last Name", hasDisplay: true, isRequired: true },
    { id: "3", key: "age", displayName: "Age", hasDisplay: false, isRequired: false },
  ]);
  
  // Helper functions
  const addJwtField = () => {
    setJwtFields([...jwtFields, {
      id: Date.now().toString(),
      key: "",
      displayName: "",
      hasDisplay: true,
      isRequired: false
    }]);
  };
  
  const removeJwtField = (id: string) => {
    setJwtFields(jwtFields.filter(f => f.id !== id));
  };
  
  const updateJwtField = (id: string, updates: Partial<CredentialField>) => {
    setJwtFields(jwtFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  
  const addSdJwtField = () => {
    setSdJwtFields([...sdJwtFields, {
      id: Date.now().toString(),
      key: "",
      displayName: "",
      hasDisplay: true,
      isRequired: false
    }]);
  };
  
  const removeSdJwtField = (id: string) => {
    setSdJwtFields(sdJwtFields.filter(f => f.id !== id));
  };
  
  const updateSdJwtField = (id: string, updates: Partial<CredentialField>) => {
    setSdJwtFields(sdJwtFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  
  // Build JSON from fields
  const buildCredentialSubjectJson = (fields: CredentialField[]) => {
    const obj: Record<string, any> = {};
    fields.forEach(field => {
      if (!field.key) return;
      
      if (field.hasDisplay && field.displayName) {
        obj[field.key] = {
          display: [{
            name: field.displayName,
            locale: "en-US"
          }]
        };
      } else {
        obj[field.key] = {};
      }
    });
    return obj;
  };
  
  const buildClaimsJson = (fields: CredentialField[]) => {
    return buildCredentialSubjectJson(fields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build JSON from fields
      let credentialSubject, claims;
      if (format === "jwt_vc_json") {
        credentialSubject = buildCredentialSubjectJson(jwtFields);
      } else {
        claims = buildClaimsJson(sdJwtFields);
      }

      const payload = format === "jwt_vc_json" 
        ? {
            format: "jwt_vc_json",
            id: jwtFormData.id,
            type: jwtFormData.types.split(",").map(t => t.trim()),
            "@context": jwtFormData.context 
              ? jwtFormData.context.split(",").map(c => c.trim())
              : ["https://www.w3.org/2018/credentials/v1"],
            credentialSubject: credentialSubject,
            cryptographic_binding_methods_supported: ["did"],
            cryptographic_suites_supported: ["ES256K"],
            display: [{
              name: jwtFormData.name,
              locale: "en-US",
              ...(jwtFormData.logoUrl && {
                logo: { 
                  url: jwtFormData.logoUrl,
                  alt_text: `${jwtFormData.name} logo`
                }
              }),
              background_color: jwtFormData.backgroundColor,
              text_color: jwtFormData.textColor,
            }],
          }
        : {
            format: "vc+sd-jwt",
            id: sdJwtFormData.id,
            vct: sdJwtFormData.vct,
            claims: claims,
            sd_list: claims ? Object.keys(claims).map(key => `/${key}`) : [],
            cryptographic_binding_methods_supported: ["did"],
            cryptographic_suites_supported: ["ES256K"],
            display: [{
              name: sdJwtFormData.name,
              locale: "en-US",
              ...(sdJwtFormData.logoUrl && {
                logo: { 
                  url: sdJwtFormData.logoUrl,
                  alt_text: `${sdJwtFormData.name} logo`
                }
              }),
              background_color: sdJwtFormData.backgroundColor,
              text_color: sdJwtFormData.textColor,
            }],
          };

      console.log('Creating credential:', payload);

      const response = await fetch('/api/credentials/supported', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create credential');
      }

      alert('Credential created successfully!');
      router.push('/credentials');
    } catch (error) {
      console.error('Error creating credential:', error);
      alert(error instanceof Error ? error.message : 'Failed to create credential');
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-lg font-semibold">Create New Credential</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create New Credential</h1>
          <p className="text-muted-foreground mt-2">
            Add a new credential type to the system
          </p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Credential Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={format} onValueChange={(v) => setFormat(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="jwt_vc_json">JWT VC JSON</TabsTrigger>
                <TabsTrigger value="vc+sd-jwt">SD-JWT</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                <TabsContent value="jwt_vc_json" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jwt-id">Credential ID *</Label>
                    <Input
                      id="jwt-id"
                      required
                      placeholder="e.g., UniversityDegreeCredential"
                      value={jwtFormData.id}
                      onChange={(e) => setJwtFormData({...jwtFormData, id: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-name">Display Name *</Label>
                    <Input
                      id="jwt-name"
                      required
                      placeholder="e.g., University Degree"
                      value={jwtFormData.name}
                      onChange={(e) => setJwtFormData({...jwtFormData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-types">Types (comma separated) *</Label>
                    <Input
                      id="jwt-types"
                      required
                      placeholder="VerifiableCredential, UniversityDegree"
                      value={jwtFormData.types}
                      onChange={(e) => setJwtFormData({...jwtFormData, types: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-context">Context</Label>
                    <Input
                      id="jwt-context"
                      placeholder="@context"
                      value={jwtFormData.context}
                      onChange={(e) => setJwtFormData({...jwtFormData, context: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Credential Fields *</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addJwtField}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Field
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Define the fields that will appear when issuing this credential
                    </p>
                    
                    <div className="space-y-3">
                      {jwtFields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Field Key *</Label>
                                  <Input
                                    placeholder="e.g., given_name"
                                    value={field.key}
                                    onChange={(e) => updateJwtField(field.id, { key: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Display Name</Label>
                                  <Input
                                    placeholder="e.g., First Name"
                                    value={field.displayName}
                                    onChange={(e) => updateJwtField(field.id, { displayName: e.target.value })}
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeJwtField(field.id)}
                                className="mt-5"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`jwt-display-${field.id}`}
                                  checked={field.hasDisplay}
                                  onCheckedChange={(checked) => 
                                    updateJwtField(field.id, { hasDisplay: !!checked })
                                  }
                                />
                                <Label htmlFor={`jwt-display-${field.id}`} className="text-xs font-normal cursor-pointer">
                                  Has display metadata
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`jwt-required-${field.id}`}
                                  checked={field.isRequired}
                                  onCheckedChange={(checked) => 
                                    updateJwtField(field.id, { isRequired: !!checked })
                                  }
                                />
                                <Label htmlFor={`jwt-required-${field.id}`} className="text-xs font-normal cursor-pointer">
                                  Required field
                                </Label>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {showJsonPreview && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">JSON Preview:</Label>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(buildCredentialSubjectJson(jwtFields), null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowJsonPreview(!showJsonPreview)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showJsonPreview ? 'Hide' : 'Show'} JSON Preview
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jwt-logo">Logo URL</Label>
                      <Input
                        id="jwt-logo"
                        type="url"
                        placeholder="https://..."
                        value={jwtFormData.logoUrl}
                        onChange={(e) => setJwtFormData({...jwtFormData, logoUrl: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jwt-bg">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="jwt-bg"
                          type="color"
                          className="w-20"
                          value={jwtFormData.backgroundColor}
                          onChange={(e) => setJwtFormData({...jwtFormData, backgroundColor: e.target.value})}
                        />
                        <Input
                          type="text"
                          className="flex-1"
                          value={jwtFormData.backgroundColor}
                          onChange={(e) => setJwtFormData({...jwtFormData, backgroundColor: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-text">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="jwt-text"
                        type="color"
                        className="w-20"
                        value={jwtFormData.textColor}
                        onChange={(e) => setJwtFormData({...jwtFormData, textColor: e.target.value})}
                      />
                      <Input
                        type="text"
                        className="flex-1"
                        value={jwtFormData.textColor}
                        onChange={(e) => setJwtFormData({...jwtFormData, textColor: e.target.value})}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vc+sd-jwt" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sd-id">Credential ID *</Label>
                    <Input
                      id="sd-id"
                      required
                      placeholder="e.g., IDCardCredential"
                      value={sdJwtFormData.id}
                      onChange={(e) => setSdJwtFormData({...sdJwtFormData, id: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sd-name">Display Name *</Label>
                    <Input
                      id="sd-name"
                      required
                      placeholder="e.g., ID Card"
                      value={sdJwtFormData.name}
                      onChange={(e) => setSdJwtFormData({...sdJwtFormData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sd-vct">VCT (Verifiable Credential Type) *</Label>
                    <Input
                      id="sd-vct"
                      required
                      placeholder="e.g., https://credentials.example.com/identity/v1"
                      value={sdJwtFormData.vct}
                      onChange={(e) => setSdJwtFormData({...sdJwtFormData, vct: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">SD-JWT Claims *</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addSdJwtField}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Claim
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Define the claims that will appear when issuing this credential
                    </p>
                    
                    <div className="space-y-3">
                      {sdJwtFields.map((field) => (
                        <Card key={field.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Claim Key *</Label>
                                  <Input
                                    placeholder="e.g., first_name"
                                    value={field.key}
                                    onChange={(e) => updateSdJwtField(field.id, { key: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Display Name</Label>
                                  <Input
                                    placeholder="e.g., First Name"
                                    value={field.displayName}
                                    onChange={(e) => updateSdJwtField(field.id, { displayName: e.target.value })}
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSdJwtField(field.id)}
                                className="mt-5"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`sd-display-${field.id}`}
                                  checked={field.hasDisplay}
                                  onCheckedChange={(checked) => 
                                    updateSdJwtField(field.id, { hasDisplay: !!checked })
                                  }
                                />
                                <Label htmlFor={`sd-display-${field.id}`} className="text-xs font-normal cursor-pointer">
                                  Has display metadata
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`sd-required-${field.id}`}
                                  checked={field.isRequired}
                                  onCheckedChange={(checked) => 
                                    updateSdJwtField(field.id, { isRequired: !!checked })
                                  }
                                />
                                <Label htmlFor={`sd-required-${field.id}`} className="text-xs font-normal cursor-pointer">
                                  Required field
                                </Label>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {showJsonPreview && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">JSON Preview:</Label>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(buildClaimsJson(sdJwtFields), null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowJsonPreview(!showJsonPreview)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showJsonPreview ? 'Hide' : 'Show'} JSON Preview
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sd-logo">Logo URL</Label>
                      <Input
                        id="sd-logo"
                        type="url"
                        placeholder="https://..."
                        value={sdJwtFormData.logoUrl}
                        onChange={(e) => setSdJwtFormData({...sdJwtFormData, logoUrl: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sd-bg">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sd-bg"
                          type="color"
                          className="w-20"
                          value={sdJwtFormData.backgroundColor}
                          onChange={(e) => setSdJwtFormData({...sdJwtFormData, backgroundColor: e.target.value})}
                        />
                        <Input
                          type="text"
                          className="flex-1"
                          value={sdJwtFormData.backgroundColor}
                          onChange={(e) => setSdJwtFormData({...sdJwtFormData, backgroundColor: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sd-text">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sd-text"
                        type="color"
                        className="w-20"
                        value={sdJwtFormData.textColor}
                        onChange={(e) => setSdJwtFormData({...sdJwtFormData, textColor: e.target.value})}
                      />
                      <Input
                        type="text"
                        className="flex-1"
                        value={sdJwtFormData.textColor}
                        onChange={(e) => setSdJwtFormData({...sdJwtFormData, textColor: e.target.value})}
                      />
                    </div>
                  </div>
                </TabsContent>

                <div className="flex gap-2 pt-6">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Credential'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/credentials">Cancel</Link>
                  </Button>
                </div>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
