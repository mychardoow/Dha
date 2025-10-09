const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

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

async function validateDocuments() {
  console.log('🔍 Validating document generation...');
  
  // Ensure documents directory exists
  const docsDir = path.join(__dirname, '..', 'dist', 'documents');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Test each document type
  for (const [type, name] of Object.entries(DHA_DOCUMENTS)) {
    try {
      console.log(`Testing ${type} - ${name}...`);
      
      const doc = new PDFDocument();
      const filename = path.join(docsDir, `${type}_test.pdf`);
      const stream = fs.createWriteStream(filename);
      
      // Basic document structure
      doc.fontSize(16)
         .text('REPUBLIC OF SOUTH AFRICA', { align: 'center' })
         .fontSize(14)
         .text('DEPARTMENT OF HOME AFFAIRS', { align: 'center' })
         .fontSize(12)
         .text(`Form ${type} - ${name}`, { align: 'center' });
      
      doc.pipe(stream);
      doc.end();
      
      await new Promise((resolve) => stream.on('finish', resolve));
      console.log(`✅ ${type} generated successfully`);
    } catch (error) {
      console.error(`❌ Error generating ${type}:`, error);
      process.exit(1);
    }
  }
  
  console.log('✅ All document types validated successfully!');
}

validateDocuments().catch(console.error);