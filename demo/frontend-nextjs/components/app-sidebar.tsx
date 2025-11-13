"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileKey, 
  ShieldCheck,
  Settings,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const navItems = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/",
  },
  {
    title: "Credentials",
    icon: Settings,
    url: "/credentials",
  },
  {
    title: "Issue Credentials",
    icon: FileKey,
    url: "/issue",
    items: [
      {
        title: "All Types",
        url: "/issue",
      },
      {
        title: "JWT VC JSON",
        url: "/issue/jwt",
      },
      {
        title: "SD-JWT",
        url: "/issue/sdjwt",
      },
    ],
  },
  {
    title: "Present Credentials",
    icon: ShieldCheck,
    url: "/present",
    items: [
      {
        title: "All Types",
        url: "/present",
      },
      {
        title: "JWT VC JSON",
        url: "/present/jwt",
      },
      {
        title: "SD-JWT",
        url: "/present/sdjwt",
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">OID4VC Demo</h1>
          <p className="text-sm text-muted-foreground">
            Credential Issuance & Verification
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.items) {
                  return (
                    <Collapsible key={item.title} asChild defaultOpen={pathname.startsWith(item.url)}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url}
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          Powered by ACA-Py
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
