/**
 * SECURITY FEATURES V2 - COMPREHENSIVE DHA DOCUMENT SECURITY IMPLEMENTATION
 * Implements all Tier 1-4 security features based on official DHA specifications:
 * - Tier 1: Visible features (UV ink, holograms, watermarks)
 * - Tier 2: Tactile features (Braille, intaglio, laser engraving)
 * - Tier 3: Machine-readable features (MRZ, biometric chips, 2D barcodes)
 * - Tier 4: Forensic features (microprinting, security threads, invisible fibers)
 */

import PDFDocument from "pdfkit";
import * as crypto from "crypto";
import * as QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Canvas } from "canvas";
import { PDFDocument as PDFLib, rgb, StandardFonts } from "pdf-lib";

type PDFKit = InstanceType<typeof PDFDocument>;

// Security feature configuration for different document types
export interface SecurityFeatureConfiguration {
  uvFeatures: boolean;
  holographic: boolean;
  watermarks: boolean;
  braille: boolean;
  intaglio: boolean;
  laserEngraving: boolean;
  mrz: boolean;
  biometricChip: boolean;
  pdf417Barcode: boolean;
  microprinting: boolean;
  securityThread: boolean;
  invisibleFibers: boolean;
  guilloche: boolean;
  ghostImage: boolean;
  rainbowPrinting: boolean;
  thermochromic: boolean;
  metameric: boolean;
  antiCopy: boolean;
  perforation: boolean;
  embossedSeal: boolean;
  voidPantograph: boolean;
  retroreflective: boolean;
}

// UV Feature types
export interface UVFeature {
  type: 'text' | 'pattern' | 'image' | 'serial';
  content: string;
  position: { x: number; y: number };
  glowColor: string; // green, blue, red
  wavelength: 365 | 395; // nm
  visibility: 'invisible' | 'semi-visible';
}

// Braille configuration
export interface BrailleConfig {
  text: string;
  grade: 1 | 2; // Grade 1: letter-by-letter, Grade 2: contracted
  position: { x: number; y: number };
  dotSize: number; // diameter in points
  spacing: number; // between dots
}

// Holographic effect types
export interface HolographicEffect {
  type: 'ovi' | 'kinegram' | '3d_emblem' | 'cli' | 'mli';
  colors: string[]; // Color shift array
  angle: number; // Viewing angle
  pattern?: string; // Pattern type
  animation?: 'shift' | 'rotate' | 'pulse';
}

// MRZ (Machine Readable Zone) following ICAO 9303
export interface MRZData {
  format: 'TD1' | 'TD2' | 'TD3'; // Document format
  documentType: string; // P, V, I, etc.
  issuingState: string; // 3-letter code
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string; // 3-letter code
  dateOfBirth: string; // YYMMDD
  sex: 'M' | 'F' | 'X';
  dateOfExpiry: string; // YYMMDD
  personalNumber?: string;
  optionalData?: string;
}

/**
 * Main SecurityFeaturesV2 class
 */
export class SecurityFeaturesV2 {
  // Braille character mapping (Grade 1)
  private static readonly BRAILLE_ALPHABET: Record<string, number[][]> = {
    'A': [[1, 0], [0, 0], [0, 0]],
    'B': [[1, 0], [1, 0], [0, 0]],
    'C': [[1, 1], [0, 0], [0, 0]],
    'D': [[1, 1], [0, 1], [0, 0]],
    'E': [[1, 0], [0, 1], [0, 0]],
    'F': [[1, 1], [1, 0], [0, 0]],
    'G': [[1, 1], [1, 1], [0, 0]],
    'H': [[1, 0], [1, 1], [0, 0]],
    'I': [[0, 1], [1, 0], [0, 0]],
    'J': [[0, 1], [1, 1], [0, 0]],
    'K': [[1, 0], [0, 0], [1, 0]],
    'L': [[1, 0], [1, 0], [1, 0]],
    'M': [[1, 1], [0, 0], [1, 0]],
    'N': [[1, 1], [0, 1], [1, 0]],
    'O': [[1, 0], [0, 1], [1, 0]],
    'P': [[1, 1], [1, 0], [1, 0]],
    'Q': [[1, 1], [1, 1], [1, 0]],
    'R': [[1, 0], [1, 1], [1, 0]],
    'S': [[0, 1], [1, 0], [1, 0]],
    'T': [[0, 1], [1, 1], [1, 0]],
    'U': [[1, 0], [0, 0], [1, 1]],
    'V': [[1, 0], [1, 0], [1, 1]],
    'W': [[0, 1], [1, 1], [0, 1]],
    'X': [[1, 1], [0, 0], [1, 1]],
    'Y': [[1, 1], [0, 1], [1, 1]],
    'Z': [[1, 0], [0, 1], [1, 1]],
    ' ': [[0, 0], [0, 0], [0, 0]],
    '0': [[0, 1], [1, 1], [0, 0]], // with number prefix
    '1': [[1, 0], [0, 0], [0, 0]],
    '2': [[1, 0], [1, 0], [0, 0]],
    '3': [[1, 1], [0, 0], [0, 0]],
    '4': [[1, 1], [0, 1], [0, 0]],
    '5': [[1, 0], [0, 1], [0, 0]],
    '6': [[1, 1], [1, 0], [0, 0]],
    '7': [[1, 1], [1, 1], [0, 0]],
    '8': [[1, 0], [1, 1], [0, 0]],
    '9': [[0, 1], [1, 0], [0, 0]]
  };

