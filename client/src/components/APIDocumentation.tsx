import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Shield, Globe, Activity, Zap, Cpu, Database, 
  Cloud, Link, Lock, Search, Filter, ChevronRight,
  CheckCircle, Clock, AlertCircle, Sparkles
} from 'lucide-react';

// Comprehensive API Categories - 40+ Integrated APIs
const API_CATEGORIES = {
  ai: {
    name: "AI & Language Models",
    icon: Brain,
    description: "Advanced AI providers for text, image, and multimodal processing",
    apis: [
      { name: "OpenAI GPT-5", status: "active", features: ["128K context", "Vision", "DALL-E 3", "Whisper"] },
      { name: "Anthropic Claude 3", status: "active", features: ["200K context", "Constitutional AI", "Research"] },
      { name: "Google Gemini Ultra", status: "active", features: ["1M context", "Multimodal", "Video"] },
      { name: "Mistral Large", status: "active", features: ["32K context", "Fast inference", "Fine-tuning"] },
      { name: "Perplexity AI", status: "active", features: ["Real-time search", "Citations", "Fact-check"] },
      { name: "Cohere Command", status: "ready", features: ["Multilingual", "Embeddings", "Rerank"] },
      { name: "Meta Llama 3", status: "ready", features: ["Open source", "70B params", "Code"] },
      { name: "Stability AI", status: "ready", features: ["Image generation", "Video", "3D models"] },
      { name: "Replicate", status: "ready", features: ["Model hosting", "API", "Fine-tuning", "Deploy"] },
      { name: "DeepMind Gemma", status: "ready", features: ["Open models", "2B-7B params", "Research"] }
    ]
  },
  blockchain: {
    name: "Blockchain & Web3",
    icon: Shield,
    description: "Decentralized networks and cryptocurrency integrations",
    apis: [
      { name: "Ethereum", status: "ready", features: ["Smart contracts", "DeFi", "NFTs", "ENS"] },
      { name: "Solana", status: "ready", features: ["High speed", "Low fees", "SPL tokens"] },
      { name: "Polygon", status: "ready", features: ["L2 scaling", "zkEVM", "Gaming"] },
      { name: "Binance Chain", status: "ready", features: ["Trading", "Cross-chain", "BNB"] },
      { name: "Chainlink", status: "ready", features: ["Oracles", "Price feeds", "VRF"] },
      { name: "IPFS", status: "ready", features: ["Decentralized storage", "Content addressing"] }
    ]
  },
  cloud: {
    name: "Cloud Infrastructure",
    icon: Cloud,
    description: "Scalable cloud computing and storage services",
    apis: [
      { name: "AWS", status: "ready", features: ["S3", "Lambda", "EC2", "RDS", "SageMaker"] },
      { name: "Google Cloud", status: "ready", features: ["BigQuery", "Firestore", "Cloud Run"] },
      { name: "Microsoft Azure", status: "ready", features: ["Azure OpenAI", "Functions", "CosmosDB"] },
      { name: "Vercel", status: "ready", features: ["Edge functions", "Serverless", "Analytics"] },
      { name: "Cloudflare", status: "ready", features: ["Workers", "R2", "D1", "CDN"] },
      { name: "Railway", status: "ready", features: ["Auto-deploy", "PostgreSQL", "Redis"] },
      { name: "Render", status: "ready", features: ["Auto-scaling", "Background jobs", "Cron"] }
    ]
  },
  data: {
    name: "Data & Analytics",
    icon: Database,
    description: "Databases, search engines, and analytics platforms",
    apis: [
      { name: "MongoDB Atlas", status: "ready", features: ["NoSQL", "Vector search", "Aggregation"] },
      { name: "PostgreSQL", status: "active", features: ["Relational", "JSONB", "Full-text search"] },
      { name: "Pinecone", status: "ready", features: ["Vector DB", "Semantic search", "ML"] },
      { name: "Elasticsearch", status: "ready", features: ["Full-text", "Analytics", "Logging"] },
      { name: "Redis", status: "ready", features: ["Caching", "Pub/Sub", "Streams"] },
      { name: "Supabase", status: "ready", features: ["Real-time", "Auth", "Storage"] }
    ]
  },
  social: {
    name: "Social & Communication",
    icon: Globe,
    description: "Social media and messaging platform integrations",
    apis: [
      { name: "Twitter/X", status: "ready", features: ["Posts", "Analytics", "Spaces"] },
      { name: "Discord", status: "ready", features: ["Bots", "Voice", "Communities"] },
      { name: "Telegram", status: "ready", features: ["Bots", "Channels", "Payments"] },
      { name: "WhatsApp Business", status: "ready", features: ["Messaging", "Commerce", "Support"] },
      { name: "Twilio", status: "ready", features: ["SMS", "Voice", "Video", "Email"] }
    ]
  },
  finance: {
    name: "Finance & Payments",
    icon: Zap,
    description: "Payment processing and financial data services",
    apis: [
      { name: "Stripe", status: "ready", features: ["Payments", "Subscriptions", "Banking"] },
      { name: "PayPal", status: "ready", features: ["Checkout", "Payouts", "Invoicing"] },
      { name: "Plaid", status: "ready", features: ["Bank connections", "Transactions", "Auth"] },
      { name: "Coinbase", status: "ready", features: ["Crypto trading", "Wallets", "Commerce"] },
      { name: "Alpha Vantage", status: "ready", features: ["Stock data", "Forex", "Indicators"] }
    ]
  },
  government: {
    name: "Government & Compliance",
    icon: Lock,
    description: "Official government services and compliance APIs",
    apis: [
      { name: "DHA Services", status: "active", features: ["NPR", "ABIS", "Biometrics", "Documents"] },
      { name: "SARS", status: "ready", features: ["Tax filing", "eFiling", "Compliance"] },
      { name: "CIPC", status: "ready", features: ["Company registration", "Directors", "Returns"] }
    ]
  }
};

