import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield, User } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navigationLinks = [
    { href: "#dashboard", label: "Dashboard", icon: "📊" },
    { href: "#security", label: "Security", icon: "🛡️" },
    { href: "#biometric", label: "Biometric", icon: "👁️" },
    { href: "#documents", label: "Documents", icon: "📄" },
    { href: "#monitoring", label: "Monitoring", icon: "📈" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="text-primary text-2xl" />
              <span className="text-xl font-bold gradient-text" data-testid="brand-title">
                DHA Security Pro
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <span className="status-indicator status-online" data-testid="status-indicator"></span>
              <span className="text-sm text-muted-foreground">System Secure</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-foreground hover:text-primary transition-colors duration-200 flex items-center space-x-1"
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </button>
            ))}

            <div className="flex items-center space-x-2">
              <Badge className="security-badge security-level-1" data-testid="security-level-badge">
                <span>🔒</span>
                <span className="ml-1">Level 5</span>
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="text-foreground hover:text-primary transition-colors"
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
            <SheetContent side="right" className="w-80 glass border-l border-border">
              <div className="flex flex-col space-y-4 mt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Shield className="text-primary text-xl" />
                  <span className="text-lg font-bold gradient-text">DHA Security Pro</span>
                </div>

                {navigationLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollToSection(link.href)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors text-left"
                    data-testid={`mobile-nav-link-${link.label.toLowerCase()}`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </button>
                ))}

                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Security Status</span>
                    <Badge className="security-badge security-level-1">
                      <span>🔒</span>
                      <span className="ml-1">Level 5</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="status-indicator status-online"></span>
                    <span className="text-sm text-muted-foreground">All Systems Operational</span>
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
