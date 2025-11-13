"use client";

import { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { 
  FileKey, 
  ShieldCheck, 
  QrCode, 
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Statistics {
  totalCredentials: number;
  issuedCredentials: number;
  pendingCredentials: number;
  totalPresentations: number;
  verifiedPresentations: number;
  activeSessions: number;
  successRate: number;
}

export default function Home() {
  const [stats, setStats] = useState<Statistics>({
    totalCredentials: 0,
    issuedCredentials: 0,
    pendingCredentials: 0,
    totalPresentations: 0,
    verifiedPresentations: 0,
    activeSessions: 0,
    successRate: 100
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatistics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/statistics');
      const data = await response.json();
      setStats(data);
      console.log('Dashboard statistics updated:', data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchStatistics}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to OID4VC Demo</h1>
          <p className="text-muted-foreground mt-2">
            OpenID for Verifiable Credentials - Credential Issuance & Presentation
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Credentials
              </CardTitle>
              <FileKey className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.issuedCredentials}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCredentials} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Verifications
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.verifiedPresentations}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalPresentations} total presentations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Sessions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.activeSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : `${stats.successRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Of all credentials issued
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileKey className="h-5 w-5 text-primary" />
                <CardTitle>Issue Credentials</CardTitle>
              </div>
              <CardDescription>Create and issue verifiable credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Issue JWT-VC-JSON or SD-JWT credentials to holders using OpenID4VCI protocol.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <strong>Multiple Formats</strong> - JWT VC JSON & SD-JWT
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <strong>Dynamic Types</strong> - Configure any credential type
                  </div>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/issue">Issue Credentials</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>Present Credentials</CardTitle>
              </div>
              <CardDescription>Verify credential presentations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Request and verify credential presentations using OpenID4VP protocol.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <strong>Flexible Requests</strong> - Define what to verify
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <strong>Selective Disclosure</strong> - Privacy-preserving
                  </div>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/present">Verify Credentials</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Features</CardTitle>
            <CardDescription>
              Built with modern standards and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <QrCode className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">QR Code Generation</div>
                  <p className="text-xs text-muted-foreground">
                    Real-time QR codes for credential exchange
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Live Updates</div>
                  <p className="text-xs text-muted-foreground">
                    Server-Sent Events for real-time status
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">ACA-Py Integration</div>
                  <p className="text-xs text-muted-foreground">
                    Powered by Hyperledger Aries Cloud Agent
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Multiple Formats</div>
                  <p className="text-xs text-muted-foreground">
                    Support for JWT and SD-JWT credentials
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
