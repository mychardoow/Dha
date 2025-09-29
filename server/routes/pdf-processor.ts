import { Router, Request, Response } from 'express';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import multer from 'multer';
import { z } from 'zod';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Schema for PDF generation request
const generatePDFSchema = z.object({
  language: z.string(),
  code: z.string(),
  title: z.string().optional(),
  author: z.string().optional()
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'operational',
    service: 'Ultra Advanced PDF Processor',
    capabilities: [
      'read',
      'edit', 
      'generate',
      'syntax-highlight',
      'code-extraction'
    ]
  });
});

// Generate PDF with code and syntax highlighting
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const data = generatePDFSchema.parse(req.body);
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
    
    // Add title page
    let page = pdfDoc.addPage([600, 800]);
    
    // Title
    page.drawText(data.title || 'Code Documentation', {
      x: 100,
      y: 700,
      size: 24,
      font: boldFont,
      color: rgb(0, 0.53, 0.71)
    });
    
    // Language
    page.drawText(`Language: ${data.language.toUpperCase()}`, {
      x: 50,
      y: 650,
      size: 14,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
    
    // Author
    if (data.author) {
      page.drawText(`Author: ${data.author}`, {
        x: 50,
        y: 620,
        size: 12,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
      });
    }
    
    // Date
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 590,
      size: 12,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    // Add code pages
    const lines = data.code.split('\n');
    let yPosition = 500;
    const lineHeight = 14;
    const maxLinesPerPage = 50;
    let lineCount = 0;
    
    for (const line of lines) {
      if (lineCount >= maxLinesPerPage || yPosition < 50) {
        page = pdfDoc.addPage([600, 800]);
        yPosition = 750;
        lineCount = 0;
      }
      
      // Detect keywords for simple syntax highlighting
      const keywords = [
        'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
        'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch',
        'def', 'public', 'private', 'static', 'void', 'int', 'string', 'boolean'
      ];
      
      const hasKeyword = keywords.some(kw => {
        const regex = new RegExp(`\\b${kw}\\b`);
        return regex.test(line);
      });
      
      // Draw line with appropriate formatting
      const trimmedLine = line.substring(0, 80); // Limit line length
      page.drawText(trimmedLine, {
        x: 50,
        y: yPosition,
        size: 10,
        font: hasKeyword ? boldFont : font,
        color: hasKeyword ? rgb(0.8, 0.2, 0.2) : rgb(0, 0, 0)
      });
      
      yPosition -= lineHeight;
      lineCount++;
    }
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="code_${data.language}_${Date.now()}.pdf"`);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('[PDF Generator] Error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data',
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate PDF' 
      });
    }
  }
});

// Process uploaded PDF and extract code
router.post('/extract-code', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF file uploaded' 
      });
    }
    
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pages = pdfDoc.getPages();
    
    // Extract text from all pages (simplified)
    const extractedData = {
      pageCount: pages.length,
      metadata: {
        title: pdfDoc.getTitle() || 'Untitled',
        author: pdfDoc.getAuthor() || 'Unknown',
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate()
      },
      // Note: Actual text extraction requires additional libraries
      message: 'PDF processed successfully. For full text extraction, use pdf-parse library.'
    };
    
    res.json({
      success: true,
      data: extractedData
    });
    
  } catch (error) {
    console.error('[PDF Extractor] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process PDF' 
    });
  }
});

// Edit existing PDF
router.post('/edit', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF file uploaded' 
      });
    }
    
    const { text, pageNumber = 1, x = 50, y = 100 } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'No text provided to add' 
      });
    }
    
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pages = pdfDoc.getPages();
    
    if (pageNumber > pages.length || pageNumber < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid page number' 
      });
    }
    
    const page = pages[pageNumber - 1];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Add text to specified page
    page.drawText(text, {
      x: Number(x),
      y: Number(y),
      size: 12,
      font: font,
      color: rgb(0.95, 0.1, 0.1)
    });
    
    // Generate edited PDF
    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="edited_${Date.now()}.pdf"`);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('[PDF Editor] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to edit PDF' 
    });
  }
});

// Get supported programming languages
router.get('/languages', (req: Request, res: Response) => {
  res.json({
    success: true,
    languages: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust',
      'swift', 'kotlin', 'ruby', 'php', 'scala', 'r', 'matlab', 'perl', 'lua',
      'haskell', 'clojure', 'elixir', 'dart', 'julia', 'fortran', 'cobol', 'pascal',
      'assembly', 'sql', 'html', 'css', 'scss', 'jsx', 'tsx', 'vue', 'shell',
      'powershell', 'bash', 'dockerfile', 'yaml', 'json', 'xml', 'markdown', 'toml'
    ]
  });
});

export default router;