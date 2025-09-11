import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield, User, FileText, Users, Globe } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const navigationLinks = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/document-services", label: "Document Services", icon: "📑", badge: "New" },
    { href: "/document-generation", label: "Generate Documents", icon: "📄" },
    { href: "/visa-management", label: "Visa Management", icon: "✈️" },
    { href: "/admin", label: "Admin", icon: "⚙️" },
  ];

  return (
    <nav className="sticky top-0 z-40 dha-header shadow-lg" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="text-white text-2xl" />
              <span className="text-xl font-bold text-white" data-testid="brand-title">
                🇿🇦 Department of Home Affairs
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <span className="status-indicator status-online" data-testid="status-indicator"></span>
              <span className="text-sm text-white/80">Government Services</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-white hover:text-white/80 transition-colors duration-200 flex items-center space-x-1 ${
                  location === link.href ? 'border-b-2 border-yellow-400' : ''
                }`}
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
                {link.badge && (
                  <Badge className="ml-1 bg-yellow-400 text-black text-xs">
                    {link.badge}
                  </Badge>
                )}
              </Link>
            ))}

            <div className="flex items-center space-x-2">
              <Badge className="dha-badge" data-testid="security-level-badge">
                <span>🏛️</span>
                <span className="ml-1">Official</span>
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:text-white/80 transition-colors"
                data-testid="user-menu-button"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                data-testid="mobile-menu-trigger"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white border-l border-border">
              <div className="flex flex-col space-y-4 mt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Shield className="text-primary text-xl" />
                  <span className="text-lg font-bold text-primary">🇿🇦 DHA Services</span>
                </div>

                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors text-left ${
                      location === link.href ? 'bg-primary/10 border-l-4 border-primary' : ''
                    }`}
                    data-testid={`mobile-nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                    {link.badge && (
                      <Badge className="ml-auto bg-yellow-400 text-black text-xs">
                        {link.badge}
                      </Badge>
                    )}
                  </Link>
                ))}

                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Security Status</span>
                    <Badge className="dha-badge">
                      <span>🏛️</span>
                      <span className="ml-1">Official</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="status-indicator status-online"></span>
                    <span className="text-sm text-muted-foreground">Government Services Online</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
