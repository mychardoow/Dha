import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Upload, Download, Code, Edit, Eye, Sparkles, Save, FileCode, Highlighter, Book, FileJson } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface CodeBlock {
  language: string;
  code: string;
  startLine: number;
  endLine: number;
  page: number;
}

export default function UltraAdvancedPDF() {
  const [activeTab, setActiveTab] = useState('reader');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [generatedCode, setGeneratedCode] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Comprehensive list of programming languages
  const programmingLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust',
    'swift', 'kotlin', 'ruby', 'php', 'scala', 'r', 'matlab', 'perl', 'lua',
    'haskell', 'clojure', 'elixir', 'dart', 'julia', 'fortran', 'cobol', 'pascal',
    'assembly', 'sql', 'html', 'css', 'scss', 'jsx', 'tsx', 'vue', 'shell',
    'powershell', 'bash', 'dockerfile', 'yaml', 'json', 'xml', 'markdown', 'toml'
  ];

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      extractTextFromPDF(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload a PDF file',
        variant: 'destructive'
      });
    }
  };

  // Extract text and detect code blocks from PDF
  const extractTextFromPDF = async (file: File) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      setTotalPages(pdf.numPages);
      
      let fullText = '';
      const detectedCodeBlocks: CodeBlock[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `\n--- Page ${pageNum} ---\n${pageText}`;
        
        // Detect code patterns
        const codePatterns = [
          /```(\w+)?\n([\s\S]*?)```/gm,  // Markdown code blocks
          /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/gm,  // Functions
          /class\s+\w+\s*{[\s\S]*?}/gm,  // Classes
          /import\s+.*from\s+['"].*['"]/gm,  // Imports
          /const\s+\w+\s*=\s*[\s\S]*?;/gm,  // Variables
          /def\s+\w+\s*\([^)]*\):/gm,  // Python functions
          /public\s+class\s+\w+/gm,  // Java classes
        ];
        
        codePatterns.forEach(pattern => {
          const matches = pageText.matchAll(pattern);
          for (const match of matches) {
            const detectedLang = detectLanguage(match[0]);
            detectedCodeBlocks.push({
              language: detectedLang,
              code: match[0],
              startLine: 0,
              endLine: 0,
              page: pageNum
            });
          }
        });
      }
      
      setPdfText(fullText);
      setCodeBlocks(detectedCodeBlocks);
      
      // Render first page
      if (pdf.numPages > 0) {
        renderPDFPage(pdf, 1);
      }
      
      toast({
        title: 'PDF Processed',
        description: `Extracted ${pdf.numPages} pages and found ${detectedCodeBlocks.length} code blocks`,
      });
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract text from PDF',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Detect programming language from code snippet
  const detectLanguage = (code: string): string => {
    const patterns = {
      javascript: /\b(const|let|var|function|console\.log|require|import)\b/,
      typescript: /\b(interface|type|enum|namespace|declare)\b/,
      python: /\b(def|import|from|class|if __name__|print)\b/,
      java: /\b(public|private|class|interface|extends|implements|static void)\b/,
      cpp: /\b(#include|iostream|namespace|cout|cin|nullptr)\b/,
      csharp: /\b(using|namespace|public|private|class|static void Main)\b/,
      go: /\b(package|func|import|fmt\.Print|defer|chan)\b/,
      rust: /\b(fn|let mut|impl|pub|use|match|Result)\b/,
      sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i,
      html: /<\/?[a-z][\s\S]*>/i,
      css: /[.#]?\w+\s*{[\s\S]*?}/,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(code)) {
        return lang;
      }
    }
    
    return 'plaintext';
  };

  // Render PDF page on canvas
  const renderPDFPage = async (pdf: any, pageNumber: number): Promise<void> => {
    if (!canvasRef.current) return;
    
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  // Generate PDF with code and syntax highlighting
  const generatePDFWithCode = async () => {
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Courier);
      const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
      
      // Add title page
      let page = pdfDoc.addPage([600, 800]);
      page.drawText('Ultra Advanced Code PDF', {
        x: 150,
        y: 700,
        size: 24,
        font: boldFont,
        color: rgb(0, 0.53, 0.71)
      });
      
      page.drawText(`Language: ${selectedLanguage.toUpperCase()}`, {
        x: 50,
        y: 650,
        size: 14,
        font: font,
        color: rgb(0.2, 0.2, 0.2)
      });
      
      page.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: 50,
        y: 620,
        size: 12,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
      });
      
      // Add code with syntax-like formatting
      const lines = generatedCode.split('\n');
      let yPosition = 550;
      const lineHeight = 14;
      
      for (const line of lines) {
        if (yPosition < 50) {
          page = pdfDoc.addPage([600, 800]);
          yPosition = 750;
        }
        
        // Simple syntax coloring based on keywords
        const keywords = /\b(function|const|let|var|if|else|for|while|return|class|import|export|async|await)\b/g;
        const isKeyword = keywords.test(line);
        
        page.drawText(line.substring(0, 80), {  // Limit line length
          x: 50,
          y: yPosition,
          size: 10,
          font: isKeyword ? boldFont : font,
          color: isKeyword ? rgb(0.8, 0.2, 0.2) : rgb(0, 0, 0)
        });
        
        yPosition -= lineHeight;
      }
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code_${selectedLanguage}_${Date.now()}.pdf`;
      a.click();
      
      toast({
        title: 'PDF Generated',
        description: 'Your code PDF has been downloaded',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Edit existing PDF
  const editPDF = async () => {
    if (!pdfFile || !editContent) {
      toast({
        title: 'Missing Content',
        description: 'Please upload a PDF and enter content to add',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      // Add text to the first page
      firstPage.drawText(editContent, {
        x: 50,
        y: 100,
        size: 12,
        font: font,
        color: rgb(0.95, 0.1, 0.1)
      });
      
      // Save edited PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${pdfFile.name}`;
      a.click();
      
      toast({
        title: 'PDF Edited',
        description: 'Your edited PDF has been downloaded',
      });
    } catch (error) {
      console.error('Error editing PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit PDF',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Highlight code syntax
  useEffect(() => {
    hljs.highlightAll();
  }, [codeBlocks, generatedCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-green-900 to-blue-900 p-8">
      <Card className="max-w-7xl mx-auto backdrop-blur-lg bg-black/80 border-gold-500/30">
        <CardHeader className="border-b border-gold-500/20">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-green-400 to-gold-400 bg-clip-text text-transparent flex items-center gap-4">
            <FileCode className="w-10 h-10 text-gold-400" />
            Ultra Advanced PDF System
          </CardTitle>
          <p className="text-gray-400 mt-2">Read, Edit, Generate PDFs with All Programming Languages Support</p>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-gray-900/50">
              <TabsTrigger value="reader" className="data-[state=active]:bg-blue-600">
                <Eye className="w-4 h-4 mr-2" />
                Reader
              </TabsTrigger>
              <TabsTrigger value="editor" className="data-[state=active]:bg-green-600">
                <Edit className="w-4 h-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="generator" className="data-[state=active]:bg-gold-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Generator
              </TabsTrigger>
            </TabsList>

            {/* PDF Reader Tab */}
            <TabsContent value="reader" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pdf-upload" className="text-gray-300">Upload PDF</Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="bg-gray-900/50 border-gray-700"
                    data-testid="input-pdf-upload"
                  />
                </div>

                {pdfFile && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* PDF Viewer */}
                    <Card className="bg-gray-900/50 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-400 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          PDF Viewer - Page {currentPage}/{totalPages}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <canvas ref={canvasRef} className="w-full" data-testid="canvas-pdf-viewer" />
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => {
                              if (currentPage > 1 && pdfUrl) {
                                pdfjsLib.getDocument(pdfUrl).promise.then((pdf: any) => {
                                  renderPDFPage(pdf, currentPage - 1);
                                });
                              }
                            }}
                            disabled={currentPage <= 1}
                            className="bg-blue-600 hover:bg-blue-700"
                            data-testid="button-prev-page"
                          >
                            Previous
                          </Button>
                          <Button
                            onClick={() => {
                              if (currentPage < totalPages && pdfUrl) {
                                pdfjsLib.getDocument(pdfUrl).promise.then((pdf: any) => {
                                  renderPDFPage(pdf, currentPage + 1);
                                });
                              }
                            }}
                            disabled={currentPage >= totalPages}
                            className="bg-blue-600 hover:bg-blue-700"
                            data-testid="button-next-page"
                          >
                            Next
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Extracted Content */}
                    <Card className="bg-gray-900/50 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-400 flex items-center gap-2">
                          <Code className="w-5 h-5" />
                          Extracted Code ({codeBlocks.length} blocks)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px] w-full">
                          {codeBlocks.length > 0 ? (
                            <div className="space-y-4">
                              {codeBlocks.map((block, idx) => (
                                <div key={idx} className="border border-gray-700 rounded p-2">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-gray-400">
                                      Language: {block.language}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      Page {block.page}
                                    </span>
                                  </div>
                                  <pre className="text-xs overflow-x-auto">
                                    <code className={`language-${block.language}`}>
                                      {block.code}
                                    </code>
                                  </pre>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Textarea
                              value={pdfText}
                              readOnly
                              className="h-[400px] bg-gray-800/50 text-gray-300 font-mono text-sm"
                              placeholder="Extracted text will appear here..."
                              data-testid="textarea-extracted-text"
                            />
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PDF Editor Tab */}
            <TabsContent value="editor" className="space-y-4 mt-6">
              <div className="space-y-4">
                {!pdfFile && (
                  <div className="text-center p-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Please upload a PDF file first in the Reader tab</p>
                  </div>
                )}

                {pdfFile && (
                  <>
                    <Card className="bg-gray-900/50 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-400">Edit PDF Content</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="edit-content" className="text-gray-300">Add Text to PDF</Label>
                          <Textarea
                            id="edit-content"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Enter text to add to the PDF..."
                            className="h-32 bg-gray-800/50 text-white"
                            data-testid="textarea-edit-content"
                          />
                        </div>
                        
                        <Button
                          onClick={editPDF}
                          disabled={isProcessing || !editContent}
                          className="w-full bg-green-600 hover:bg-green-700"
                          data-testid="button-save-edit"
                        >
                          {isProcessing ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Edited PDF
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

            {/* PDF Generator Tab */}
            <TabsContent value="generator" className="space-y-4 mt-6">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gold-400">Generate Code PDF</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="language-select" className="text-gray-300">Programming Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="bg-gray-800/50 text-white" data-testid="select-language">
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {programmingLanguages.map(lang => (
                          <SelectItem key={lang} value={lang} className="text-white hover:bg-gray-800">
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="code-input" className="text-gray-300">Code Content</Label>
                    <Textarea
                      id="code-input"
                      value={generatedCode}
                      onChange={(e) => setGeneratedCode(e.target.value)}
                      placeholder={`Enter your ${selectedLanguage} code here...`}
                      className="h-64 bg-gray-800/50 text-white font-mono text-sm"
                      data-testid="textarea-code-input"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // Sample code generator
                        const samples: Record<string, string> = {
                          javascript: `// Ultra Advanced JavaScript
function ultraProcess(data) {
  const result = data.map(item => ({
    ...item,
    processed: true,
    timestamp: new Date()
  }));
  return result;
}

class UltraSystem {
  constructor() {
    this.initialized = true;
  }
  
  async process() {
    console.log('Processing with Ultra Queen AI');
  }
}`,
                          python: `# Ultra Advanced Python
import asyncio
from typing import List, Dict

class UltraProcessor:
    def __init__(self):
        self.active = True
    
    async def process_data(self, data: List[Dict]) -> List[Dict]:
        """Process data with Ultra Queen AI"""
        results = []
        for item in data:
            processed = await self.transform(item)
            results.append(processed)
        return results
    
    async def transform(self, item: Dict) -> Dict:
        # Advanced transformation logic
        return {**item, 'processed': True}`,
                          java: `// Ultra Advanced Java
public class UltraSystem {
    private boolean initialized;
    
    public UltraSystem() {
        this.initialized = true;
    }
    
    public void processData(List<Object> data) {
        data.stream()
            .map(this::transform)
            .forEach(System.out::println);
    }
    
    private Object transform(Object item) {
        // Transform logic here
        return item;
    }
}`
                        };
                        
                        setGeneratedCode(samples[selectedLanguage] || `// ${selectedLanguage} code here`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-sample-code"
                    >
                      <FileJson className="w-4 h-4 mr-2" />
                      Load Sample
                    </Button>
                    
                    <Button
                      onClick={generatePDFWithCode}
                      disabled={isProcessing || !generatedCode}
                      className="flex-1 bg-gradient-to-r from-blue-600 via-green-600 to-gold-600 hover:opacity-90"
                      data-testid="button-generate-pdf"
                    >
                      {isProcessing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Generate PDF
                        </>
                      )}
                    </Button>
                  </div>

                  {generatedCode && (
                    <div className="mt-4">
                      <Label className="text-gray-300 mb-2 block">Preview with Syntax Highlighting</Label>
                      <pre className="bg-gray-900 p-4 rounded overflow-x-auto max-h-64">
                        <code className={`language-${selectedLanguage}`}>
                          {generatedCode}
                        </code>
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}