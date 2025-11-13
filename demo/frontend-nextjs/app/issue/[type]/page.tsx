"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { ArrowLeft, FileKey, Loader2 } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

interface SupportedCredential {
  supported_cred_id: string;
  format: string;
  id?: string;
  identifier?: string;
  type?: string[];
  vct?: string;
  credentialSubject?: Record<string, any>;
  claims?: Record<string, any>;
  format_data?: {
    type?: string[];
    vct?: string;
    credentialSubject?: Record<string, any>;
    claims?: Record<string, any>;
    context?: string[];
  };
  vc_additional_data?: {
    "@context"?: string[];
    type?: string[];
  };
  display?: Array<{
    name?: string;
  }>;
}

interface FormField {
  key: string;
  label: string;
  type: string;
  defaultValue: string;
}

export default function IssueTypePage({ params }: { params: Promise<{ type: string }> }) {
  const resolvedParams = use(params);
  const credentialId = resolvedParams.type; // supported_cred_id from CRUD
  
  const [registrationId] = useState(() => uuidv4());
  const [credential, setCredential] = useState<SupportedCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<string[]>([]);
  const [qrCode, setQrCode] = useState<string>("");
  const [showDebug, setShowDebug] = useState(false);
  const [status, setStatus] = useState<string>("");

  // Fetch credential details and generate form
  useEffect(() => {
    const fetchCredential = async () => {
      try {
        setLoading(true);
        console.log('🔄 Fetching credential:', credentialId);
        const response = await fetch(`/api/credentials/supported/${credentialId}`);
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Fetch failed:', errorText);
          throw new Error('Failed to fetch credential');
        }
        
        const data: SupportedCredential = await response.json();
        console.log('📦 Fetched credential data:', JSON.stringify(data, null, 2));
        setCredential(data);
        
        // Generate form fields from credentialSubject or claims
        const fields = generateFormFields(data);
        console.log('📋 Generated form fields:', fields);
        setFormFields(fields);
        
        // Initialize form data with default values
        const initialData: Record<string, string> = {};
        fields.forEach(field => {
          initialData[field.key] = field.defaultValue;
        });
        console.log('📋 Initial form data:', initialData);
        setFormData(initialData);
        
      } catch (error) {
        console.error('Error fetching credential:', error);
        setMessages(prev => [...prev, `<span class="text-red-600">Error loading credential: ${error}</span>`]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCredential();
  }, [credentialId]);

  // Generate form fields from credential structure
  const generateFormFields = (cred: SupportedCredential): FormField[] => {
    console.log('🔍 Generating fields for credential:', cred);
    const fields: FormField[] = [];
    
    // Backend stores credentialSubject/claims in format_data
    const attributes = cred.format === "jwt_vc_json" 
      ? (cred.format_data?.credentialSubject || cred.credentialSubject)
      : (cred.format_data?.claims || cred.claims);
    
    console.log('🔍 Attributes extracted:', attributes);
    console.log('🔍 Credential format:', cred.format);
    
    if (!attributes) {
      console.warn('⚠️ No attributes found in credential');
      return fields;
    }
    
    const attributeKeys = Object.keys(attributes);
    console.log('🔍 Attribute keys:', attributeKeys);
    
    attributeKeys.forEach(key => {
      const attr = attributes[key];
      console.log(`🔍 Processing key "${key}":`, attr);
      
      // Skip if attribute is empty object or has nested complex structure
      // Only include fields that should be user input
      const isEmptyObject = attr && typeof attr === 'object' && Object.keys(attr).length === 0;
      
      console.log(`🔍 "${key}" - isEmptyObject:`, isEmptyObject);
      
      // Skip empty objects (like "degree": {})
      if (isEmptyObject) {
        console.log(`⏭️ Skipping "${key}" - empty object`);
        return;
      }
      
      // Get display name from metadata if available
      let displayName = key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      if (attr && typeof attr === 'object' && attr.display && Array.isArray(attr.display)) {
        displayName = attr.display[0]?.name || displayName;
      }
      
      // Determine input type based on key name
      let inputType = 'text';
      if (key.includes('email')) inputType = 'email';
      else if (key.includes('age') || key.includes('number')) inputType = 'number';
      else if (key.includes('date') || key.includes('birth')) inputType = 'date';
      
      // Default values based on field type
      let defaultValue = '';
      if (key.includes('name') || key.includes('given')) defaultValue = 'John';
      else if (key.includes('last') || key.includes('family') || key.includes('surname')) defaultValue = 'Doe';
      else if (key.includes('email')) defaultValue = 'john.doe@example.com';
      else if (key.includes('age')) defaultValue = '25';
      
      const field = {
        key,
        label: displayName,
        type: inputType,
        defaultValue
      };
      
      console.log(`✅ Adding field:`, field);
      fields.push(field);
    });
    
    console.log(`🎯 Total fields generated: ${fields.length}`, fields);
    return fields;
  };

  useEffect(() => {
    console.log("🔌 Connecting to SSE stream:", `/api/stream/issue/${registrationId}`);
    const eventSource = new EventSource(`/api/stream/issue/${registrationId}`);

    eventSource.onopen = () => {
      console.log("✅ SSE connection opened");
    };

    eventSource.onerror = (error) => {
      console.error("❌ SSE error:", error);
    };

    eventSource.addEventListener("message", (e) => {
      console.log("📨 Message received:", e.data);
      setMessages((prev) => [...prev, e.data]);
    });

    eventSource.addEventListener("qrcode", (e) => {
      console.log("🔳 QR Code received:", e.data.substring(0, 50) + "...");
      setQrCode(e.data);
    });

    eventSource.addEventListener("status", (e) => {
      console.log("📊 Status received:", e.data);
      setStatus(e.data);
    });

    eventSource.addEventListener("debug", (e) => {
      console.log("🐛 Debug:", e.data);
      if (showDebug) {
        setMessages((prev) => [...prev, `[DEBUG] ${e.data}`]);
      }
    });

    return () => {
      console.log("🔌 Closing SSE connection");
      eventSource.close();
    };
  }, [registrationId, showDebug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Submitting form with registrationId:", registrationId);
    console.log("📋 Form data:", formData);
    console.log("🎫 Credential:", credential);
    setMessages([]);
    setQrCode("");
    setStatus("");

    const payload = {
      supported_cred_id: credential?.supported_cred_id,
      credential_data: formData, // Dynamic data from form
      registrationId,
    };

    console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch("/api/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      console.log("📥 Response status:", response.status);
      
      if (!response.ok) {
        const error = await response.text();
        console.error("❌ Error response:", error);
        setMessages((prev) => [...prev, `<span class="text-red-600">Error: ${error}</span>`]);
      } else {
        console.log("✅ Form submitted successfully");
      }
    } catch (error) {
      console.error("❌ Submit error:", error);
      setMessages((prev) => [...prev, `<span class="text-red-600">Error: ${error}</span>`]);
    }
  };



  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/issue">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <FileKey className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Issue {credential?.display?.[0]?.name || "Credential"}
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Issue {credential?.display?.[0]?.name || "Credential"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {credential?.format === "jwt_vc_json"
              ? "Issue a JWT VC JSON Credential"
              : "Issue a Selective Disclosure SD-JWT Credential"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credential Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading credential details...</span>
              </div>
            ) : formFields.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No attributes found for this credential
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {formFields.map((field) => (
                  <div key={field.key}>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.label}
                      required
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full" disabled={loading}>
                  Issue Credential
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? "Hide" : "Show"} Debug
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code & Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Registration ID: {registrationId}</p>
              <p className="text-xs text-slate-400">Debug Mode: {showDebug ? "ON" : "OFF"}</p>
            </div>
            
            {!qrCode && messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Waiting for credential issuance...
              </div>
            )}
            
            {qrCode && qrCode !== "Credential Issued!" && (
              <div className="flex justify-center mb-4" dangerouslySetInnerHTML={{ __html: qrCode }} />
            )}
            {qrCode === "Credential Issued!" && (
              <div className="text-center text-2xl font-bold text-green-600 py-8">
                ✓ Credential Issued Successfully!
              </div>
            )}
            {status && <div className="text-center mt-4" dangerouslySetInnerHTML={{ __html: status }} />}
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
