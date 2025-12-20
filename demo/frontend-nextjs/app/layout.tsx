import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { AuthLayout } from "@/components/auth-layout";

export const metadata: Metadata = {
  title: "OID4VC Demo",
  description: "OpenID for Verifiable Credentials Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AuthLayout>{children}</AuthLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
