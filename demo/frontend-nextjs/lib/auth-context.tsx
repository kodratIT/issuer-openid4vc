"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface WalletUser {
  walletId: string;
  label: string;
  token: string;
}

interface AuthContextType {
  user: WalletUser | null;
  loading: boolean;
  login: (walletId: string, walletKey: string) => Promise<{ success: boolean; error?: string }>;
  register: (label: string, walletKey: string) => Promise<{ success: boolean; error?: string; walletId?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WalletUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (walletId: string, walletKey: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, walletKey }),
      });

      const data = await response.json();

      if (response.ok) {
        await checkAuth(); // Refresh user data
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch {
      return { success: false, error: "Failed to login" };
    }
  };

  const register = async (label: string, walletKey: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, walletKey }),
      });

      const data = await response.json();

      if (response.ok) {
        await checkAuth(); // Refresh user data
        return { success: true, walletId: data.wallet?.walletId };
      } else {
        return { success: false, error: data.error };
      }
    } catch {
      return { success: false, error: "Failed to register" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
