"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/issue", label: "Issue Credential" },
    { href: "/present", label: "Present Credential" },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">OID4VC Demo</h1>
        <p className="text-sm text-slate-400 mt-1">Credential Issuance & Verification</p>
      </div>
      
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block px-4 py-2 rounded-lg transition-colors",
              pathname === item.href
                ? "bg-slate-700 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
