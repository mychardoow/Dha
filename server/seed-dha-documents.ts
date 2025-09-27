import { storage } from './storage';
import { nanoid } from 'nanoid';

// Helper functions
function generateDocumentNumber(documentType: string): string {
  const prefix = getDocumentPrefix(documentType);
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = nanoid(6).toUpperCase();
  return `${prefix}/${year}/${month}/${random}`;
}

function getDocumentPrefix(documentType: string): string {
  const prefixes: Record<string, string> = {
    'permanent_residence_permit': 'PRP',
    'naturalisation_certificate': 'NAT',
    'work_permit': 'WP',
    'relative_visa': 'RV',
    'refugee_permit': 'REF',
    'birth_certificate': 'BC'
  };
  return prefixes[documentType] || 'DOC';
}

// Seed data for the 11 documents as shown in the generator
export async function seedDhaDocuments() {
  console.log('🌱 Seeding DHA documents...');
  
  try {
    // Pre-defined verification codes for the 11 documents
    const documents = [
      {
        fullName: 'MUHAMMAD MOHSIN',
        passportNumber: 'AD0116281',
        nationality: 'PAKISTANI',
        dateOfBirth: '2018-05-15',
        gender: 'M' as const,
        documentType: 'permanent_residence_permit',
        verificationCode: 'DHA-2025-10001'
      },
      {
        fullName: 'TASLEEM MOHSIN', 
        passportNumber: 'AUD115281',
        nationality: 'PAKISTANI',
        dateOfBirth: '1987-01-01',
        gender: 'F' as const,
        documentType: 'permanent_residence_permit',
        verificationCode: 'DHA-2025-10002'
      },
      {
        fullName: 'KHUNSHA',
        passportNumber: 'KV4122911',
        idNumber: '35202-2423291-0',
        nationality: 'PAKISTANI',
        dateOfBirth: '2005-08-23',
        gender: 'F' as const,
        documentType: 'permanent_residence_permit',
        verificationCode: 'DHA-2025-10003'
      },
      {
        fullName: 'HAROON',
        passportNumber: 'DT9840361',
        idNumber: '35202-5214036-3',
        nationality: 'PAKISTANI',
        dateOfBirth: '2002-11-11',
        gender: 'M' as const,
        documentType: 'permanent_residence_permit',
        verificationCode: 'DHA-2025-10004'
      },
      {
        fullName: 'FAISAL',
        passportNumber: 'MD3535005',
        nationality: 'PAKISTANI',
        dateOfBirth: '1995-01-19',
        gender: 'M' as const,
        documentType: 'permanent_residence_permit',
        verificationCode: 'DHA-2025-10005'
      },
      {
        fullName: 'MUHAMMAD HASNAIN YOUNIS',
        passportNumber: 'CH6961586',
        idNumber: '37405-6961586-3',
        nationality: 'PAKISTANI',
        dateOfBirth: '1986-07-22',
        gender: 'M' as const,
        documentType: 'permanent_residence_permit',
        verificationCode: 'DHA-2025-10006'
      },
      {
        fullName: 'ANNA MUNAF',
        idNumber: '850825 1583 187',
        nationality: 'SOUTH AFRICAN',
        dateOfBirth: '1985-08-25',
        gender: 'F' as const,
        documentType: 'naturalisation_certificate',
        verificationCode: 'DHA-2025-20001'
      },
      {
        fullName: 'IKRAM IBRAHIM YUSUF MANSURI',
        passportNumber: '10611952',
        nationality: 'INDIAN',
        dateOfBirth: '1990-06-15',
        gender: 'M' as const,
        documentType: 'work_permit',
        verificationCode: 'DHA-2025-30001',
        employerDetails: {
          companyName: 'Head Office',
          position: 'General Worker',
          referenceNumber: 'JHB 76298/2025/WPVC'
        }
      },
      {
        fullName: 'ANISAH',
        passportNumber: 'PK8976543',
        nationality: 'PAKISTANI',
        dateOfBirth: '2010-03-20',
        gender: 'F' as const,
        documentType: 'relative_visa',
        verificationCode: 'DHA-2025-40001',
        relativeDetails: {
          name: 'Tasleem Mohsin',
          relationship: 'Daughter',
          sponsorID: 'PR/2025/10002'
        }
      },
      {
        fullName: 'FAATI ABDURAAM',
        refugeeNumber: 'PT4E000002015',
        nationality: 'SOMALI',
        dateOfBirth: '1992-04-12',
        gender: 'M' as const,
        documentType: 'refugee_permit',
        verificationCode: 'DHA-2025-50001'
      },
      {
        fullName: 'ZANEERAH ALLY',
        birthNumber: 'BC2014/0321/001',
        nationality: 'SOUTH AFRICAN',
        dateOfBirth: '2014-03-21',
        gender: 'F' as const,
        documentType: 'birth_certificate',
        verificationCode: 'DHA-2025-60001',
        motherName: 'Shera Ally'
      }
    ];

    for (const doc of documents) {
      // Check if document already exists
      const existingVerification = await storage.getDhaDocumentVerificationByCode(doc.verificationCode);
      if (existingVerification) {
        console.log(`✓ Document ${doc.verificationCode} already exists for ${doc.fullName}`);
        continue;
      }

      // Create applicant
      const applicantData = {
        fullName: doc.fullName,
        idNumber: doc.idNumber || null,
        passportNumber: doc.passportNumber || doc.refugeeNumber || doc.birthNumber || null,
        dateOfBirth: doc.dateOfBirth,
        nationality: doc.nationality,
        gender: doc.gender,
        isSouthAfricanCitizen: doc.nationality === 'SOUTH AFRICAN',
        address: 'South Africa',
        contactNumber: '+27000000000',
        email: `${doc.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`
      };

      const applicant = await storage.createDhaApplicant(applicantData);

      // Create document
      const documentData = {
        applicantId: applicant.id,
        documentType: doc.documentType,
        documentNumber: generateDocumentNumber(doc.documentType),
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: doc.documentType === 'birth_certificate' ? null : 
                    new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
        status: 'issued',
        referenceNumber: `REF-${nanoid(8).toUpperCase()}`,
        issueLocation: 'Department of Home Affairs',
        issuingOfficer: 'System Generated',
        relativeDetails: doc.relativeDetails || null,
        employerDetails: doc.employerDetails || null,
        metadata: {
          motherName: doc.motherName || null,
          refugeeNumber: doc.refugeeNumber || null,
          birthNumber: doc.birthNumber || null,
          seeded: true,
          seedDate: new Date().toISOString()
        }
      };

      const document = await storage.createDhaDocument(documentData);

      // Create verification record
      const verificationData = {
        documentId: document.id,
        verificationCode: doc.verificationCode,
        qrCodeData: JSON.stringify({
          documentNumber: document.documentNumber,
          documentType: doc.documentType,
          verificationCode: doc.verificationCode,
          issueDate: document.issueDate,
          name: doc.fullName
        }),
        verificationType: 'QR',
        isValid: true,
        verificationCount: 0
      };

      await storage.createDhaDocumentVerification(verificationData);

      console.log(`✅ Created document ${doc.verificationCode} for ${doc.fullName}`);
    }

    console.log('🎉 DHA documents seeding completed!');
    
    // Get stats
    const allDocs = await storage.getDhaDocuments();
    console.log(`📊 Total documents in database: ${allDocs.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding DHA documents:', error);
  }
}

// Auto-run when imported
seedDhaDocuments().catch(console.error);