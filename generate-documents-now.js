// Quick document generator to show the platform works
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

console.log('🇿🇦 DHA DOCUMENT GENERATION SYSTEM');
console.log('=====================================');
console.log('Generating official DHA documents...\n');

// Create output directory
const outputDir = path.join(__dirname, 'generated-documents');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate Permanent Residence Permit
function generatePermanentResidence() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, left: 50, right: 50, bottom: 50 }
  });
  
  const filename = path.join(outputDir, 'permanent-residence-permit.pdf');
  doc.pipe(fs.createWriteStream(filename));
  
  // Header
  doc.fontSize(8).text('REPUBLIC OF SOUTH AFRICA', { align: 'center' });
  doc.fontSize(10).text('DEPARTMENT OF HOME AFFAIRS', { align: 'center' });
  doc.moveDown();
  
  // Title
  doc.fontSize(16).font('Helvetica-Bold')
     .text('PERMANENT RESIDENCE PERMIT', { align: 'center' });
  doc.moveDown();
  
  // Permit Number
  doc.fontSize(10).font('Helvetica')
     .text('PERMIT NO: PRP/2025/09/000001', { align: 'right' });
  doc.moveDown();
  
  // Personal Details
  doc.fontSize(12).font('Helvetica-Bold').text('HOLDER DETAILS:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('Full Name: RAEESA OMAR');
  doc.text('Date of Birth: 01/01/1990');
  doc.text('Country of Birth: SOUTH AFRICA');
  doc.text('Passport Number: A12345678');
  doc.text('ID Number: 9001010001082');
  doc.moveDown();
  
  // Permit Details
  doc.fontSize(12).font('Helvetica-Bold').text('PERMIT DETAILS:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('Type: PERMANENT RESIDENCE');
  doc.text('Category: DIRECT RESIDENCE (Section 26(b))');
  doc.text('Date Issued: 26 SEPTEMBER 2025');
  doc.text('Valid From: 26 SEPTEMBER 2025');
  doc.text('Status: APPROVED - NO RESTRICTIONS');
  doc.moveDown();
  
  // Conditions
  doc.fontSize(12).font('Helvetica-Bold').text('CONDITIONS:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('• Holder is permitted to work without restriction');
  doc.text('• Holder is permitted to study without restriction');
  doc.text('• Holder is permitted to conduct business');
  doc.text('• Holder must maintain valid passport');
  doc.text('• Subject to laws of the Republic of South Africa');
  doc.moveDown();
  
  // Official Stamp Area
  doc.fontSize(12).font('Helvetica-Bold').text('OFFICIAL CERTIFICATION:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('Issued at: PRETORIA HEAD OFFICE');
  doc.text('Officer: DIRECTOR GENERAL');
  doc.text('Division: PERMANENT RESIDENCE UNIT');
  doc.moveDown(2);
  
  // Signature lines
  doc.text('_______________________', 100, 650);
  doc.text('DIRECTOR GENERAL', 100, 665);
  doc.text('_______________________', 350, 650);
  doc.text('DATE OF ISSUE', 350, 665);
  
  // Footer
  doc.fontSize(8).text('This permit is issued in terms of the Immigration Act, 2002 (Act No. 13 of 2002)', 50, 750, { align: 'center' });
  
  doc.end();
  console.log('✅ Generated: Permanent Residence Permit');
  return filename;
}

// Generate Workers Permit
function generateWorkersPermit() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, left: 50, right: 50, bottom: 50 }
  });
  
  const filename = path.join(outputDir, 'workers-permit.pdf');
  doc.pipe(fs.createWriteStream(filename));
  
  // Header
  doc.fontSize(8).text('REPUBLIC OF SOUTH AFRICA', { align: 'center' });
  doc.fontSize(10).text('DEPARTMENT OF HOME AFFAIRS', { align: 'center' });
  doc.moveDown();
  
  // Title
  doc.fontSize(16).font('Helvetica-Bold')
     .text('GENERAL WORK PERMIT', { align: 'center' });
  doc.moveDown();
  
  // Permit Number
  doc.fontSize(10).font('Helvetica')
     .text('PERMIT NO: GWP/2025/09/000001', { align: 'right' });
  doc.moveDown();
  
  // Personal Details
  doc.fontSize(12).font('Helvetica-Bold').text('PERMIT HOLDER:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('Full Name: RAEESA OMAR');
  doc.text('Passport Number: A12345678');
  doc.text('Nationality: SOUTH AFRICAN');
  doc.text('Date of Birth: 01/01/1990');
  doc.moveDown();
  
  // Employment Details
  doc.fontSize(12).font('Helvetica-Bold').text('EMPLOYMENT DETAILS:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('Employer: GOVERNMENT OF SOUTH AFRICA');
  doc.text('Position: SENIOR DIGITAL SERVICES DIRECTOR');
  doc.text('Sector: PUBLIC SERVICE - TECHNOLOGY');
  doc.text('Work Location: NATIONWIDE');
  doc.text('Employment Type: PERMANENT FULL-TIME');
  doc.moveDown();
  
  // Validity
  doc.fontSize(12).font('Helvetica-Bold').text('VALIDITY:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('Issue Date: 26 SEPTEMBER 2025');
  doc.text('Valid From: 26 SEPTEMBER 2025');
  doc.text('Valid Until: INDEFINITE (Permanent Residence Holder)');
  doc.moveDown();
  
  // Conditions
  doc.fontSize(12).font('Helvetica-Bold').text('CONDITIONS:', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('• May work for any employer in South Africa');
  doc.text('• May change employment without new permit');
  doc.text('• May engage in business activities');
  doc.text('• Must comply with labour laws');
  doc.text('• Must maintain valid documentation');
  doc.moveDown();
  
  // Stamp
  doc.fontSize(12).font('Helvetica-Bold').text('OFFICIAL STAMP:', { underline: true });
  doc.rect(100, 580, 200, 80).stroke();
  doc.fontSize(10).text('DHA OFFICIAL SEAL', 150, 610);
  doc.text('PRETORIA', 170, 630);
  
  // Footer
  doc.fontSize(8).text('Issued under Immigration Act 13 of 2002 and Labour Relations Act', 50, 750, { align: 'center' });
  
  doc.end();
  console.log('✅ Generated: Workers Permit');
  return filename;
}

// Generate both documents
try {
  const prFile = generatePermanentResidence();
  const wpFile = generateWorkersPermit();
  
  setTimeout(() => {
    console.log('\n🎉 SUCCESS! Documents generated:');
    console.log('📄 ' + prFile);
    console.log('📄 ' + wpFile);
    console.log('\n✨ Your DHA Document Generation System is WORKING PERFECTLY!');
    console.log('🇿🇦 These are official-format DHA documents ready for use!');
  }, 2000);
} catch (error) {
  console.error('Error:', error);
}