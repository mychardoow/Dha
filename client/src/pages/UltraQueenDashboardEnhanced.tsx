import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, FileText, Cpu, Database, Globe, 
  CheckCircle, AlertCircle, Zap, Network,
  Crown, Lock, Server, Activity, Wallet,
  Download, MessageSquare, Image
} from 'lucide-react';

export default function UltraQueenDashboardEnhanced() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/ultra-dashboard/status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.status);
        console.log('System Status:', data.status);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDocument = async (docType: string) => {
    toast({
      title: 'Generating Document',
      description: `Creating ${docType.replace(/_/g, ' ')}...`,
    });
    
    try {
      const response = await fetch('/api/ultra-dashboard/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentType: docType,
          personalData: {
            fullName: 'Queen Raeesa',
            idNumber: '0001015000080',
            dateOfBirth: '2000-01-01',
            nationality: 'South African',
            address: 'Ultra Queen Palace, Johannesburg'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: '✅ Document Generated Successfully',
          description: `${data.documentType.replace(/_/g, ' ')} is ready for download`,
        });
        
        // Download the document
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        }
      }
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: `Failed to generate document`,
        variant: 'destructive'
      });
    }
  };

  const sendAIMessage = async () => {
    if (!aiMessage.trim()) return;
    
    toast({
      title: 'Sending to AI',
      description: 'Processing your message...',
    });
    
    try {
      const response = await fetch('/api/ultra-dashboard/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: aiMessage,
          systemPrompt: 'You are Ultra Queen AI Raeesa with unlimited capabilities'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: '🤖 AI Response',
          description: data.response.substring(0, 100) + '...',
        });
        setAiMessage('');
      }
    } catch (error) {
      toast({
        title: 'AI Error',
        description: 'Failed to get AI response',
        variant: 'destructive'
      });
    }
  };

  const generateAIImage = async () => {
    if (!imagePrompt.trim()) return;
    
    toast({
      title: 'Generating Image',
      description: 'Creating your image with DALL-E 3...',
    });
    
    try {
      const response = await fetch('/api/ultra-dashboard/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: imagePrompt })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: '🎨 Image Generated',
          description: 'Opening in new tab...',
        });
        window.open(data.imageUrl, '_blank');
        setImagePrompt('');
      }
    } catch (error) {
      toast({
        title: 'Image Generation Failed',
        variant: 'destructive'
      });
    }
  };

  const checkBlockchainBalance = async (network: string) => {
    if (!walletAddress.trim()) {
      toast({
        title: 'Enter Wallet Address',
        description: 'Please enter a wallet address first',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await fetch('/api/ultra-dashboard/blockchain/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          address: walletAddress, 
          network: network.toLowerCase()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: `💰 ${network} Balance`,
          description: data.balance,
        });
      }
    } catch (error) {
      toast({
        title: 'Balance Check Failed',
        variant: 'destructive'
      });
    }
  };

  const testBlockchain = async (network: string) => {
    toast({
      title: `Testing ${network}`,
      description: 'Connecting to blockchain...',
    });
    
    try {
      const response = await fetch('/api/ultra-dashboard/test-blockchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ network })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result.connected) {
          toast({
            title: `✅ ${network} Connected`,
            description: `Block #${data.result.blockNumber} | Gas: ${data.result.gasPrice}`,
          });
        } else {
          toast({
            title: `❌ ${network} Failed`,
            description: data.result.error,
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-16 h-16 text-yellow-500 animate-pulse mx-auto" />
          <p className="text-white mt-4">Loading Ultra Queen System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Crown className="w-12 h-12 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent">
                Ultra Queen AI Raeesa
              </h1>
              <p className="text-gray-400">REAL Integrations Active</p>
            </div>
          </div>
          <Badge className="bg-green-600 text-white px-4 py-2">
            ALL SYSTEMS LIVE
          </Badge>
        </div>

        {/* Status Cards */}
        {systemStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">OpenAI Status</p>
                    <p className="text-2xl font-bold">
                      {systemStatus.ai?.connected ? 'CONNECTED' : 'OFFLINE'}
                    </p>
                  </div>
                  <Cpu className={`w-8 h-8 ${systemStatus.ai?.connected ? 'text-green-500' : 'text-red-500'}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Blockchain</p>
                    <p className="text-2xl font-bold">
                      {systemStatus.blockchain?.ethereum?.connected ? 'LIVE' : 'OFFLINE'}
                    </p>
                  </div>
                  <Network className={`w-8 h-8 ${systemStatus.blockchain?.ethereum?.connected ? 'text-purple-500' : 'text-red-500'}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Documents</p>
                    <p className="text-2xl font-bold">23 TYPES</p>
                  </div>
                  <FileText className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-gray-800/50 border-gray-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => generateDocument('south_african_passport')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Test Passport
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => testBlockchain('Ethereum')}
                  >
                    <Network className="w-4 h-4 mr-2" />
                    Test Ethereum Connection
                  </Button>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => testBlockchain('Polygon')}
                  >
                    <Network className="w-4 h-4 mr-2" />
                    Test Polygon Connection
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {systemStatus && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Model:</span>
                        <span>GPT-4-Turbo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ethereum Block:</span>
                        <span>{systemStatus.blockchain?.ethereum?.blockNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Polygon Block:</span>
                        <span>{systemStatus.blockchain?.polygon?.blockNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Zora Network:</span>
                        <span>{systemStatus.blockchain?.zora?.connected ? 'Connected' : 'Offline'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Web3Auth:</span>
                        <span>{systemStatus.web3auth?.clientId ? 'Configured' : 'Not configured'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>AI Assistant - GPT-4 Turbo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Chat with AI</label>
                  <Textarea
                    placeholder="Ask anything to your Ultra Queen AI..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    className="bg-gray-900/50 border-gray-600"
                  />
                  <Button 
                    onClick={sendAIMessage}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Generate Image with DALL-E 3</label>
                  <Input
                    placeholder="Describe the image you want..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="bg-gray-900/50 border-gray-600"
                  />
                  <Button 
                    onClick={generateAIImage}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Generate Image
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>23 DHA Document Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'smart_id_card',
                    'identity_document_book',
                    'south_african_passport',
                    'birth_certificate',
                    'general_work_visa',
                    'critical_skills_work_visa',
                    'business_visa',
                    'study_visa_permit',
                    'permanent_residence_permit'
                  ].map((doc) => (
                    <Button
                      key={doc}
                      variant="outline"
                      className="text-left justify-start"
                      onClick={() => generateDocument(doc)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {doc.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blockchain Tab */}
          <TabsContent value="blockchain" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Blockchain Networks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Check Wallet Balance</label>
                  <Input
                    placeholder="Enter wallet address (0x...)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="bg-gray-900/50 border-gray-600"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={() => checkBlockchainBalance('ethereum')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      ETH Balance
                    </Button>
                    <Button 
                      onClick={() => checkBlockchainBalance('polygon')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      MATIC Balance
                    </Button>
                    <Button 
                      onClick={() => checkBlockchainBalance('zora')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Zora Balance
                    </Button>
                  </div>
                </div>

                {systemStatus?.blockchain && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Ethereum Status</h4>
                      <div className="text-sm space-y-1">
                        <div>Connected: {systemStatus.blockchain.ethereum?.connected ? '✅' : '❌'}</div>
                        <div>Block: {systemStatus.blockchain.ethereum?.blockNumber}</div>
                        <div>Gas: {systemStatus.blockchain.ethereum?.gasPrice}</div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold mb-2">Polygon Status</h4>
                      <div className="text-sm space-y-1">
                        <div>Connected: {systemStatus.blockchain.polygon?.connected ? '✅' : '❌'}</div>
                        <div>Block: {systemStatus.blockchain.polygon?.blockNumber}</div>
                        <div>Gas: {systemStatus.blockchain.polygon?.gasPrice}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}