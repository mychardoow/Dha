import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Send, 
  Bot, 
  Sparkles, 
  Globe, 
  Brain, 
  Cpu, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Crown,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  History,
  Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type AIProvider = 'auto' | 'openai' | 'anthropic' | 'perplexity' | 'mistral' | 'quantum';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: AIProvider;
  metadata?: {
    executionTime?: number;
    confidence?: number;
    model?: string;
    quantumEnhanced?: boolean;
  };
  timestamp: Date;
}

interface ProviderStatus {
  provider: AIProvider;
  status: 'active' | 'error' | 'degraded';
  responseTime?: number;
  errorMessage?: string;
}

export default function UltraQueenAI() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<AIProvider>('auto');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [quantumMode, setQuantumMode] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const speechSynthesis = window.speechSynthesis;

  // Fetch provider status on mount
  useEffect(() => {
    fetchProviderStatus();
    const interval = setInterval(fetchProviderStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProviderStatus = async () => {
    try {
      const response = await fetch('/api/ultra-ai/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProviderStatus(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to fetch provider status:', error);
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/ultra-ai/chat', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.content,
          provider: data.provider,
          metadata: data.metadata,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Voice output if enabled
        if (voiceEnabled && data.content) {
          speak(data.content);
        }

        // Show provider comparison if available
        if (data.providers && data.providers.length > 0) {
          toast({
            title: "Provider Comparison Complete",
            description: `${data.providers.length} providers analyzed`,
            duration: 5000,
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to get response",
          variant: "destructive"
        });
      }
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: "Failed to connect to Ultra Queen AI",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Get previous context (last 3 messages)
    const previousContext = messages
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content);

    chatMutation.mutate({
      message: input,
      provider: provider,
      compareProviders: compareMode,
      quantumMode: quantumMode,
      voiceInput: isRecording,
      previousContext
    });
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleVoiceRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        
        const audioChunks: BlobPart[] = [];
        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.current.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          // In production, send to speech-to-text API
          toast({
            title: "Voice Recording",
            description: "Voice input captured (demo mode)"
          });
        };

        mediaRecorder.current.start();
        setIsRecording(true);
      } catch (error) {
        toast({
          title: "Microphone Error",
          description: "Could not access microphone",
          variant: "destructive"
        });
      }
    } else {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    toast({
      title: "History Cleared",
      description: "Conversation history has been cleared"
    });
  };

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'openai': return <Brain className="h-4 w-4" />;
      case 'anthropic': return <Bot className="h-4 w-4" />;
      case 'perplexity': return <Globe className="h-4 w-4" />;
      case 'mistral': return <Cpu className="h-4 w-4" />;
      case 'quantum': return <Zap className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: AIProvider) => {
    switch (provider) {
      case 'openai': return 'bg-green-500';
      case 'anthropic': return 'bg-orange-500';
      case 'perplexity': return 'bg-blue-500';
      case 'mistral': return 'bg-purple-500';
      case 'quantum': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Ultra Queen AI System
            </h1>
            <Crown className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-gray-400">Multi-Provider Intelligence • Quantum Computing • Unlimited Power</p>
          
          {/* Provider Status Bar */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {providerStatus.map(status => (
              <div key={status.provider} className="flex items-center gap-1">
                {getProviderIcon(status.provider)}
                <span className="text-xs text-gray-400">{status.provider}:</span>
                {status.status === 'active' ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-yellow-500 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selection */}
                <div>
                  <Label htmlFor="provider" className="text-gray-300">AI Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                    <SelectTrigger id="provider" className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Auto (Best for Query)
                        </div>
                      </SelectItem>
                      <SelectItem value="openai">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          OpenAI GPT-4
                        </div>
                      </SelectItem>
                      <SelectItem value="anthropic">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Anthropic Claude
                        </div>
                      </SelectItem>
                      <SelectItem value="perplexity">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Perplexity Search
                        </div>
                      </SelectItem>
                      <SelectItem value="mistral">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          Mistral AI
                        </div>
                      </SelectItem>
                      <SelectItem value="quantum">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Quantum Mode
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compare" className="text-gray-300">Compare Providers</Label>
                    <Switch 
                      id="compare"
                      checked={compareMode}
                      onCheckedChange={setCompareMode}
                      className="data-[state=checked]:bg-yellow-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quantum" className="text-gray-300">Quantum Mode</Label>
                    <Switch 
                      id="quantum"
                      checked={quantumMode}
                      onCheckedChange={setQuantumMode}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice" className="text-gray-300">Voice Output</Label>
                    <Switch 
                      id="voice"
                      checked={voiceEnabled}
                      onCheckedChange={setVoiceEnabled}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={clearHistory}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white"
                    size="sm"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                  
                  <Button 
                    onClick={fetchProviderStatus}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm h-[80vh] flex flex-col">
              <CardHeader className="border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-yellow-500">Chat Interface</CardTitle>
                  <div className="flex items-center gap-2">
                    {quantumMode && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500">
                        Quantum Active
                      </Badge>
                    )}
                    {compareMode && (
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500">
                        Compare Mode
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Sparkles className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-gray-400">Welcome to Ultra Queen AI</p>
                      <p className="text-sm text-gray-500 mt-2">Ask anything. I have unlimited capabilities.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === 'user'
                                ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-100'
                                : 'bg-gray-800 border border-gray-700 text-gray-100'
                            }`}
                          >
                            {message.role === 'assistant' && message.provider && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${getProviderColor(message.provider)}`} />
                                <span className="text-xs text-gray-400">
                                  {message.provider.toUpperCase()}
                                </span>
                                {message.metadata?.confidence && (
                                  <span className="text-xs text-gray-500">
                                    ({(message.metadata.confidence * 100).toFixed(0)}% confidence)
                                  </span>
                                )}
                                {message.metadata?.executionTime && (
                                  <span className="text-xs text-gray-500">
                                    {message.metadata.executionTime}ms
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          </div>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                              <span className="text-gray-400">Processing with {provider === 'auto' ? 'optimal provider' : provider}...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-800">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Ask anything... I have unlimited capabilities"
                        className="min-h-[60px] bg-gray-800 border-gray-700 text-white placeholder-gray-500 pr-20"
                      />
                      <div className="absolute right-2 top-2 flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={toggleVoiceRecording}
                          className={`h-8 w-8 ${isRecording ? 'text-red-500' : 'text-gray-400'} hover:text-white`}
                        >
                          {isRecording ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-400 hover:text-white"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={chatMutation.isPending || !input.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                    >
                      {chatMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}