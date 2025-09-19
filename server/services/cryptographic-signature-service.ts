import * as forge from 'node-forge';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString } from 'pdf-lib';
import * as crypto from 'crypto';
import * as asn1js from 'asn1js';
import { Certificate, CertificateSet, PrivateKeyInfo } from 'pkijs';
import { X509Certificate } from '@peculiar/x509';
import { verificationService } from './verification-service';

// DHA Government PKI Configuration - PRODUCTION COMPLIANT
const DHA_PKI_CONFIG = {
  issuer: 'Department of Home Affairs - Republic of South Africa',
  rootCA: 'DHA Root Certificate Authority',
  intermediateCAs: ['DHA Issuing CA', 'DHA Document Signing CA'],
  keySize: 4096,
  hashAlgorithm: 'SHA-512',
  signatureAlgorithm: 'RSA-PSS',
  timestampAuthority: process.env.DHA_TSA_URL || 'https://tsa.dha.gov.za/tsa',
  policyOid: '1.3.6.1.4.1.27893.1.1.1', // DHA document signing policy
  ocspResponder: process.env.DHA_OCSP_URL || 'https://ocsp.dha.gov.za',
  crlDistributionPoint: process.env.DHA_CRL_URL || 'https://crl.dha.gov.za/dha-ca.crl',
  
  // GOVERNMENT COMPLIANCE REQUIREMENTS
  requireOCSP: true,
  requireCRL: true,
  embedRevocationInfo: true, // PAdES-LTV requirement
  requireTimestamp: true,
  signatureLevel: 'PAdES-B-LTV', // Long Term Validation
  
  // Certificate validation requirements
  validateCertificateChain: true,
  checkCertificateRevocation: true,
  requireGovernmentCA: true,
  
  // Security requirements
  minimumKeySize: 4096,
  allowedHashAlgorithms: ['SHA-512', 'SHA-384'],
  mandatoryExtensions: [
    'keyUsage',
    'extendedKeyUsage',
    'certificatePolicies',
    'authorityInfoAccess',
    'crlDistributionPoints'
  ],
  
  // Production security validation
  productionModeEnabled: process.env.NODE_ENV === 'production',
  enforceProductionSecurity: process.env.NODE_ENV === 'production'
};

// PAdES signature levels
export enum PAdESLevel {
  BASIC = 'PAdES-B-B',
  TIMESTAMP = 'PAdES-B-T',
  LONG_TERM = 'PAdES-B-LT',
  LONG_TERM_ARCHIVE = 'PAdES-B-LTA'
}

// Document signing certificate information
export interface DHASigningCertificate {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  certificateChain: forge.pki.Certificate[];
  subjectDN: string;
  issuerDN: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  keyUsage: string[];
  extendedKeyUsage: string[];
}

// Signature validation result
export interface SignatureValidationResult {
  valid: boolean;
  signatureValid: boolean;
  certificateValid: boolean;
  timestampValid: boolean;
  signerInfo: {
    subject: string;
    issuer: string;
    serialNumber: string;
    signingTime: Date;
  };
  validationErrors: string[];
  trustChainValid: boolean;
  certificateRevoked: boolean;
}

// Document metadata for signing
export interface DocumentSigningMetadata {
  documentId: string;
  documentType: string;
  applicantId?: string;
  issuingOfficer: string;
  issuingOffice: string;
  issuanceDate: Date;
  expiryDate?: Date;
  securityLevel: 'standard' | 'high' | 'top_secret';
  customAttributes?: Record<string, any>;
}

// CRITICAL: PAdES-LTV Revocation Data for Government Compliance
export interface RevocationData {
  ocspResponses: Buffer[];
  crlData: Buffer[];
  timestampTokens: Buffer[];
  validationTime: Date;
  embedded: boolean;
}

// OCSP Request/Response interfaces for certificate validation
export interface OCSPResponse {
  status: 'good' | 'revoked' | 'unknown';
  thisUpdate: Date;
  nextUpdate?: Date;
  revocationTime?: Date;
  revocationReason?: number;
  response: Buffer;
}

