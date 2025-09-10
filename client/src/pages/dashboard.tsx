import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import SecurityAlert from "@/components/SecurityAlert";
import BiometricScanner from "@/components/BiometricScanner";
import FraudDetection from "@/components/FraudDetection";
import DocumentProcessor from "@/components/DocumentProcessor";
import QuantumEncryption from "@/components/QuantumEncryption";
import MonitoringDashboard from "@/components/MonitoringDashboard";
import DeploymentPackage from "@/components/DeploymentPackage";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { socket, isConnected } = useWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected) {
      toast({
        title: "System Online",
        description: "DHA Security Platform initialized successfully",
        className: "border-secure bg-secure/10 text-secure",
      });
    }
  }, [isConnected, toast]);

  return (
    <div className="min-h-screen bg-background">
      <SecurityAlert />
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-bg relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
              Military-Grade Security Platform
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Production-ready digital services platform with authentic biometric authentication, 
              quantum encryption, and real-time fraud detection systems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button 
                className="btn-enhanced bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-semibold flex items-center space-x-2"
                data-testid="button-deploy-platform"
              >
                <span>🚀</span>
                <span>Deploy Platform</span>
              </button>
              <button 
                className="btn-enhanced bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-4 rounded-lg font-semibold flex items-center space-x-2"
                data-testid="button-download-package"
              >
                <span>📥</span>
                <span>Download Package</span>
              </button>
            </div>
            
            {/* Security Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="glass p-6 rounded-lg text-center" data-testid="card-security-level">
                <div className="text-2xl font-bold text-secure mb-2">99.9%</div>
                <div className="text-sm text-muted-foreground">Security Level</div>
              </div>
              <div className="glass p-6 rounded-lg text-center" data-testid="card-monitoring">
                <div className="text-2xl font-bold text-primary mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Monitoring</div>
              </div>
              <div className="glass p-6 rounded-lg text-center" data-testid="card-breaches">
                <div className="text-2xl font-bold text-warning mb-2">0</div>
                <div className="text-sm text-muted-foreground">Breaches</div>
              </div>
              <div className="glass p-6 rounded-lg text-center quantum-encrypted" data-testid="card-encryption">
                <div className="text-2xl font-bold text-quantum mb-2">AES-256</div>
                <div className="text-sm text-muted-foreground">Encryption</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Biometric Authentication System */}
      <section id="biometric" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Biometric Authentication System</h2>
            <p className="text-muted-foreground">Multi-factor biometric verification with military-grade accuracy</p>
          </div>
          <BiometricScanner />
        </div>
      </section>

      {/* Fraud Detection System */}
      <section id="fraud-detection" className="py-20 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Real-Time Fraud Detection</h2>
            <p className="text-muted-foreground">Advanced AI-powered fraud monitoring and prevention</p>
          </div>
          <FraudDetection />
        </div>
      </section>

      {/* Document Verification & OCR */}
      <section id="documents" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Document Verification & OCR</h2>
            <p className="text-muted-foreground">Advanced document processing with AI-powered verification</p>
          </div>
          <DocumentProcessor />
        </div>
      </section>

      {/* Quantum Encryption Section */}
      <section id="quantum" className="py-20 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Quantum Encryption System</h2>
            <p className="text-muted-foreground">Next-generation quantum-resistant encryption technology</p>
          </div>
          <QuantumEncryption />
        </div>
      </section>

      {/* Real-time Monitoring Dashboard */}
      <section id="monitoring" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Real-time Security Monitoring</h2>
            <p className="text-muted-foreground">Comprehensive security dashboard with live threat intelligence</p>
          </div>
          <MonitoringDashboard />
        </div>
      </section>

      {/* Deployment Package Section */}
      <section id="deployment" className="py-20 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Deployment Package</h2>
            <p className="text-muted-foreground">Download production-ready deployment package with complete documentation</p>
          </div>
          <DeploymentPackage />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-military/50 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-primary text-xl">🛡️</span>
                <span className="text-lg font-bold">DHA Security Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Military-grade security platform for enterprise digital services.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Security Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Biometric Authentication</li>
                <li>Quantum Encryption</li>
                <li>Fraud Detection</li>
                <li>Document Verification</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Deployment Guide</li>
                <li>Technical Support</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Compliance</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>FISMA Compliant</li>
                <li>SOC 2 Type II</li>
                <li>GDPR Ready</li>
                <li>ISO 27001</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 DHA Digital Services Pro. All rights reserved. Military-grade security for critical systems.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
