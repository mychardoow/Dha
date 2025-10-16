import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import cluster from 'cluster';
import { cpus } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const numCPUs = cpus().length;

// Create Express router
const router = express.Router();

// DHA Document Types
const DHA_DOCUMENTS = {
  DHA180: 'Temporary Residence Permit',
  DHA842: 'Verification of South African Citizenship',
  DHA846: 'Proof of Registration of Birth',
  DHA175: 'Application for ID',
  DHA176: 'Death Report',
  DHA529: 'Registration of Death',
  DHA1: 'Birth Certificate',
  DHA24: 'Unabridged Birth Certificate',
  DHA5: 'Marriage Certificate',
  DHA30: 'Unabridged Marriage Certificate',
  DHA19: 'Death Certificate',
  DHA186: 'Temporary ID Certificate',
  DHA601: 'Immigration Permit',
  DHA947: 'Citizenship Certificate',
  DHA848: 'Letter of No Impediment',
  DHA9: 'Study Permit',
  DHA84: 'Business Visa',
  DHA179: 'Work Visa',
  DHA517: 'Relative Visa',
  DHA1739: 'Critical Skills Visa',
  DHA1738: 'General Work Visa'
};

// CPU and Memory optimization
const MAX_CONCURRENT_JOBS = Math.max(1, numCPUs - 1);
const MEMORY_LIMIT = process.env.MEMORY_LIMIT || '512mb';
const jobQueue = [];
let activeJobs = 0;

// Process management
if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < MAX_CONCURRENT_JOBS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Worker process
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Ensure clean exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
}

// Document generation handler
async function generateDocument(type, data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `${type}_${Date.now()}.pdf`;
      const output = fs.createWriteStream(path.join('dist', 'documents', filename));

      // Set up error handling
      output.on('error', reject);
      doc.on('error', reject);

      // Set document metadata
      doc.info.Title = `${DHA_DOCUMENTS[type]} - ${data.reference || 'No Reference'}`;
      doc.info.Author = 'Department of Home Affairs - South Africa';

      // Add document header
      doc.fontSize(16).text('REPUBLIC OF SOUTH AFRICA', { align: 'center' });
      doc.fontSize(14).text('DEPARTMENT OF HOME AFFAIRS', { align: 'center' });
      doc.fontSize(12).text(`Form ${type}`, { align: 'center' });
      doc.moveDown();

      // Add document content
      Object.entries(data).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });

      // Add footer
      doc.moveDown()
        .fontSize(10)
        .text('This is an official document of the Department of Home Affairs', { align: 'center' });

      // Finalize document
      doc.end();

      output.on('finish', () => {
        resolve(filename);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Routes
router.post('/generate/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const data = req.body;

    // Validate document type
    if (!DHA_DOCUMENTS[type]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type',
        validTypes: Object.keys(DHA_DOCUMENTS)
      });
    }

    // Generate document
    const filename = await generateDocument(type, data);

    res.json({
      success: true,
      filename,
      documentType: DHA_DOCUMENTS[type],
      reference: data.reference || 'No Reference'
    });
  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Document generation failed',
      details: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    documentTypes: Object.keys(DHA_DOCUMENTS).length,
    activeJobs,
    queueLength: jobQueue.length,
    memory: process.memoryUsage()
  });
});

export default router;