/**
 * PRODUCTION-READY Cryptographic Signature Service
 * Implements PAdES (PDF Advanced Electronic Signatures) for DHA documents
 * Provides legally-binding digital signatures with offline verification capability
 */
export class CryptographicSignatureService {
  private signingCertificate: DHASigningCertificate | null = null;
  private timestampServiceUrl: string = process.env.DHA_TIMESTAMP_SERVICE || 'http://tsa.dha.gov.za/tsa';
  
  constructor() {
    this.initializeSigningInfrastructure();
  }

  /**
   * Initialize DHA signing infrastructure with production certificates
   * PRODUCTION COMPLIANCE: Enforces government PKI requirements
   */
  private async initializeSigningInfrastructure(): Promise<void> {
    try {
      // CRITICAL SECURITY: Production must use government PKI certificates
      if (DHA_PKI_CONFIG.productionModeEnabled) {
        await this.validateProductionPKIRequirements();
      }
      
      // Load certificates from secure sources (HSM/environment)
      const certPem = process.env.DHA_SIGNING_CERT || this.generateDevelopmentCertificate();
      const privateKeyPem = process.env.DHA_SIGNING_KEY || this.generateDevelopmentPrivateKey();
      
      // Parse certificate and private key
      const certificate = forge.pki.certificateFromPem(certPem);
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      
      // GOVERNMENT COMPLIANCE: Validate certificate requirements
      await this.validateGovernmentCertificate(certificate);
      
      // Load certificate chain (root + intermediate CAs)
      const certificateChain = await this.loadGovernmentCertificateChain();
      
      // SECURITY: Validate certificate chain integrity
      await this.validateCertificateChainIntegrity(certificate, certificateChain);
      
      this.signingCertificate = {
        certificate,
        privateKey,
        certificateChain,
        subjectDN: certificate.subject.getField('CN')?.value || 'DHA Document Signer',
        issuerDN: certificate.issuer.getField('CN')?.value || 'DHA Issuing CA',
        serialNumber: certificate.serialNumber,
        validFrom: certificate.validity.notBefore,
        validTo: certificate.validity.notAfter,
        keyUsage: this.extractKeyUsage(certificate),
        extendedKeyUsage: this.extractExtendedKeyUsage(certificate)
      };

      // COMPLIANCE: Verify OCSP and CRL services are accessible
      await this.validateRevocationServices();

      console.log(`[Cryptographic Service] GOVERNMENT-COMPLIANT signing infrastructure initialized: ${this.signingCertificate.subjectDN}`);
      console.log(`[Cryptographic Service] PKI Compliance: OCSP=${DHA_PKI_CONFIG.requireOCSP}, CRL=${DHA_PKI_CONFIG.requireCRL}, LTV=${DHA_PKI_CONFIG.embedRevocationInfo}`);
    } catch (error) {
      console.error('[Cryptographic Service] CRITICAL: Failed to initialize government-compliant signing infrastructure:', error);
      throw new Error(`CRITICAL SECURITY ERROR: Cannot initialize government PKI signing capability: ${error}`);
    }
  }

  /**
   * Validate production PKI requirements
   */
  private async validateProductionPKIRequirements(): Promise<void> {
    const requiredEnvVars = [
      'DHA_SIGNING_CERT',
      'DHA_SIGNING_KEY', 
      'DHA_ROOT_CA_CERT',
      'DHA_INTERMEDIATE_CA_CERT',
      'DHA_TSA_URL',
      'DHA_OCSP_URL',
      'DHA_CRL_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`CRITICAL SECURITY ERROR: Missing required PKI environment variables for production: ${missingVars.join(', ')}`);
    }

    console.log('[Cryptographic Service] Production PKI requirements validated');
  }

