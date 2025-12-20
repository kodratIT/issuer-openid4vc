"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Loader2, Copy, Check } from "lucide-react";

export default function RegisterPage() {
  const [label, setLabel] = useState("");
  const [walletKey, setWalletKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ walletId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (walletKey !== confirmKey) {
      setError("Wallet keys do not match");
      return;
    }

    if (walletKey.length < 6) {
      setError("Wallet key must be at least 6 characters");
      return;
    }

    setLoading(true);

    const result = await register(label, walletKey);

    if (result.success && result.walletId) {
      setSuccess({ walletId: result.walletId });
    } else {
      setError(result.error || "Registration failed");
    }

    setLoading(false);
  };

  const copyWalletId = async () => {
    if (success?.walletId) {
      await navigator.clipboard.writeText(success.walletId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToDashboard = () => {
    router.push("/");
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Wallet Created!</CardTitle>
            <CardDescription>
              Save your Wallet ID - you&apos;ll need it to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                ⚠️ Important: Save this Wallet ID!
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You will need this ID along with your wallet key to sign in.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Your Wallet ID</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded text-sm font-mono break-all">
                  {success.walletId}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyWalletId}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={goToDashboard} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Wallet</CardTitle>
          <CardDescription>
            Create a new OID4VC wallet to issue and verify credentials
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="label">Wallet Label</Label>
              <Input
                id="label"
                type="text"
                placeholder="My Issuer Wallet"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                A friendly name for your wallet
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletKey">Wallet Key</Label>
              <Input
                id="walletKey"
                type="password"
                placeholder="••••••••"
                value={walletKey}
                onChange={(e) => setWalletKey(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This is your secret key to access the wallet (min 6 characters)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmKey">Confirm Wallet Key</Label>
              <Input
                id="confirmKey"
                type="password"
                placeholder="••••••••"
                value={confirmKey}
                onChange={(e) => setConfirmKey(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Wallet
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have a wallet?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