export default function APIDocumentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedApi, setExpandedApi] = useState<string | null>(null);

  // Calculate total API count
  const totalApis = Object.values(API_CATEGORIES).reduce(
    (total, category) => total + category.apis.length, 
    0
  );

  // Filter APIs based on search and category
  const filteredCategories = Object.entries(API_CATEGORIES).reduce((acc, [key, category]) => {
    // Skip if category is selected and doesn't match
    if (selectedCategory && selectedCategory !== key) {
      return acc;
    }
    
    const filteredApis = category.apis.filter(api => 
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    if (filteredApis.length > 0 || searchQuery === '') {
      acc[key as keyof typeof API_CATEGORIES] = { ...category, apis: searchQuery === '' ? category.apis : filteredApis };
    }
    return acc;
  }, {} as typeof API_CATEGORIES);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ready':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'ready':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[var(--queen-gold)] to-[var(--queen-cyan)] bg-clip-text text-transparent">
          Ultra Queen AI Integration Hub
        </h2>
        <p className="text-[var(--queen-gold-light)]">
          {totalApis}+ APIs integrated across 7 categories
        </p>
        <Badge className="bg-gradient-to-r from-[var(--queen-cyan)] to-[var(--queen-teal)] text-black">
          "Only Limit Is Me" Protocol Active
        </Badge>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--queen-gold-light)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search APIs, features, or capabilities..."
              className="pl-10 bg-black/40 border-[var(--queen-gold)]/30 text-[var(--queen-gold-light)] placeholder:text-[var(--queen-gold-light)]/50"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery('');
            }}
            className="border-[var(--queen-gold)]/30 text-[var(--queen-gold)]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
        
        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-gradient-to-r from-[var(--queen-blue-green)] to-[var(--queen-teal)]" : "border-[var(--queen-gold)]/30 text-[var(--queen-gold)]"}
          >
            All Categories
          </Button>
          {Object.entries(API_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={selectedCategory === key ? "default" : "outline"}
                onClick={() => setSelectedCategory(key)}
                className={selectedCategory === key ? "bg-gradient-to-r from-[var(--queen-blue-green)] to-[var(--queen-teal)]" : "border-[var(--queen-gold)]/30 text-[var(--queen-gold)]"}
              >
                <Icon className="h-3 w-3 mr-1" />
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="bg-black/40 border border-[var(--queen-gold)]/30">
          <TabsTrigger value="grid" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--queen-blue-green)] data-[state=active]:to-[var(--queen-teal)]">
            Grid View
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--queen-blue-green)] data-[state=active]:to-[var(--queen-teal)]">
            List View
          </TabsTrigger>
        </TabsList>

        {/* Grid View */}
        <TabsContent value="grid" className="space-y-6">
          {Object.entries(filteredCategories).map(([key, category]) => (
            <Card key={key} className="bg-black/40 backdrop-blur-md border-[var(--queen-gold)]/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--queen-blue-green)] to-[var(--queen-teal)]">
                    <category.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[var(--queen-gold)]">{category.name}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {category.apis.length} APIs
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[var(--queen-gold-light)]">
                  {category.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.apis.map((api, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-black/60 border border-[var(--queen-gold)]/20 hover:border-[var(--queen-cyan)]/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedApi(expandedApi === `${key}-${idx}` ? null : `${key}-${idx}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(api.status)}
                          <span className="text-sm font-medium text-[var(--queen-gold)]">
                            {api.name}
                          </span>
                        </div>
                        <Badge className={getStatusColor(api.status)} variant="outline">
                          {api.status}
                        </Badge>
                      </div>
                      {expandedApi === `${key}-${idx}` && (
                        <div className="mt-2 space-y-1">
                          {api.features.map((feature, fIdx) => (
                            <div key={fIdx} className="flex items-center gap-2 text-xs text-[var(--queen-gold-light)]">
                              <ChevronRight className="h-3 w-3 text-[var(--queen-cyan)]" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-2">
              {Object.entries(filteredCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="space-y-2">
                  <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm py-2">
                    <h3 className="text-[var(--queen-gold)] font-semibold flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.name}
                    </h3>
                  </div>
                  {category.apis.map((api, idx) => (
                    <Card key={idx} className="bg-black/40 border-[var(--queen-gold)]/20">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(api.status)}
                            <div>
                              <p className="text-sm font-medium text-[var(--queen-gold)]">
                                {api.name}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {api.features.slice(0, 3).map((feature, fIdx) => (
                                  <Badge 
                                    key={fIdx} 
                                    variant="outline" 
                                    className="text-xs border-[var(--queen-cyan)]/30 text-[var(--queen-cyan)]"
                                  >
                                    {feature}
                                  </Badge>
                                ))}
                                {api.features.length > 3 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs border-[var(--queen-gold)]/30 text-[var(--queen-gold)]"
                                  >
                                    +{api.features.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(api.status)} variant="outline">
                            {api.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-black/40 border-[var(--queen-gold)]/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--queen-gold)]">
              {Object.values(filteredCategories).reduce((acc, cat) => 
                acc + cat.apis.filter(a => a.status === 'active').length, 0
              )}
            </div>
            <p className="text-xs text-[var(--queen-gold-light)]">Active APIs</p>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-[var(--queen-gold)]/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--queen-cyan)]">
              {Object.values(filteredCategories).reduce((acc, cat) => 
                acc + cat.apis.filter(a => a.status === 'ready').length, 0
              )}
            </div>
            <p className="text-xs text-[var(--queen-gold-light)]">Ready to Deploy</p>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-[var(--queen-gold)]/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--queen-teal)]">
              {Object.keys(filteredCategories).length}
            </div>
            <p className="text-xs text-[var(--queen-gold-light)]">Categories</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}