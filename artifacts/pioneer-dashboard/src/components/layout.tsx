import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  PlusCircle,
  Menu
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Release Requests", href: "/requests", icon: ClipboardList },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground", className)}>
      <div className="p-6 flex items-center gap-3 font-semibold text-lg border-b border-sidebar-border">
        <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
          P
        </div>
        Pioneer Inventory
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1">
        <div className="text-xs font-semibold text-sidebar-accent px-3 mb-2 uppercase tracking-wider">
          Menu
        </div>
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div 
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer text-sm font-medium",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </div>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-sidebar-border/50">
          <Link href="/requests/new">
            <div 
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 rounded-md transition-colors cursor-pointer text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              )}
              data-testid="nav-new-request"
            >
              <PlusCircle className="w-4 h-4" />
              New Request
            </div>
          </Link>
        </div>
      </div>
      
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60 text-center">
        ICC International
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-semibold">
          <div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs">
            P
          </div>
          Pioneer
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-sidebar-border bg-sidebar text-sidebar-foreground">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-w-full">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