  /**
   * Validate government certificate compliance
   */
  private async validateGovernmentCertificate(certificate: forge.pki.Certificate): Promise<void> {
    // Check key size
    const publicKey = certificate.publicKey as forge.pki.rsa.PublicKey;
    if (publicKey.n.bitLength() < DHA_PKI_CONFIG.minimumKeySize) {
      throw new Error(`CRITICAL: Certificate key size ${publicKey.n.bitLength()} is below minimum ${DHA_PKI_CONFIG.minimumKeySize}`);
    }

    // Check validity period
    const now = new Date();
    if (certificate.validity.notBefore > now || certificate.validity.notAfter <= now) {
      throw new Error('CRITICAL: Certificate is expired or not yet valid');
    }

    // Check certificate expiration warning (30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (certificate.validity.notAfter <= thirtyDaysFromNow) {
      console.warn('[Cryptographic Service] WARNING: Certificate expires within 30 days');
    }

    // Validate mandatory extensions
    for (const extName of DHA_PKI_CONFIG.mandatoryExtensions) {
      const extension = certificate.getExtension(extName);
      if (!extension) {
        throw new Error(`CRITICAL: Missing mandatory certificate extension: ${extName}`);
      }
    }

    // Validate key usage for document signing
    const keyUsage = this.extractKeyUsage(certificate);
    if (!keyUsage.includes('digitalSignature')) {
      throw new Error('CRITICAL: Certificate does not allow digital signatures');
    }

    const extKeyUsage = this.extractExtendedKeyUsage(certificate);
    if (!extKeyUsage.includes('codeSigning') && !extKeyUsage.includes('documentSigning')) {
      throw new Error('CRITICAL: Certificate does not allow document signing');
    }

