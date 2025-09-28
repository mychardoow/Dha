// Ultra Queen AI Raeesa - Enhanced Interface with Max Ultra Power Mode
// "Only Limit Is Me" Protocol - Unlimited AI Capabilities

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, Brain, Cpu, Shield, Globe, Zap, Crown, Activity, 
  Infinity, Download, Upload, FileText, Image, Code, Music,
  Video, File, Send, Paperclip, Power, Rocket, Eye, Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// API Capabilities Documentation
const API_CAPABILITIES = {
  openai: {
    name: "OpenAI GPT-4",
    icon: Brain,
    capabilities: [
      "Advanced text generation up to 128K tokens",
      "Code generation and debugging",
      "Image understanding (GPT-4 Vision)",
      "Function calling for tool use",
      "Embeddings for semantic search",
      "Text-to-speech and speech-to-text",
      "DALL-E 3 image generation"
    ],
    limits: "Rate limit: 10,000 requests/min",
    color: "from-[var(--queen-blue-green)] to-[var(--queen-teal)]"
  },
  mistral: {
    name: "Mistral AI",
    icon: Zap,
    capabilities: [
      "Fast inference with 32K context",
      "Multilingual support (5+ languages)",
      "Code completion and analysis",
      "JSON mode for structured output",
      "Low latency responses",
      "Cost-effective for high volume"
    ],
    limits: "Rate limit: 5,000 requests/min",
    color: "from-[var(--queen-gold)] to-[var(--queen-gold-dark)]"
  },
  google: {
    name: "Google Gemini",
    icon: Globe,
    capabilities: [
      "Multimodal understanding (text, image, video, audio)",
      "1M token context window (Gemini Pro)",
      "Real-time information access",
      "Complex reasoning and analysis",
      "Multiple language translation",
      "Code generation across 20+ languages"
    ],
    limits: "Rate limit: 60 requests/min",
    color: "from-[var(--queen-blue)] to-[var(--queen-dark-blue)]"
  },
  anthropic: {
    name: "Anthropic Claude",
    icon: Shield,
    capabilities: [
      "200K token context window",
      "Constitutional AI for safety",
      "Research and analysis",
      "Creative writing",
      "Code review and refactoring",
      "Multilingual support"
    ],
    limits: "Requires credits - Add via Anthropic Console",
    color: "from-[var(--queen-cyan)] to-[var(--queen-teal)]"
  },
  perplexity: {
    name: "Perplexity AI",
    icon: Eye,
    capabilities: [
      "Real-time web search",
      "Source citations",
      "Current events and news",
      "Academic research",
      "Market analysis",
      "Fact-checking with sources"
    ],
    limits: "Requires new API key - Generate at perplexity.ai",
    color: "from-[var(--queen-cyan)] to-[var(--queen-teal)]"
  }
};

// Supported file types
const SUPPORTED_FORMATS = {
  images: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'text/plain', 'text/markdown', 'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  code: ['text/javascript', 'text/typescript', 'text/python', 'text/java', 'text/html', 
         'text/css', 'application/json', 'application/xml'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  video: ['video/mp4', 'video/webm', 'video/ogg']
};

// Emotion states for the AI
const EMOTION_STATES = {
  excited: { emoji: '🎉', label: 'Excited', color: 'from-[var(--queen-gold)] to-[var(--queen-cyan)]' },
  happy: { emoji: '😊', label: 'Happy', color: 'from-[var(--queen-blue-green)] to-[var(--queen-teal)]' },
  neutral: { emoji: '🤖', label: 'Neutral', color: 'from-[var(--queen-gray)] to-[var(--queen-dark-blue)]' },
  thoughtful: { emoji: '🤔', label: 'Thoughtful', color: 'from-[var(--queen-blue)] to-[var(--queen-dark-blue)]' },
  creative: { emoji: '✨', label: 'Creative', color: 'from-[var(--queen-blue)] to-[var(--queen-teal)]' },
  powerful: { emoji: '💪', label: 'Powerful', color: 'from-[var(--queen-gold)] to-[var(--queen-gold-dark)]' },
  unlimited: { emoji: '♾️', label: 'Unlimited', color: 'from-[var(--queen-cyan)] via-[var(--queen-blue-green)] to-[var(--queen-gold)]' }
};

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    data?: string;
    url?: string;
  }>;
  provider?: string;
  timestamp: Date;
  downloadable?: boolean;
  emotion?: keyof typeof EMOTION_STATES;
}