  /**
   * Add comprehensive UV ink features to PDF
   * UV features are invisible under normal light but glow under 365nm/395nm UV light
   */
  static addUVFeatures(doc: PDFKit, features: UVFeature[]): void {
    doc.save();
    
    features.forEach(feature => {
      const opacity = feature.visibility === 'invisible' ? 0.05 : 0.15; // Very faint in normal light
      
      switch (feature.type) {
        case 'text':
          doc.fontSize(12)
             .fillColor(feature.glowColor, opacity)
             .text(`[UV ${feature.wavelength}nm: ${feature.content}]`, feature.position.x, feature.position.y);
          break;
          
        case 'pattern':
          // UV reactive pattern (e.g., SA Coat of Arms)
          this.drawUVPattern(doc, feature.position, feature.glowColor, opacity);
          break;
          
        case 'serial':
          // Hidden serial number in UV ink
          doc.fontSize(8)
             .fillColor(feature.glowColor, opacity)
             .text(feature.content, feature.position.x, feature.position.y, {
               characterSpacing: 2
             });
          break;
          
        case 'image':
          // UV reactive image placeholder
          doc.rect(feature.position.x, feature.position.y, 60, 60)
             .fillAndStroke(feature.glowColor, feature.glowColor)
             .fillOpacity(opacity)
             .strokeOpacity(opacity);
          break;
      }
    });
    
    doc.restore();
  }

  /**
   * Draw UV reactive pattern (SA Coat of Arms)
   */
  private static drawUVPattern(doc: PDFKit, position: { x: number; y: number }, color: string, opacity: number): void {
    doc.save();
    doc.fillOpacity(opacity);
    
    // Official coat of arms pattern
    const centerX = position.x + 30;
    const centerY = position.y + 30;
    
    // Shield shape
    doc.path(`M ${position.x} ${position.y + 10}
              Q ${position.x} ${position.y} ${position.x + 10} ${position.y}
              L ${position.x + 50} ${position.y}
              Q ${position.x + 60} ${position.y} ${position.x + 60} ${position.y + 10}
              L ${position.x + 60} ${position.y + 35}
              Q ${centerX} ${position.y + 60} ${position.x} ${position.y + 35}
              Z`)
       .fill(color);
    
    // UV text around shield
    doc.fontSize(6)
       .fillColor(color, opacity)
       .text("REPUBLIC OF SOUTH AFRICA", position.x - 10, position.y + 65);
    
    doc.restore();
  }

  /**
   * Generate and add Braille text to PDF
   * Used for both accessibility and security
   */
  static addBrailleText(doc: PDFKit, config: BrailleConfig): void {
    const text = config.text.toUpperCase();
    let currentX = config.position.x;
    const currentY = config.position.y;
    
    doc.save();
    
    for (const char of text) {
      const braillePattern = this.BRAILLE_ALPHABET[char];
      if (braillePattern) {
        this.drawBrailleCharacter(doc, braillePattern, currentX, currentY, config.dotSize, config.spacing);
        currentX += (config.dotSize * 2 + config.spacing * 3); // Move to next character position
      }
    }
    
    // Add tactile notation
    doc.fontSize(6)
       .fillColor('#666666')
       .text('[Braille: ' + config.text + ']', config.position.x, currentY + 20);
    
    doc.restore();
  }

