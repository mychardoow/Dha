// AI Vision Processing API Routes
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { aiVisionProcessor, VISION_COMMAND } from '../services/ai-vision-processor';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Vision command schema
const visionCommandSchema = z.object({
  command: z.string(),
  enhancementLevel: z.number().min(1).max(10).optional(),
  outputFormat: z.enum(['jpeg', 'png', 'webp']).optional()
});

// Process image with natural language command
router.post('/process', upload.single('image'), authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required (e.g., "make the picture clear", "dissect the image")'
      });
    }

    // Process image with AI
    const result = await aiVisionProcessor.processNaturalCommand(command, req.file.buffer);

    // Return processed data
    res.json({
      success: true,
      command,
      analysis: {
        description: result.description,
        properties: result.properties,
        objects: result.objects,
        text: result.text,
        colors: result.colors,
        faces: result.faces,
        patterns: result.patterns,
        metadata: result.metadata,
        enhancements: result.enhancements,
        anomalies: result.anomalies,
        tags: result.tags
      },
      processedImage: result.processedImage ? result.processedImage.toString('base64') : null
    });
  } catch (error) {
    console.error('[AI Vision] Processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image'
    });
  }
});

// Process PDF page with AI vision
router.post('/pdf-page', upload.single('pdf'), authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided'
      });
    }

    const { command, pageNumber = 1 } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    // Process PDF page with AI vision
    const result = await aiVisionProcessor.processPDFPage(req.file.buffer, pageNumber, command);

    res.json({
      success: true,
      command,
      pageNumber,
      analysis: result
    });
  } catch (error) {
    console.error('[AI Vision] PDF processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process PDF page'
    });
  }
});

// Get available vision commands
router.get('/commands', (req: Request, res: Response) => {
  res.json({
    success: true,
    commands: Object.values(VISION_COMMAND),
    examples: [
      'Make the picture clear',
      'Enhance image clarity',
      'Dissect the image and distinguish all properties',
      'Extract all text from the image',
      'Detect and identify all objects',
      'Analyze the color palette',
      'Identify faces and emotions',
      'Upscale the resolution',
      'Remove the background',
      'Find patterns in the image',
      'Extract metadata and EXIF data',
      'Detect any anomalies or issues'
    ]
  });
});

// Batch process multiple images
router.post('/batch', upload.array('images', 10), authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided'
      });
    }

    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    // Process all images
    const results = await Promise.all(
      req.files.map(file => 
        aiVisionProcessor.processNaturalCommand(command, file.buffer)
      )
    );

    res.json({
      success: true,
      totalProcessed: results.length,
      results: results.map(r => ({
        description: r.description,
        properties: r.properties,
        tags: r.tags,
        hasProcessedImage: !!r.processedImage
      }))
    });
  } catch (error) {
    console.error('[AI Vision] Batch processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch processing failed'
    });
  }
});

// Compare two images
router.post('/compare', upload.array('images', 2), authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Exactly 2 images are required for comparison'
      });
    }

    // Process both images
    const [image1, image2] = await Promise.all([
      aiVisionProcessor.processImage(VISION_COMMAND.DISSECT_IMAGE, req.files[0].buffer),
      aiVisionProcessor.processImage(VISION_COMMAND.DISSECT_IMAGE, req.files[1].buffer)
    ]);

    // Compare results
    const comparison = {
      sizeDifference: Math.abs((image1.properties.fileSize - image2.properties.fileSize) / image1.properties.fileSize * 100),
      dimensionMatch: image1.properties.width === image2.properties.width && image1.properties.height === image2.properties.height,
      formatMatch: image1.properties.format === image2.properties.format,
      commonObjects: image1.objects?.filter(o1 => 
        image2.objects?.some(o2 => o2.label === o1.label)
      ),
      commonColors: image1.colors?.filter(c1 => 
        image2.colors?.some(c2 => c2.hex === c1.hex)
      )
    };

    res.json({
      success: true,
      image1: {
        properties: image1.properties,
        tags: image1.tags
      },
      image2: {
        properties: image2.properties,
        tags: image2.tags
      },
      comparison
    });
  } catch (error) {
    console.error('[AI Vision] Comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Image comparison failed'
    });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'AI Vision Processor',
    status: 'OPERATIONAL',
    capabilities: [
      'Natural Language Image Processing',
      'Image Enhancement & Clarity',
      'Object Detection',
      'OCR Text Extraction',
      'Color Analysis',
      'Face Detection',
      'Pattern Recognition',
      'Metadata Extraction',
      'Background Removal',
      'Resolution Upscaling',
      'Anomaly Detection',
      'PDF Page Processing'
    ]
  });
});

export default router;