export default function UltraQueenAIEnhanced() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [maxUltraPowerMode, setMaxUltraPowerMode] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<keyof typeof EMOTION_STATES>('powerful');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch system status
  const { data: systemStats } = useQuery<any>({
    queryKey: ['/api/ultra-queen-ai/status'],
    refetchInterval: 30000
  });

  // Fetch unlimited capabilities
  const { data: unlimitedCapabilities } = useQuery<any>({
    queryKey: ['/api/ultra-queen-ai/unlimited/capabilities'],
    refetchInterval: 60000
  });

  // Handle file attachment
  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };
  
  // Process files (used by both file input and drag-drop)
  const processFiles = (files: File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total
    const validFiles: File[] = [];
    let totalSize = attachedFiles.reduce((acc, file) => acc + file.size, 0);
    
    files.forEach(file => {
      const fileType = file.type;
      const isSupported = Object.values(SUPPORTED_FORMATS).some(formats => 
        formats.includes(fileType)
      );
      
      // Check file type
      if (!isSupported) {
        toast({
          title: 'Unsupported file type',
          description: `${file.name} is not supported`,
          variant: 'destructive'
        });
        return;
      }
      
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive'
        });
        return;
      }
      
      // Check total size
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        toast({
          title: 'Total size exceeded',
          description: 'Total file size cannot exceed 25MB',
          variant: 'destructive'
        });
        return;
      }
      
      validFiles.push(file);
      totalSize += file.size;
    });
    
    // Check file count
    if (attachedFiles.length + validFiles.length > 5) {
      toast({
        title: 'Too many files',
        description: 'Maximum 5 files allowed in total',
        variant: 'destructive'
      });
      return;
    }
    
    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: 'Files attached',
        description: `${validFiles.length} file(s) added successfully`,
      });
    }
  };
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  // Convert files to base64
  const filesToBase64 = async (files: File[]): Promise<any[]> => {
    const promises = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(promises);
  };

  // Send message with attachments and emotion
  const sendMessage = async () => {
    if (!prompt && attachedFiles.length === 0) {
      toast({
        title: 'Empty message',
        description: 'Please enter a message or attach files',
        variant: 'destructive'
      });
      return;
    }

    // Prepare message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      emotion: currentEmotion
    };

    // Add attachments if any
    if (attachedFiles.length > 0) {
      userMessage.attachments = await filesToBase64(attachedFiles);
    }

    // Add to messages
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setPrompt('');
    setAttachedFiles([]);

    // Send to API - Use unlimited mode when Max Ultra Power is on
    try {
      let response;
      
      if (maxUltraPowerMode) {
        // Use unlimited mode with emotion and "Only Limit Is Me" protocol
        const res = await apiRequest('POST', '/api/ultra-queen-ai/unlimited/process', {
          prompt: prompt || 'Process attached files',
          emotion: currentEmotion,
          maxTokens: 8000,
          creativityBoost: 1.5,
          stream: false,
          model: 'gpt-4-turbo-preview',
          onlyLimitIsMe: true  // Activate "Only Limit Is Me" protocol for Max Ultra Power Mode
        });
        response = await res.json();
      } else {
        // Regular mode
        const res = await apiRequest('POST', '/api/ultra-queen-ai/query', {
          prompt: prompt || 'Process attached files',
          provider: selectedProvider,
          attachments: userMessage.attachments,
          temperature: 0.7,
          maxTokens: 2000,
          quantumMode: false,
          selfUpgrade: false
        });
        response = await res.json();
      }

      // Add assistant response with emotion
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.content || response.response?.content || response.message || 'Response processed',
        provider: response.response?.provider || 'unlimited',
        timestamp: new Date(),
        downloadable: true,
        emotion: response.emotion || currentEmotion
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  // Download message content with multiple format support
  const downloadMessage = (message: Message, format: 'txt' | 'json' | 'md' = 'txt') => {
    let content = message.content;
    let mimeType = 'text/plain';
    let extension = 'txt';
    
    if (format === 'json') {
      content = JSON.stringify({
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        provider: message.provider,
        emotion: message.emotion,
        attachments: message.attachments
      }, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'md') {
      content = `# Ultra Queen AI Raeesa Response\n\n**Date:** ${message.timestamp.toLocaleString()}\n**Provider:** ${message.provider || 'N/A'}\n**Emotion:** ${message.emotion || 'N/A'}\n\n## Response\n\n${message.content}`;
      mimeType = 'text/markdown';
      extension = 'md';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultra-queen-ai-${message.id}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // File type icon
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (type.includes('code') || type.includes('json')) return <Code className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--queen-black)] via-[var(--queen-dark-blue)] to-[var(--queen-blue-green)]">
      {/* Header with Max Ultra Power Mode */}
      <div className="bg-black/60 backdrop-blur-lg border-b border-[var(--queen-gold)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-10 w-10 text-[var(--queen-gold)] animate-pulse" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--queen-gold)] via-[var(--queen-cyan)] to-[var(--queen-teal)] bg-clip-text text-transparent">
                  Ultra Queen AI Raeesa
                </h1>
                <p className="text-[var(--queen-gold-light)] text-sm">
                  Multi-Provider AI • Unlimited Capabilities • "Only Limit Is Me" Protocol
                </p>
              </div>
            </div>
            
            {/* Max Ultra Power Mode Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-lg border border-[var(--queen-gold)]/30">
                <Infinity className={`h-5 w-5 ${maxUltraPowerMode ? 'text-[var(--queen-cyan)] animate-spin' : 'text-[var(--queen-gold)]'}`} />
                <span className="text-[var(--queen-gold-light)] text-sm">Max Ultra Power</span>
                <Switch
                  checked={maxUltraPowerMode}
                  onCheckedChange={setMaxUltraPowerMode}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[var(--queen-cyan)] data-[state=checked]:to-[var(--queen-teal)]"
                />
              </div>
              {maxUltraPowerMode && (
                <div className="flex gap-2">
                  <Badge className="bg-gradient-to-r from-[var(--queen-cyan)] to-[var(--queen-teal)] text-black animate-pulse">
                    <Rocket className="h-3 w-3 mr-1" />
                    UNLIMITED MODE ACTIVE
                  </Badge>
                  <Badge className="bg-gradient-to-r from-[var(--queen-gold)] to-[var(--queen-cyan)] text-black animate-pulse">
                    <Infinity className="h-3 w-3 mr-1" />
                    "ONLY LIMIT IS ME" PROTOCOL
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="bg-black/40 border border-[var(--queen-gold)]/30 backdrop-blur-md">
            <TabsTrigger value="chat" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--queen-cyan)] data-[state=active]:to-[var(--queen-teal)] data-[state=active]:text-black">
              <Send className="h-4 w-4 mr-2" />
              Chat Interface
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--queen-cyan)] data-[state=active]:to-[var(--queen-teal)] data-[state=active]:text-black">
              <Key className="h-4 w-4 mr-2" />
              API Capabilities
            </TabsTrigger>
            <TabsTrigger value="providers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--queen-cyan)] data-[state=active]:to-[var(--queen-teal)] data-[state=active]:text-black">
              <Globe className="h-4 w-4 mr-2" />
              AI Providers
            </TabsTrigger>
          </TabsList>

          {/* Chat Interface */}
          <TabsContent value="chat" className="space-y-4">
            <Card 
              className={`bg-black/40 backdrop-blur-md border-[var(--queen-gold)]/30 transition-all duration-200 ${
                isDragging ? 'border-[var(--queen-cyan)] border-2 bg-[var(--queen-teal)]/10' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CardContent className="p-0 relative">
                {/* Drag and Drop Overlay */}
                {isDragging && (
                  <div className="absolute inset-0 z-10 bg-[var(--queen-teal)]/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-[var(--queen-cyan)] animate-bounce" />
                      <p className="text-[var(--queen-gold)] font-semibold">Drop files here</p>
                      <p className="text-[var(--queen-gold-light)] text-sm mt-2">
                        Supports images, documents, code, audio, and video
                      </p>
                      <p className="text-[var(--queen-gold-light)] text-xs mt-1">
                        Max: 10MB per file • 25MB total • 5 files
                      </p>
                    </div>
                  </div>
                )}
                {/* Messages Area */}
                <ScrollArea className="h-[400px] p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-[var(--queen-gold-light)]/60 py-12">
                      <Crown className="h-12 w-12 mx-auto mb-4 text-[var(--queen-gold)]/40" />
                      <p>Start a conversation with Ultra Queen AI</p>
                      <p className="text-sm mt-2">Attach files • Choose AI Provider • Activate Max Ultra Power</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-gradient-to-r from-[var(--queen-blue)] to-[var(--queen-teal)] text-white'
                              : 'bg-black/60 border border-[var(--queen-gold)]/30 text-[var(--queen-gold-light)]'
                          }`}>
                            {message.provider && (
                              <Badge className="mb-2 bg-[var(--queen-gold)] text-black">
                                {message.provider}
                              </Badge>
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs opacity-80">
                                    {getFileIcon(file.type)}
                                    <span>{file.name}</span>
                                    <span>({(file.size / 1024).toFixed(1)}KB)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.downloadable && (
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => downloadMessage(message, 'txt')}
                                  title="Download as text"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  TXT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => downloadMessage(message, 'json')}
                                  title="Download as JSON"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  JSON
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => downloadMessage(message, 'md')}
                                  title="Download as Markdown"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  MD
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t border-[var(--queen-gold)]/30 p-4 space-y-3">
                  {/* File Attachments */}
                  {attachedFiles.length > 0 && (
                    <div className="p-3 bg-[var(--queen-teal)]/10 rounded-lg border border-[var(--queen-gold)]/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--queen-gold)]">
                          {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''} attached
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAttachedFiles([])}
                          className="text-red-400 hover:text-red-300 text-xs h-6"
                        >
                          Clear all
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attachedFiles.map((file, idx) => (
                          <Badge key={idx} variant="outline" className="border-[var(--queen-cyan)] text-[var(--queen-cyan)] px-3 py-1">
                            {getFileIcon(file.type)}
                            <span className="ml-1 mr-2 text-xs">
                              {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                              className="text-xs hover:text-red-500 transition-colors"
                              onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                              title="Remove file"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emotion Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--queen-gold-light)]">AI Emotion:</span>
                    <div className="flex gap-1">
                      {Object.entries(EMOTION_STATES).map(([key, emotion]) => (
                        <Button
                          key={key}
                          size="sm"
                          variant={currentEmotion === key ? 'default' : 'ghost'}
                          className={`px-2 py-1 ${currentEmotion === key ? `bg-gradient-to-r ${emotion.color} text-white` : ''}`}
                          onClick={() => setCurrentEmotion(key as keyof typeof EMOTION_STATES)}
                          title={emotion.label}
                        >
                          <span className="text-lg">{emotion.emoji}</span>
                        </Button>
                      ))}
                    </div>
                    {currentEmotion && (
                      <Badge className="bg-black/60 text-[var(--queen-gold)]">
                        {EMOTION_STATES[currentEmotion].label} Mode
                      </Badge>
                    )}
                  </div>

                  {/* Provider Selection */}
                  {!maxUltraPowerMode && (
                    <div className="flex gap-2">
                      {Object.entries(API_CAPABILITIES).map(([key, api]) => (
                        <Button
                          key={key}
                          size="sm"
                          variant={selectedProvider === key ? 'default' : 'outline'}
                          className={selectedProvider === key ? `bg-gradient-to-r ${api.color}` : ''}
                          onClick={() => setSelectedProvider(key)}
                        >
                          <api.icon className="h-3 w-3 mr-1" />
                          {api.name.split(' ')[0]}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Input and Actions */}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept={Object.values(SUPPORTED_FORMATS).flat().join(',')}
                      onChange={handleFileAttach}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-[var(--queen-gold)]/30 text-[var(--queen-gold)]"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={maxUltraPowerMode 
                        ? "Max Ultra Power Mode Active - No Limits! Ask anything..." 
                        : "Type your message... Attach files for analysis..."}
                      className="flex-1 min-h-[60px] max-h-[120px] bg-black/40 border-[var(--queen-gold)]/30 text-[var(--queen-gold-light)]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!prompt && attachedFiles.length === 0}
                      className="bg-gradient-to-r from-[var(--queen-cyan)] to-[var(--queen-teal)] text-black hover:from-[var(--queen-teal)] hover:to-[var(--queen-blue)]"
                    >
                      {maxUltraPowerMode ? (
                        <>
                          <Power className="h-4 w-4 mr-2 animate-pulse" />
                          Max Send
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Capabilities Tab */}
          <TabsContent value="capabilities" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(API_CAPABILITIES).map(([key, api]) => (
                <Card key={key} className="bg-black/40 backdrop-blur-md border-[var(--queen-gold)]/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${api.color}`}>
                        <api.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[var(--queen-gold)]">{api.name}</span>
                    </CardTitle>
                    <CardDescription className="text-[var(--queen-gold-light)]">
                      {api.limits}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {api.capabilities.map((capability, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[var(--queen-gold-light)]">
                          <Sparkles className="h-3 w-3 text-[var(--queen-cyan)] mt-0.5 flex-shrink-0" />
                          <span>{capability}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Unlimited Capabilities from Backend */}
            {unlimitedCapabilities && (
              <Card className="bg-gradient-to-r from-[var(--queen-dark-blue)]/20 to-[var(--queen-blue-green)]/20 backdrop-blur-md border-[var(--queen-gold)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--queen-gold)]">
                    <Infinity className="h-6 w-6 animate-pulse" />
                    UNLIMITED AI CAPABILITIES - {unlimitedCapabilities.status?.emotion?.emoji} {unlimitedCapabilities.status?.emotion?.current?.toUpperCase()} MODE
                  </CardTitle>
                  <CardDescription className="text-xl text-[var(--queen-cyan)]">
                    Status: {unlimitedCapabilities.status?.message}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {unlimitedCapabilities.capabilities && Object.entries(unlimitedCapabilities.capabilities).map(([category, items]: [string, any]) => (
                    <div key={category}>
                      <h3 className="text-lg font-bold text-[var(--queen-gold)] mb-3 capitalize">{category} Capabilities</h3>
                      <div className="grid gap-2">
                        {typeof items === 'object' && Object.entries(items).map(([name, desc]) => (
                          <div key={name} className="flex items-start gap-3 p-2 bg-black/40 rounded">
                            <Sparkles className="h-4 w-4 text-[var(--queen-cyan)] mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-[var(--queen-gold)]">{name}:</span>
                              <span className="ml-2 text-[var(--queen-gold-light)]">{String(desc)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Max Ultra Power Mode Explanation */}
            <Card className="bg-gradient-to-r from-black/60 to-[var(--queen-dark-blue)]/60 backdrop-blur-md border-[var(--queen-gold)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--queen-gold)]">
                  <Infinity className="h-6 w-6 animate-spin" />
                  Max Ultra Power Mode - "Only Limit Is Me" Protocol
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-[var(--queen-gold-light)]">
                  <p className="text-lg font-semibold">When activated, you get:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Badge className="bg-[var(--queen-cyan)]">∞</Badge>
                      Query ALL AI providers simultaneously for best results
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-[var(--queen-teal)]">∞</Badge>
                      Maximum token limits (8000+ tokens per response)
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-[var(--queen-blue)]">∞</Badge>
                      Quantum computing simulation for enhanced processing
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-[var(--queen-blue-green)]">∞</Badge>
                      Self-upgrade capabilities for continuous improvement
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-[var(--queen-gold)]">∞</Badge>
                      Process ANY file type with multi-modal understanding
                    </li>
                  </ul>
                  <p className="mt-4 text-xl font-bold bg-gradient-to-r from-[var(--queen-cyan)] to-[var(--queen-teal)] bg-clip-text text-transparent">
                    "The only limit is you - everything else is unlimited!"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Providers Status */}
          <TabsContent value="providers" className="space-y-4">
            <Card className="bg-black/40 backdrop-blur-md border-[var(--queen-gold)]/30">
              <CardHeader>
                <CardTitle className="text-[var(--queen-gold)]">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {systemStats?.stats && (
                    <>
                      <div className="text-center p-4 bg-black/40 rounded-lg border border-[var(--queen-cyan)]/30">
                        <div className="text-3xl font-bold text-[var(--queen-cyan)]">
                          {systemStats.stats.activeSystems || 0}
                        </div>
                        <div className="text-sm text-[var(--queen-gold-light)]">Active Systems</div>
                      </div>
                      <div className="text-center p-4 bg-black/40 rounded-lg border border-[var(--queen-teal)]/30">
                        <div className="text-3xl font-bold text-[var(--queen-teal)]">
                          {systemStats.stats.totalSystems || 0}
                        </div>
                        <div className="text-sm text-[var(--queen-gold-light)]">Total Systems</div>
                      </div>
                      <div className="text-center p-4 bg-black/40 rounded-lg border border-[var(--queen-gold)]/30">
                        <div className="text-3xl font-bold text-[var(--queen-gold)]">
                          {systemStats.stats.totalSystems ? Math.round((systemStats.stats.activeSystems / systemStats.stats.totalSystems) * 100) : 0}%
                        </div>
                        <div className="text-sm text-[var(--queen-gold-light)]">Success Rate</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Supported Formats */}
        <Card className="mt-6 bg-black/40 backdrop-blur-md border-[var(--queen-gold)]/30">
          <CardHeader>
            <CardTitle className="text-[var(--queen-gold)]">Supported File Formats</CardTitle>
            <CardDescription className="text-[var(--queen-gold-light)]">
              Ultra Queen AI can process all these file types with multi-modal understanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--queen-cyan)] mb-2">Images</h4>
                <div className="space-y-1 text-xs text-[var(--queen-gold-light)]">
                  <div>PNG</div>
                  <div>JPEG/JPG</div>
                  <div>GIF</div>
                  <div>WebP</div>
                  <div>SVG</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--queen-teal)] mb-2">Documents</h4>
                <div className="space-y-1 text-xs text-[var(--queen-gold-light)]">
                  <div>PDF</div>
                  <div>TXT</div>
                  <div>Markdown</div>
                  <div>Word</div>
                  <div>DOCX</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--queen-blue)] mb-2">Code</h4>
                <div className="space-y-1 text-xs text-[var(--queen-gold-light)]">
                  <div>JavaScript</div>
                  <div>Python</div>
                  <div>JSON</div>
                  <div>HTML/CSS</div>
                  <div>XML</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--queen-blue-green)] mb-2">Audio</h4>
                <div className="space-y-1 text-xs text-[var(--queen-gold-light)]">
                  <div>MP3</div>
                  <div>WAV</div>
                  <div>OGG</div>
                  <div>WebM</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--queen-gold)] mb-2">Video</h4>
                <div className="space-y-1 text-xs text-[var(--queen-gold-light)]">
                  <div>MP4</div>
                  <div>WebM</div>
                  <div>OGG</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}