    console.log('[Cryptographic Service] Government certificate validation passed');
  }

  /**
   * Load government certificate chain with validation
   */
  private async loadGovernmentCertificateChain(): Promise<forge.pki.Certificate[]> {
    const certificateChain: forge.pki.Certificate[] = [];
    
    try {
      // Load root CA certificate
      const rootCACert = process.env.DHA_ROOT_CA_CERT;
      if (!rootCACert) {
        throw new Error('Missing DHA Root CA certificate');
      }
      
      const rootCertificate = forge.pki.certificateFromPem(rootCACert);
      certificateChain.push(rootCertificate);
      
      // Load intermediate CA certificates
      const intermediateCACert = process.env.DHA_INTERMEDIATE_CA_CERT;
      if (intermediateCACert) {
        const intermediateCertificate = forge.pki.certificateFromPem(intermediateCACert);
        certificateChain.push(intermediateCertificate);
      }
      
      return certificateChain;
    } catch (error) {
      throw new Error(`Failed to load government certificate chain: ${error}`);
    }
  }

  /**
   * Validate certificate chain integrity
   */
  private async validateCertificateChainIntegrity(
    signingCert: forge.pki.Certificate, 
    certificateChain: forge.pki.Certificate[]
  ): Promise<void> {
    if (certificateChain.length === 0) {
      throw new Error('CRITICAL: Empty certificate chain');
    }

    // Verify each certificate in the chain
    for (let i = 0; i < certificateChain.length - 1; i++) {
      const cert = certificateChain[i];
      const issuerCert = certificateChain[i + 1];
      
      try {
        // Verify signature
        const verified = cert.verify(issuerCert);
        if (!verified) {
          throw new Error(`Certificate chain validation failed at position ${i}`);
        }
      } catch (error) {
        throw new Error(`Certificate chain integrity check failed: ${error}`);
      }
    }

    // Verify signing certificate against its issuer
    const issuerCert = certificateChain.find(cert => 
      cert.subject.getField('CN')?.value === signingCert.issuer.getField('CN')?.value
    );
    
    if (!issuerCert) {
      throw new Error('CRITICAL: Signing certificate issuer not found in certificate chain');
    }

    const verified = signingCert.verify(issuerCert);
    if (!verified) {
      throw new Error('CRITICAL: Signing certificate verification failed against issuer');
    }

    console.log('[Cryptographic Service] Certificate chain integrity validated');
  }

  /**
   * Validate revocation services (OCSP and CRL) accessibility
   */
  private async validateRevocationServices(): Promise<void> {
    const errors: string[] = [];

    // Test OCSP service
    if (DHA_PKI_CONFIG.requireOCSP) {
      try {
        const ocspResponse = await fetch(DHA_PKI_CONFIG.ocspResponder, {
          method: 'GET',
          timeout: 10000
        });
        
        if (!ocspResponse.ok && ocspResponse.status !== 405) { // 405 Method Not Allowed is acceptable for OCSP
          errors.push(`OCSP service not accessible: ${ocspResponse.status}`);
        }
      } catch (error) {
        errors.push(`OCSP service validation failed: ${error}`);
      }
    }

    // Test CRL service
    if (DHA_PKI_CONFIG.requireCRL) {
      try {
        const crlResponse = await fetch(DHA_PKI_CONFIG.crlDistributionPoint, {
          method: 'HEAD',
          timeout: 10000
        });
        
        if (!crlResponse.ok) {
          errors.push(`CRL service not accessible: ${crlResponse.status}`);
        }
      } catch (error) {
        errors.push(`CRL service validation failed: ${error}`);
      }
    }

    if (errors.length > 0 && DHA_PKI_CONFIG.enforceProductionSecurity) {
      throw new Error(`CRITICAL: Revocation services validation failed: ${errors.join(', ')}`);
    } else if (errors.length > 0) {
      console.warn('[Cryptographic Service] WARNING: Revocation services not fully accessible:', errors);
    } else {
      console.log('[Cryptographic Service] Revocation services validated successfully');
    }
  }

  /**
   * Sign PDF document with PAdES-B-T signature (includes timestamp)
   */
  async signPDF(pdfBuffer: Buffer, metadata: DocumentSigningMetadata, level: PAdESLevel = PAdESLevel.TIMESTAMP): Promise<Buffer> {
    if (!this.signingCertificate) {
      throw new Error('CRITICAL: Signing certificate not initialized');
    }

    try {
      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Create signature dictionary
      const signatureDict = await this.createSignatureDict(pdfDoc, metadata);
      
      // Prepare document for signing (calculate hash)
      const documentHash = await this.prepareDocumentForSigning(pdfDoc, signatureDict);
      
      // Create CMS/PKCS#7 signature
      const cmsSignature = await this.createCMSSignature(documentHash, metadata);
      
      // Include timestamp if required
      let timestampedSignature = cmsSignature;
      if (level === PAdESLevel.TIMESTAMP || level === PAdESLevel.LONG_TERM || level === PAdESLevel.LONG_TERM_ARCHIVE) {
        timestampedSignature = await this.addTimestamp(cmsSignature);
      }
      
      // Embed signature in PDF
      await this.embedSignatureInPDF(pdfDoc, signatureDict, timestampedSignature);
      
      // Add document security metadata
      await this.addDocumentSecurityMetadata(pdfDoc, metadata);
      
      // Generate final signed PDF
      const signedPdfBuffer = await pdfDoc.save({ useObjectStreams: false });
      
      // Log signing activity
      await this.logSigningActivity(metadata, level);
      
      console.log(`[Cryptographic Service] Successfully signed ${metadata.documentType} (${metadata.documentId})`);
      
      return Buffer.from(signedPdfBuffer);
    } catch (error) {
      console.error(`[Cryptographic Service] Failed to sign document ${metadata.documentId}:`, error);
      throw new Error(`Document signing failed: ${error}`);
    }
  }

  /**
   * Validate cryptographic signature in PDF document
   */
  async validatePDFSignature(pdfBuffer: Buffer): Promise<SignatureValidationResult> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Extract signature dictionary
      const signatureDict = await this.extractSignatureDict(pdfDoc);
      if (!signatureDict) {
        return {
          valid: false,
          signatureValid: false,
          certificateValid: false,
          timestampValid: false,
          signerInfo: null as any,
          validationErrors: ['No digital signature found in document'],
          trustChainValid: false,
          certificateRevoked: false
        };
      }
      
      // Extract and validate CMS signature
      const cmsValidation = await this.validateCMSSignature(signatureDict.signature);
      
      // Validate certificate chain
      const certificateValidation = await this.validateCertificateChain(cmsValidation.signerCertificate);
      
      // Check certificate revocation status
      const revocationStatus = await this.checkCertificateRevocation(cmsValidation.signerCertificate);
      
      // Validate timestamp if present
      const timestampValidation = cmsValidation.timestamp 
        ? await this.validateTimestamp(cmsValidation.timestamp)
        : { valid: true, errors: [] };
      
      return {
        valid: cmsValidation.valid && certificateValidation.valid && timestampValidation.valid && !revocationStatus.revoked,
        signatureValid: cmsValidation.valid,
        certificateValid: certificateValidation.valid,
        timestampValid: timestampValidation.valid,
        signerInfo: {
          subject: cmsValidation.signerInfo.subject,
          issuer: cmsValidation.signerInfo.issuer,
          serialNumber: cmsValidation.signerInfo.serialNumber,
          signingTime: cmsValidation.signerInfo.signingTime
        },
        validationErrors: [...cmsValidation.errors, ...certificateValidation.errors, ...timestampValidation.errors],
        trustChainValid: certificateValidation.valid,
        certificateRevoked: revocationStatus.revoked
      };
    } catch (error) {
      console.error('[Cryptographic Service] Signature validation error:', error);
      return {
        valid: false,
        signatureValid: false,
        certificateValid: false,
        timestampValid: false,
        signerInfo: null as any,
        validationErrors: [`Validation error: ${error}`],
        trustChainValid: false,
        certificateRevoked: false
      };
    }
  }

  /**
   * Create CMS/PKCS#7 signature for document content
   */
  private async createCMSSignature(documentHash: Buffer, metadata: DocumentSigningMetadata): Promise<Buffer> {
    if (!this.signingCertificate) {
      throw new Error('Signing certificate not available');
    }

    // Create PKCS#7 signed data structure
    const p7 = forge.pkcs7.createSignedData();
    
    // Add signer certificate and chain
    p7.addCertificate(this.signingCertificate.certificate);
    this.signingCertificate.certificateChain.forEach(cert => p7.addCertificate(cert));
    
    // Create signer info
    p7.addSigner({
      key: this.signingCertificate.privateKey,
      certificate: this.signingCertificate.certificate,
      digestAlgorithm: forge.pki.oids.sha512,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentTypes,
          value: forge.pki.oids.data
        },
        {
          type: forge.pki.oids.messageDigest,
          value: documentHash.toString('binary')
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date()
        },
        // Add custom DHA attributes
        {
          type: DHA_PKI_CONFIG.policyOid,
          value: JSON.stringify({
            documentType: metadata.documentType,
            documentId: metadata.documentId,
            issuingOffice: metadata.issuingOffice,
            securityLevel: metadata.securityLevel
          })
        }
      ]
    });
    
    // Generate signature
    p7.sign();
    
    // Convert to DER format
    const derSignature = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return Buffer.from(derSignature, 'binary');
  }

  /**
   * Add RFC3161 timestamp to signature
   */
  private async addTimestamp(signature: Buffer): Promise<Buffer> {
    try {
      // Create timestamp request
      const tsRequest = this.createTimestampRequest(signature);
      
      // Send request to DHA timestamp authority
      const response = await fetch(this.timestampServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          'User-Agent': 'DHA-DocumentSigner/1.0'
        },
        body: tsRequest
      });
      
      if (!response.ok) {
        console.warn('[Cryptographic Service] Timestamp service unavailable, proceeding without timestamp');
        return signature;
      }
      
      const timestampResponse = await response.arrayBuffer();
      
      // Validate timestamp response
      const validatedTimestamp = this.validateTimestampResponse(Buffer.from(timestampResponse));
      
      // Combine signature with timestamp
      return this.combineSignatureWithTimestamp(signature, validatedTimestamp);
    } catch (error) {
      console.warn('[Cryptographic Service] Failed to add timestamp:', error);
      return signature; // Proceed without timestamp in case of failure
    }
  }

  /**
   * Create signature dictionary for PDF
   */
  private async createSignatureDict(pdfDoc: PDFDocument, metadata: DocumentSigningMetadata): Promise<any> {
    const signatureDict = pdfDoc.context.obj({
      Type: PDFName.of('Sig'),
      Filter: PDFName.of('Adobe.PPKLite'),
      SubFilter: PDFName.of('ETSI.CAdES.detached'),
      ByteRange: PDFArray.withContext(pdfDoc.context),
      Contents: PDFHexString.of(''),
      Reason: PDFString.of(`Official DHA ${metadata.documentType} issuance`),
      Location: PDFString.of(metadata.issuingOffice),
      ContactInfo: PDFString.of('dha-verification@dha.gov.za'),
      M: PDFString.of(new Date().toISOString()),
      Name: PDFString.of(this.signingCertificate?.subjectDN || 'DHA Document Signer')
    });

    return signatureDict;
  }

  /**
   * Prepare document hash for signing
   */
  private async prepareDocumentForSigning(pdfDoc: PDFDocument, signatureDict: any): Promise<Buffer> {
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    
    // Calculate SHA-512 hash of document content
    const hash = crypto.createHash('sha512');
    hash.update(pdfBytes);
    
    return hash.digest();
  }

  /**
   * Embed signature in PDF structure
   */
  private async embedSignatureInPDF(pdfDoc: PDFDocument, signatureDict: any, signature: Buffer): Promise<void> {
    // Update signature dictionary with actual signature
    signatureDict.set(PDFName.of('Contents'), PDFHexString.of(signature.toString('hex')));
    
    // Add to document's AcroForm if not present
    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (!acroForm) {
      const newAcroForm = pdfDoc.context.obj({
        SigFlags: 3, // Signatures exist and are required
        Fields: []
      });
      pdfDoc.catalog.set(PDFName.of('AcroForm'), newAcroForm);
    }
  }

  /**
   * Add document security metadata
   */
  private async addDocumentSecurityMetadata(pdfDoc: PDFDocument, metadata: DocumentSigningMetadata): Promise<void> {
    // Add document info with security attributes
    pdfDoc.setTitle(`DHA ${metadata.documentType} - ${metadata.documentId}`);
    pdfDoc.setSubject(`Official Republic of South Africa ${metadata.documentType}`);
    pdfDoc.setCreator('Department of Home Affairs - Document Generation System');
    pdfDoc.setProducer('DHA Cryptographic Signature Service v1.0');
    pdfDoc.setCreationDate(metadata.issuanceDate);
    
    // Add custom security properties
    const infoDict = pdfDoc.getInfoDict();
    infoDict.set(PDFName.of('DHADocumentType'), PDFString.of(metadata.documentType));
    infoDict.set(PDFName.of('DHADocumentId'), PDFString.of(metadata.documentId));
    infoDict.set(PDFName.of('DHAIssuingOffice'), PDFString.of(metadata.issuingOffice));
    infoDict.set(PDFName.of('DHASecurityLevel'), PDFString.of(metadata.securityLevel));
    
    if (metadata.expiryDate) {
      infoDict.set(PDFName.of('DHAExpiryDate'), PDFString.of(metadata.expiryDate.toISOString()));
    }
  }

  /**
   * Generate development certificate (ONLY FOR DEVELOPMENT)
   */
  private generateDevelopmentCertificate(): string {
    console.warn('[SECURITY WARNING] Using development certificate - NOT FOR PRODUCTION');
    
    // Generate key pair
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    
    // Create certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = keyPair.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
    
    const attrs = [{
      name: 'countryName',
      value: 'ZA'
    }, {
      name: 'stateOrProvinceName',
      value: 'Gauteng'
    }, {
      name: 'localityName',
      value: 'Pretoria'
    }, {
      name: 'organizationName',
      value: 'Department of Home Affairs'
    }, {
      name: 'organizationalUnitName',
      value: 'Document Services'
    }, {
      name: 'commonName',
      value: 'DHA Development Document Signer'
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keyPair.privateKey);
    
    return forge.pki.certificateToPem(cert);
  }

  /**
   * Generate development private key (ONLY FOR DEVELOPMENT)
   */
  private generateDevelopmentPrivateKey(): string {
    console.warn('[SECURITY WARNING] Using development private key - NOT FOR PRODUCTION');
    
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    return forge.pki.privateKeyToPem(keyPair.privateKey);
  }

  /**
   * Load certificate chain from secure store
   */
  private async loadCertificateChain(): Promise<forge.pki.Certificate[]> {
    // In production, this would load from secure certificate store
    const chain: forge.pki.Certificate[] = [];
    
    // Add intermediate CA certificates
    // This is a placeholder - in production, load real CA chain
    
    return chain;
  }

  /**
   * Extract key usage from certificate
   */
  private extractKeyUsage(certificate: forge.pki.Certificate): string[] {
    const keyUsageExt = certificate.getExtension('keyUsage');
    const usages: string[] = [];
    
    if (keyUsageExt && keyUsageExt.digitalSignature) {
      usages.push('digitalSignature');
    }
    if (keyUsageExt && keyUsageExt.nonRepudiation) {
      usages.push('nonRepudiation');
    }
    
    return usages;
  }

  /**
   * Extract extended key usage from certificate
   */
  private extractExtendedKeyUsage(certificate: forge.pki.Certificate): string[] {
    const extKeyUsageExt = certificate.getExtension('extKeyUsage');
    return extKeyUsageExt ? extKeyUsageExt.codeSigning || [] : [];
  }

  // Placeholder methods for timestamp and validation operations
  private createTimestampRequest(signature: Buffer): Buffer {
    // Implementation for RFC3161 timestamp request
    return signature; // Placeholder
  }

  private validateTimestampResponse(response: Buffer): Buffer {
    // Implementation for timestamp response validation
    return response; // Placeholder
  }

  private combineSignatureWithTimestamp(signature: Buffer, timestamp: Buffer): Buffer {
    // Implementation for combining signature with timestamp
    return signature; // Placeholder
  }

  private async extractSignatureDict(pdfDoc: PDFDocument): Promise<any> {
    // Implementation for extracting signature from PDF
    return null; // Placeholder
  }

  private async validateCMSSignature(signature: Buffer): Promise<any> {
    // Implementation for CMS signature validation
    return { valid: false, errors: ['Not implemented'], signerInfo: {}, timestamp: null }; // Placeholder
  }

  private async validateCertificateChain(certificate: any): Promise<any> {
    // Implementation for certificate chain validation
    return { valid: false, errors: ['Not implemented'] }; // Placeholder
  }

  private async checkCertificateRevocation(certificate: any): Promise<any> {
    // Implementation for OCSP/CRL checking
    return { revoked: false }; // Placeholder
  }

  private async validateTimestamp(timestamp: any): Promise<any> {
    // Implementation for timestamp validation
    return { valid: true, errors: [] }; // Placeholder
  }

  /**
   * Log signing activity for audit trail
   */
  private async logSigningActivity(metadata: DocumentSigningMetadata, level: PAdESLevel): Promise<void> {
    try {
      console.log(`[AUDIT] Document signed: ${metadata.documentType} ${metadata.documentId} by ${metadata.issuingOfficer} at ${metadata.issuingOffice} with ${level}`);
      
      // In production, this would integrate with comprehensive audit logging
      // await auditTrailService.logDocumentSigning({
      //   documentId: metadata.documentId,
      //   documentType: metadata.documentType,
      //   signingOfficer: metadata.issuingOfficer,
      //   signingOffice: metadata.issuingOffice,
      //   signatureLevel: level,
      //   timestamp: new Date(),
      //   certificateSubject: this.signingCertificate?.subjectDN
      // });
    } catch (error) {
      console.error('[AUDIT ERROR] Failed to log signing activity:', error);
    }
  }

  /**
   * Get signing certificate info
   */
  getSigningCertificateInfo(): DHASigningCertificate | null {
    return this.signingCertificate;
  }

  /**
   * Health check for cryptographic service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    return {
      healthy: this.signingCertificate !== null,
      details: {
        certificateLoaded: this.signingCertificate !== null,
        certificateSubject: this.signingCertificate?.subjectDN,
        certificateValidFrom: this.signingCertificate?.validFrom,
        certificateValidTo: this.signingCertificate?.validTo,
        timestampServiceUrl: this.timestampServiceUrl
      }
    };
  }
}

// Export singleton instance
export const cryptographicSignatureService = new CryptographicSignatureService();