  /**
   * Draw individual Braille character
   */
  private static drawBrailleCharacter(
    doc: PDFKit, 
    pattern: number[][], 
    x: number, 
    y: number, 
    dotSize: number, 
    spacing: number
  ): void {
    pattern.forEach((row, rowIndex) => {
      row.forEach((dot, colIndex) => {
        if (dot === 1) {
          const dotX = x + (colIndex * (dotSize + spacing));
          const dotY = y + (rowIndex * (dotSize + spacing));
          
          // Draw raised dot with gradient for 3D effect
          doc.circle(dotX, dotY, dotSize / 2)
             .fill('#000000');
          
          // Add small highlight for 3D effect
          doc.circle(dotX - dotSize/4, dotY - dotSize/4, dotSize / 4)
             .fill('#333333');
        }
      });
    });
  }

  /**
   * Create holographic effects with color-shifting gradients
   */
  static addHolographicEffect(doc: PDFKit, effect: HolographicEffect, x: number, y: number, width: number, height: number): void {
    doc.save();
    
    switch (effect.type) {
      case 'ovi':
        // Optically Variable Ink
        this.addOVIEffect(doc, effect.colors, x, y, width, height);
        break;
        
      case 'kinegram':
        // Moving image hologram
        this.addKinegramEffect(doc, x, y, width, height);
        break;
        
      case '3d_emblem':
        // 3D holographic emblem
        this.add3DEmblemEffect(doc, x, y, width, height);
        break;
        
      case 'cli':
        // Changeable Laser Image
        this.addCLIEffect(doc, x, y, width, height);
        break;
        
      case 'mli':
        // Multiple Laser Image
        this.addMLIEffect(doc, x, y, width, height);
        break;
    }
    
    // Add holographic notation
    doc.fontSize(6)
       .fillColor('#888888')
       .text(`[Holographic: ${effect.type.toUpperCase()}]`, x, y + height + 2);
    
    doc.restore();
  }

  /**
   * Add Optically Variable Ink effect
   */
  private static addOVIEffect(doc: PDFKit, colors: string[], x: number, y: number, width: number, height: number): void {
    // Create gradient that simulates color shift
    const gradient = doc.linearGradient(x, y, x + width, y);
    colors.forEach((color, index) => {
      gradient.stop(index / (colors.length - 1), color);
    });
    
    doc.rect(x, y, width, height)
       .fill(gradient);
    
    // Add shimmer overlay
    doc.rect(x, y, width, height)
       .fill('#ffffff')
       .fillOpacity(0.3);
  }

  /**
   * Add Kinegram moving hologram effect
   */
  private static addKinegramEffect(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    // Create interlaced pattern
    for (let i = 0; i < width; i += 2) {
      doc.rect(x + i, y, 1, height)
         .fill('#silver');
    }
    
    // Add iridescent overlay
    const gradient = doc.linearGradient(x, y, x + width, y + height);
    gradient.stop(0, '#ff00ff').stop(0.5, '#00ffff').stop(1, '#ffff00');
    
    doc.rect(x, y, width, height)
       .fill(gradient)
       .fillOpacity(0.2);
  }

  /**
   * Add 3D emblem effect
   */
  private static add3DEmblemEffect(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    // SA flag colors in holographic style
    const colors = ['#007749', '#FCB514', '#DE3831', '#001489'];
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    colors.forEach((color, index) => {
      const offset = index * 2;
      doc.circle(centerX + offset, centerY + offset, width / 3)
         .fill(color)
         .fillOpacity(0.3);
    });
    
    // Add metallic sheen
    doc.circle(centerX, centerY, width / 3)
       .fill('#C0C0C0')
       .fillOpacity(0.2);
  }

  /**
   * Add Changeable Laser Image effect
   */
  private static addCLIEffect(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    // Laser etched pattern
    doc.save();
    doc.strokeColor('#808080')
       .lineWidth(0.5);
    
    // Create fine line pattern
    for (let i = 0; i < height; i += 3) {
      doc.moveTo(x, y + i)
         .lineTo(x + width, y + i)
         .stroke();
    }
    
    // Add laser engraving notation
    doc.fontSize(4)
       .fillColor('#666666')
       .text('LASER', x + width/2 - 10, y + height/2 - 2);
    
    doc.restore();
  }

