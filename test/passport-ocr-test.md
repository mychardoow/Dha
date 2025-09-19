# Passport OCR to PDF Generation Test

## Test Data
Based on the provided work visa example:
- **Full Name**: IKRAM IBRAHIM YUSUF MANSURI
- **Passport Number**: 10611952
- **Control Number**: AA2540632
- **Nationality**: Based on visa context
- **Document Type**: Work Visa

## Test Procedure

### 1. Passport OCR Extraction
1. Navigate to the Document Generation page (`/document-generation`)
2. Click on the "Generate Documents" tab
3. In the "Passport/Visa OCR Auto-Fill" section:
   - Click "Click to upload passport/visa image"
   - Select a passport or visa image file
   - Click "Extract Data" button

### 2. Verify Extracted Data
Once extraction is complete, verify:
- Full name appears correctly
- Passport number is extracted (10611952)
- Control number is extracted (AA2540632)
- OCR confidence score is displayed
- Document authenticity status shows

### 3. Auto-Fill Forms
1. Click "Apply to Forms" button
2. Verify that certificate/permit forms are populated with:
   - Title field contains the full name
   - Description field is auto-generated

### 4. Generate Secure PDF
1. Complete any remaining required fields
2. Click "Generate Certificate" or "Generate Permit"
3. Verify the generated PDF contains:
   - Extracted passport data
   - Security features:
     - Watermarks ("OFFICIAL DHA DOCUMENT")
     - Microtext borders
     - Holographic patterns
     - Verification QR code
     - Cryptographic signature (PAdES-B-T)

### 5. Verify Security Features
1. **Watermark**: Should be visible as translucent text across the document
2. **Microtext**: Small repeating text "DHAOFFICIALDOCUMENTSECURE" in borders
3. **Holographic Pattern**: Gradient lines simulating holographic effects
4. **QR Code**: Located at bottom, links to verification URL
5. **Digital Signature**: Applied with government PKI certificate

## API Endpoint Test

### Passport OCR Extraction Endpoint
```
POST /api/ai/passport/extract
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- passportImage: <image file>
- targetFormType: passport_application
- enableAutoFill: true
```

### Expected Response
```json
{
  "success": true,
  "extractedData": {
    "fullName": "IKRAM IBRAHIM YUSUF MANSURI",
    "passportNumber": "10611952",
    "controlNumber": "AA2540632",
    "nationality": "...",
    "dateOfBirth": "...",
    "dateOfExpiry": "..."
  },
  "ocrConfidence": 95,
  "aiAnalysis": {
    "documentAuthenticity": "authentic",
    "documentCondition": "good"
  },
  "autoFillData": {
    "fullName": "IKRAM IBRAHIM YUSUF MANSURI",
    "passportNumber": "10611952"
  },
  "suggestions": [
    "Document appears to be a valid work visa",
    "All required fields extracted successfully"
  ]
}
```

## Security Features Verification Checklist

- [ ] Watermark is visible on PDF
- [ ] Microtext pattern is present
- [ ] Holographic effects are rendered
- [ ] QR code is generated and scannable
- [ ] Cryptographic signature is applied
- [ ] Document metadata includes security info
- [ ] Verification URL works correctly
- [ ] PDF cannot be edited without breaking signature

## Integration Points

1. **EnhancedSAOCRService**: Handles OCR extraction
2. **AIOCRIntegrationService**: Bridges OCR to PDF generation
3. **EnhancedPDFGenerationService**: Creates secure PDFs
4. **CryptographicSignatureService**: Applies digital signatures
5. **VerificationService**: Manages document verification

## Success Criteria

✅ Passport image can be uploaded
✅ OCR extracts data accurately
✅ Forms are auto-filled with extracted data
✅ PDF generation includes all extracted data
✅ All security features are present
✅ Document can be verified via QR code
✅ Cryptographic signature is valid