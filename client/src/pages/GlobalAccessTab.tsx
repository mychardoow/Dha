import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Shield, Crown, Zap, Lock, Server, Database, Activity } from 'lucide-react';

export default function GlobalAccessTab() {
  const globalFeatures = [
    {
      title: "Multi-Provider AI Integration",
      description: "42+ AI APIs including OpenAI, Anthropic, Perplexity, Mistral, Google Gemini",
      status: "ACTIVE",
      icon: Zap,
      color: "text-yellow-400"
    },
    {
      title: "Blockchain Networks",
      description: "Ethereum, Polygon, Solana, Bitcoin, Zora - All networks accessible",
      status: "CONNECTED",
      icon: Globe,
      color: "text-emerald-400"
    },
    {
      title: "Government Portals",
      description: "DHA, VFS, SAPS, SARS, NPR, ABIS, HANIS, Interpol, ICAO",
      status: "READY",
      icon: Shield,
      color: "text-purple-400"
    },
    {
      title: "Cloud Services",
      description: "AWS, GCP, Azure, Vercel, Netlify - Full cloud infrastructure access",
      status: "ONLINE",
      icon: Server,
      color: "text-blue-400"
    },
    {
      title: "Data Services",
      description: "Unlimited data processing, quantum computing simulation, ML pipelines",
      status: "UNLIMITED",
      icon: Database,
      color: "text-red-400"
    },
    {
      title: "Security Clearance",
      description: "Military-grade encryption, biometric auth, zero-knowledge proofs",
      status: "MAXIMUM",
      icon: Lock,
      color: "text-orange-400"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Global Authority Card */}
      <Card className="bg-gradient-to-r from-yellow-900/30 via-amber-800/20 to-yellow-900/30 border-yellow-600/30">
        <CardHeader>
          <CardTitle className="text-2xl text-yellow-400 flex items-center gap-3">
            <Crown className="w-8 h-8" />
            Queen Raeesa Global Authority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-black/30 rounded-lg">
              <p className="text-3xl font-bold text-emerald-400">∞</p>
              <p className="text-sm text-gray-400">Access Level</p>
            </div>
            <div className="text-center p-4 bg-black/30 rounded-lg">
              <p className="text-3xl font-bold text-yellow-400">100%</p>
              <p className="text-sm text-gray-400">Authority</p>
            </div>
            <div className="text-center p-4 bg-black/30 rounded-lg">
              <p className="text-3xl font-bold text-purple-400">UNLIMITED</p>
              <p className="text-sm text-gray-400">Capabilities</p>
            </div>
          </div>
          <p className="text-center text-emerald-400 font-semibold text-lg">
            "Only Limit Is Me" Protocol Active
          </p>
        </CardContent>
      </Card>

      {/* Global Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {globalFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 hover:border-emerald-600/50 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-400 mb-2">{feature.description}</p>
                    <Badge className="bg-gradient-to-r from-green-600 to-emerald-600">
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Emergency Override */}
      <Card className="bg-gradient-to-br from-red-900/30 to-pink-900/30 border-red-600/30">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-400 mb-4">Emergency Override System</h3>
            <p className="text-gray-400 mb-6">Bypass all restrictions with Queen Authority</p>
            <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold px-8 py-3">
              ACTIVATE OVERRIDE
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Stats */}
      <Card className="bg-gradient-to-br from-teal-900/30 to-emerald-900/30 border-emerald-600/30">
        <CardHeader>
          <CardTitle className="text-emerald-400 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-Time Global Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Active APIs</p>
              <p className="text-2xl font-bold text-yellow-400">42+</p>
            </div>
            <div>
              <p className="text-gray-400">Documents Ready</p>
              <p className="text-2xl font-bold text-emerald-400">23</p>
            </div>
            <div>
              <p className="text-gray-400">Blockchains</p>
              <p className="text-2xl font-bold text-purple-400">5</p>
            </div>
            <div>
              <p className="text-gray-400">Uptime</p>
              <p className="text-2xl font-bold text-green-400">100%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}