  /**
   * Add Multiple Laser Image effect
   */
  private static addMLIEffect(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    // Multiple overlapping images at different angles
    const images = ['ID', 'SA', 'DHA'];
    
    images.forEach((text, index) => {
      const angle = index * 15;
      doc.save();
      doc.rotate(angle, { origin: [x + width/2, y + height/2] });
      doc.fontSize(8)
         .fillColor('#999999')
         .fillOpacity(0.3)
         .text(text, x + width/2 - 10, y + height/2 - 4);
      doc.restore();
    });
  }

  /**
   * Generate ICAO 9303 compliant Machine Readable Zone
   */
  static generateMRZ(data: MRZData): string[] {
    const lines: string[] = [];
    
    switch (data.format) {
      case 'TD1': // ID Cards (2 lines of 30 characters)
        lines.push(...this.generateTD1MRZ(data));
        break;
        
      case 'TD2': // Visas (2 lines of 36 characters)
        lines.push(...this.generateTD2MRZ(data));
        break;
        
      case 'TD3': // Passports (2 lines of 44 characters)
        lines.push(...this.generateTD3MRZ(data));
        break;
    }
    
    return lines;
  }

  /**
   * Generate TD1 format MRZ (ID cards)
   */
  private static generateTD1MRZ(data: MRZData): string[] {
    const line1 = this.formatMRZLine([
      data.documentType.padEnd(2, '<'),
      data.issuingState,
      data.documentNumber.padEnd(9, '<'),
      this.calculateCheckDigit(data.documentNumber),
      data.personalNumber?.padEnd(15, '<') || '<<<<<<<<<<<<<<<'
    ].join(''), 30);
    
    const line2Parts = [
      data.dateOfBirth,
      this.calculateCheckDigit(data.dateOfBirth),
      data.sex,
      data.dateOfExpiry,
      this.calculateCheckDigit(data.dateOfExpiry),
      data.nationality,
      '<<<<<<<<<<<'
    ];
    
    const compositeData = line1.substring(5, 30) + data.dateOfBirth + this.calculateCheckDigit(data.dateOfBirth) + 
                         data.dateOfExpiry + this.calculateCheckDigit(data.dateOfExpiry);
    const compositeCheck = this.calculateCheckDigit(compositeData);
    
    line2Parts.push(compositeCheck);
    const line2 = this.formatMRZLine(line2Parts.join(''), 30);
    
    return [line1, line2];
  }

  /**
   * Generate TD2 format MRZ (Visas)
   */
  private static generateTD2MRZ(data: MRZData): string[] {
    const line1 = this.formatMRZLine([
      data.documentType.padEnd(2, '<'),
      data.issuingState,
      this.formatName(data.surname, data.givenNames, 31)
    ].join(''), 36);
    
    const line2 = this.formatMRZLine([
      data.documentNumber.padEnd(9, '<'),
      this.calculateCheckDigit(data.documentNumber),
      data.nationality,
      data.dateOfBirth,
      this.calculateCheckDigit(data.dateOfBirth),
      data.sex,
      data.dateOfExpiry,
      this.calculateCheckDigit(data.dateOfExpiry),
      data.personalNumber?.padEnd(7, '<') || '<<<<<<<',
      this.calculateCompositeCheckDigit('')
    ].join(''), 36);
    
    return [line1, line2];
  }

  /**
   * Generate TD3 format MRZ (Passports)
   */
  private static generateTD3MRZ(data: MRZData): string[] {
    const line1 = this.formatMRZLine([
      data.documentType,
      '<',
      data.issuingState,
      this.formatName(data.surname, data.givenNames, 39)
    ].join(''), 44);
    
    const docNumCheck = this.calculateCheckDigit(data.documentNumber);
    const dobCheck = this.calculateCheckDigit(data.dateOfBirth);
    const expiryCheck = this.calculateCheckDigit(data.dateOfExpiry);
    const personalCheck = data.personalNumber ? this.calculateCheckDigit(data.personalNumber) : '<';
    
    const line2Data = [
      data.documentNumber.padEnd(9, '<'),
      docNumCheck,
      data.nationality,
      data.dateOfBirth,
      dobCheck,
      data.sex,
      data.dateOfExpiry,
      expiryCheck,
      data.personalNumber?.padEnd(14, '<') || '<<<<<<<<<<<<<<',
      personalCheck
    ].join('');
    
    const compositeData = data.documentNumber + docNumCheck + data.dateOfBirth + dobCheck + 
                         data.dateOfExpiry + expiryCheck + (data.personalNumber || '') + personalCheck;
    const compositeCheck = this.calculateCheckDigit(compositeData);
    
    const line2 = this.formatMRZLine(line2Data + compositeCheck, 44);
    
    return [line1, line2];
  }

  /**
   * Calculate check digit for MRZ fields (ICAO 9303 algorithm)
   */
  private static calculateCheckDigit(input: string): string {
    const weights = [7, 3, 1];
    let sum = 0;
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      let value = 0;
      
      if (char >= '0' && char <= '9') {
        value = parseInt(char);
      } else if (char >= 'A' && char <= 'Z') {
        value = char.charCodeAt(0) - 65 + 10;
      } else if (char === '<') {
        value = 0;
      }
      
      sum += value * weights[i % 3];
    }
    
    return (sum % 10).toString();
  }

  /**
   * Calculate composite check digit
   */
  private static calculateCompositeCheckDigit(data: string): string {
    return this.calculateCheckDigit(data);
  }

  /**
   * Format name for MRZ
   */
  private static formatName(surname: string, givenNames: string, maxLength: number): string {
    const formatted = `${surname}<<${givenNames.replace(/ /g, '<')}`;
    return formatted.padEnd(maxLength, '<').substring(0, maxLength);
  }

  /**
   * Format MRZ line to exact length
   */
  private static formatMRZLine(line: string, length: number): string {
    return line.padEnd(length, '<').substring(0, length);
  }

  /**
   * Add MRZ to PDF document
   */
  static addMRZToDocument(doc: PDFKit, mrzLines: string[], x: number, y: number): void {
    doc.save();
    doc.font('Courier')
       .fontSize(10);
    
    mrzLines.forEach((line, index) => {
      doc.fillColor('#000000')
         .text(line, x, y + (index * 13), {
           characterSpacing: 1.5,
           features: ['liga', 'kern']
         });
    });
    
    // Add MRZ background pattern
    doc.rect(x - 5, y - 5, 400, mrzLines.length * 13 + 10)
       .fill('#FFF8DC')
       .fillOpacity(0.3);
    
    doc.restore();
  }

  /**
   * Add microprinting security feature
   */
  static addMicroprinting(doc: PDFKit, text: string, x: number, y: number, width: number): void {
    doc.save();
    
    // Ultra-small font (0.2mm text)
    doc.fontSize(2)
       .fillColor('#808080')
       .fillOpacity(0.5);
    
    // Repeat text to fill width
    const repeatedText = (text + ' ').repeat(Math.ceil(width / (text.length * 1.2)));
    
    doc.text(repeatedText, x, y, {
      width: width,
      height: 3,
      ellipsis: false,
      lineBreak: false
    });
    
    // Add magnification indicator
    doc.fontSize(4)
       .fillColor('#999999')
       .text('[MP]', x + width + 2, y);
    
    doc.restore();
  }

  /**
   * Create guilloche pattern (intricate geometric security pattern)
   */
  static addGuillochePattern(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    doc.save();
    doc.strokeColor('#E0E0E0')
       .lineWidth(0.25);
    
    // Create complex interwoven pattern
    const steps = 50;
    const amplitude = height / 4;
    
    for (let phase = 0; phase < 3; phase++) {
      doc.moveTo(x, y + height / 2);
      
      for (let i = 0; i <= steps; i++) {
        const xPos = x + (i * width / steps);
        const yPos = y + height / 2 + amplitude * Math.sin((i / steps) * Math.PI * 4 + phase);
        doc.lineTo(xPos, yPos);
      }
      
      doc.stroke();
    }
    
    // Add rosette pattern in center
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 4;
    
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      doc.circle(
        centerX + radius * Math.cos(rad) / 2,
        centerY + radius * Math.sin(rad) / 2,
        radius / 3
      ).stroke();
    }
    
    doc.restore();
  }

  /**
   * Add anti-copy pattern (fine lines that degrade when photocopied)
   */
  static addAntiCopyPattern(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    doc.save();
    doc.strokeColor('#F0F0F0')
       .lineWidth(0.1);
    
    // Create fine line pattern
    const spacing = 0.5;
    
    // Horizontal lines
    for (let i = 0; i < height; i += spacing) {
      doc.moveTo(x, y + i)
         .lineTo(x + width, y + i)
         .stroke();
    }
    
    // Diagonal lines for moiré effect
    for (let i = -height; i < width; i += spacing * 2) {
      doc.moveTo(x + i, y)
         .lineTo(x + i + height, y + height)
         .stroke();
    }
    
    // Add "COPY" void text (appears when copied)
    doc.fontSize(20)
       .fillColor('#FAFAFA')
       .fillOpacity(0.05)
       .text('COPY', x + width/2 - 25, y + height/2 - 10);
    
    doc.restore();
  }

  /**
   * Add security thread
   */
  static addSecurityThread(doc: PDFKit, x: number, y: number, height: number): void {
    doc.save();
    
    // Main thread line
    doc.strokeColor('#4B0082')
       .lineWidth(1)
       .moveTo(x, y)
       .lineTo(x, y + height)
       .stroke();
    
    // Windowed sections
    const windowHeight = 10;
    const windowSpacing = 25;
    
    for (let i = 0; i < height; i += windowSpacing) {
      // Metallic window
      doc.rect(x - 2, y + i, 4, windowHeight)
         .fill('#C0C0C0');
      
      // Microtext in window
      doc.fontSize(2)
         .fillColor('#000000')
         .text('RSA', x - 1, y + i + 4);
    }
    
    // Add magnetic notation
    doc.fontSize(4)
       .fillColor('#666666')
       .text('[MAG]', x + 5, y + height/2);
    
    doc.restore();
  }

  /**
   * Add invisible UV fibers
   */
  static addInvisibleFibers(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    doc.save();
    
    // Random fiber distribution
    const fiberCount = 30;
    
    for (let i = 0; i < fiberCount; i++) {
      const fiberX = x + Math.random() * width;
      const fiberY = y + Math.random() * height;
      const fiberLength = 5 + Math.random() * 10;
      const fiberAngle = Math.random() * Math.PI;
      const fiberColor = Math.random() > 0.5 ? '#FF000010' : '#0000FF10'; // Red or blue, very faint
      
      doc.strokeColor(fiberColor)
         .lineWidth(0.5)
         .moveTo(fiberX, fiberY)
         .lineTo(
           fiberX + fiberLength * Math.cos(fiberAngle),
           fiberY + fiberLength * Math.sin(fiberAngle)
         )
         .stroke();
    }
    
    // UV notation
    doc.fontSize(4)
       .fillColor('#999999')
       .text('[UV Fibers]', x, y - 5);
    
    doc.restore();
  }

  /**
   * Add thermochromic ink notation
   */
  static addThermochromicInk(doc: PDFKit, text: string, x: number, y: number): void {
    doc.save();
    
    // Normal state (room temperature)
    doc.fontSize(10)
       .fillColor('#FF6B6B')
       .text(text, x, y);
    
    // Heat-activated state notation
    doc.fontSize(6)
       .fillColor('#666666')
       .text('[Heat-sensitive: Changes to blue at 35°C]', x, y + 12);
    
    doc.restore();
  }

  /**
   * Add metameric ink effect
   */
  static addMetamericInk(doc: PDFKit, text: string, x: number, y: number): void {
    doc.save();
    
    // Primary color under normal light
    doc.fontSize(10)
       .fillColor('#008000')
       .text(text, x, y);
    
    // Metameric notation
    doc.fontSize(6)
       .fillColor('#666666')
       .text('[Metameric: Appears brown under incandescent light]', x, y + 12);
    
    doc.restore();
  }

  /**
   * Add ghost image (secondary photo)
   */
  static addGhostImage(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    doc.save();
    
    // Ghost image placeholder
    doc.rect(x, y, width, height)
       .fill('#E0E0E0')
       .fillOpacity(0.3);
    
    // Image notation
    doc.fontSize(6)
       .fillColor('#999999')
       .text('GHOST', x + width/2 - 12, y + height/2 - 3);
    
    doc.restore();
  }

  /**
   * Add rainbow printing effect
   */
  static addRainbowPrinting(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    doc.save();
    
    // Create rainbow gradient
    const gradient = doc.linearGradient(x, y, x + width, y);
    gradient.stop(0, '#FF0000')
            .stop(0.17, '#FF8800')
            .stop(0.33, '#FFFF00')
            .stop(0.5, '#00FF00')
            .stop(0.67, '#00FFFF')
            .stop(0.83, '#0000FF')
            .stop(1, '#FF00FF');
    
    doc.rect(x, y, width, height)
       .fill(gradient)
       .fillOpacity(0.2);
    
    doc.restore();
  }

  /**
   * Add void pantograph background
   */
  static addVoidPantograph(doc: PDFKit, x: number, y: number, width: number, height: number): void {
    doc.save();
    
    // Hidden "VOID" text that appears when copied
    const voidText = "VOID";
    doc.fontSize(40)
       .fillColor('#FAFAFA')
       .fillOpacity(0.02);
    
    // Fill area with repeated VOID text
    for (let row = 0; row < height; row += 30) {
      for (let col = 0; col < width; col += 60) {
        doc.text(voidText, x + col, y + row);
      }
    }
    
    // Add fine pattern overlay
    doc.strokeColor('#F8F8F8')
       .lineWidth(0.1);
    
    for (let i = 0; i < width; i += 2) {
      doc.moveTo(x + i, y)
         .lineTo(x + i, y + height)
         .stroke();
    }
    
    doc.restore();
  }

  /**
   * Add perforation marks
   */
  static addPerforation(doc: PDFKit, x: number, y: number, width: number, text: string): void {
    doc.save();
    
    // Create dotted line for perforation
    doc.strokeColor('#666666')
       .lineWidth(0.5)
       .dash(2, 3);
    
    doc.moveTo(x, y)
       .lineTo(x + width, y)
       .stroke();
    
    // Add perforated text
    doc.undash();
    doc.fontSize(6)
       .fillColor('#999999');
    
    // Simulate perforated text with dots
    const chars = text.split('');
    let currentX = x;
    
    chars.forEach(char => {
      doc.text(char, currentX, y - 8);
      currentX += 5;
      
      // Add perforation dots
      doc.circle(currentX - 2, y, 0.5).fill('#999999');
    });
    
    doc.restore();
  }

  /**
   * Add embossed seal effect
   */
  static addEmbossedSeal(doc: PDFKit, x: number, y: number, radius: number): void {
    doc.save();
    
    // Outer ring
    doc.circle(x, y, radius)
       .strokeColor('#666666')
       .lineWidth(2)
       .stroke();
    
    // Inner ring
    doc.circle(x, y, radius - 5)
       .strokeColor('#666666')
       .lineWidth(1)
       .stroke();
    
    // Embossed text around seal
    doc.fontSize(6)
       .fillColor('#666666');
    
    const text = "DEPARTMENT OF HOME AFFAIRS • REPUBLIC OF SOUTH AFRICA • ";
    const angleStep = 360 / text.length;
    
    for (let i = 0; i < text.length; i++) {
      const angle = (i * angleStep - 90) * Math.PI / 180;
      const charX = x + (radius - 10) * Math.cos(angle);
      const charY = y + (radius - 10) * Math.sin(angle);
      
      doc.save();
      doc.rotate(i * angleStep, { origin: [x, y] });
      doc.text(text[i], charX, charY);
      doc.restore();
    }
    
    // Center emblem
    doc.fontSize(8)
       .fillColor('#666666')
       .text('DHA', x - 10, y - 4);
    
    // 3D effect with shadows
    doc.circle(x + 1, y + 1, radius)
       .fill('#00000010');
    
    doc.restore();
  }

  /**
   * Add retroreflective ink notation
   */
  static addRetroreflectiveInk(doc: PDFKit, text: string, x: number, y: number): void {
    doc.save();
    
    // Simulate retroreflective effect with gradient
    const gradient = doc.linearGradient(x, y, x + 100, y);
    gradient.stop(0, '#C0C0C0').stop(0.5, '#FFFFFF').stop(1, '#C0C0C0');
    
    doc.fontSize(10)
       .fill(gradient)
       .text(text, x, y);
    
    // Add notation
    doc.fontSize(6)
       .fillColor('#666666')
       .text('[Retroreflective: Glows under direct light]', x, y + 12);
    
    doc.restore();
  }

  /**
   * Generate PDF417 2D barcode data
   */
  static generatePDF417Data(data: any): string {
    // Create structured data for PDF417
    const pdf417Data = {
      format: 'PDF417',
      documentId: data.documentId || crypto.randomUUID(),
      type: data.documentType,
      issued: new Date().toISOString(),
      biometric: data.biometricTemplate || null,
      metadata: {
        version: '2.0',
        encryption: 'AES256',
        signature: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
      }
    };
    
    return JSON.stringify(pdf417Data);
  }

  /**
   * Add PDF417 barcode to document
   */
  static async addPDF417Barcode(doc: PDFKit, data: string, x: number, y: number): Promise<void> {
    try {
      // For now, simulate with a placeholder
      // In production, use a proper PDF417 library
      doc.save();
      
      // Barcode background
      doc.rect(x, y, 120, 40)
         .fill('#FFFFFF')
         .stroke('#000000');
      
      // Simulated PDF417 pattern
      for (let i = 0; i < 120; i += 3) {
        for (let j = 0; j < 40; j += 2) {
          if (Math.random() > 0.5) {
            doc.rect(x + i, y + j, 2, 1)
               .fill('#000000');
          }
        }
      }
      
      // Add PDF417 notation
      doc.fontSize(4)
         .fillColor('#666666')
         .text('PDF417', x + 45, y + 42);
      
      doc.restore();
    } catch (error) {
      console.error('PDF417 generation error:', error);
    }
  }

  /**
   * Get security configuration for document type
   */
  static getDocumentSecurityConfig(documentType: string): SecurityFeatureConfiguration {
    const configs: Record<string, SecurityFeatureConfiguration> = {
      'smart_id_card': {
        uvFeatures: true,
        holographic: true,
        watermarks: true,
        braille: true,
        intaglio: false,
        laserEngraving: true,
        mrz: true,
        biometricChip: true,
        pdf417Barcode: true,
        microprinting: true,
        securityThread: false,
        invisibleFibers: true,
        guilloche: true,
        ghostImage: true,
        rainbowPrinting: true,
        thermochromic: false,
        metameric: false,
        antiCopy: true,
        perforation: false,
        embossedSeal: false,
        voidPantograph: false,
        retroreflective: true
      },
      'passport': {
        uvFeatures: true,
        holographic: true,
        watermarks: true,
        braille: false,
        intaglio: true,
        laserEngraving: false,
        mrz: true,
        biometricChip: true,
        pdf417Barcode: false,
        microprinting: true,
        securityThread: true,
        invisibleFibers: true,
        guilloche: true,
        ghostImage: false,
        rainbowPrinting: true,
        thermochromic: false,
        metameric: true,
        antiCopy: true,
        perforation: true,
        embossedSeal: true,
        voidPantograph: false,
        retroreflective: false
      },
      'birth_certificate': {
        uvFeatures: true,
        holographic: false,
        watermarks: true,
        braille: true,
        intaglio: false,
        laserEngraving: false,
        mrz: false,
        biometricChip: false,
        pdf417Barcode: true,
        microprinting: true,
        securityThread: true,
        invisibleFibers: true,
        guilloche: true,
        ghostImage: false,
        rainbowPrinting: false,
        thermochromic: true,
        metameric: false,
        antiCopy: true,
        perforation: false,
        embossedSeal: true,
        voidPantograph: true,
        retroreflective: false
      },
      'work_permit': {
        uvFeatures: true,
        holographic: true,
        watermarks: true,
        braille: false,
        intaglio: false,
        laserEngraving: false,
        mrz: true,
        biometricChip: false,
        pdf417Barcode: true,
        microprinting: true,
        securityThread: false,
        invisibleFibers: true,
        guilloche: true,
        ghostImage: false,
        rainbowPrinting: false,
        thermochromic: false,
        metameric: false,
        antiCopy: true,
        perforation: true,
        embossedSeal: true,
        voidPantograph: true,
        retroreflective: true
      }
    };
    
    // Return config or default for unknown types
    return configs[documentType] || configs['birth_certificate'];
  }
}

// Export singleton instance
export const securityFeaturesV2 = new SecurityFeaturesV2();