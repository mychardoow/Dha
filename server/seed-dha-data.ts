import { db } from "./db";
import { 
  dhaApplicants, 
  dhaDocuments, 
  dhaDocumentVerifications,
  DHA_DOCUMENT_TYPES
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function seedDhaData() {
  console.log("🌱 Seeding DHA database...");

  try {
    // Create tables using raw SQL to ensure they exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dha_applicants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        id_number TEXT,
        passport_number TEXT,
        date_of_birth TEXT NOT NULL,
        nationality TEXT NOT NULL,
        gender TEXT NOT NULL,
        address TEXT,
        contact_number TEXT,
        email TEXT,
        is_south_african_citizen BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dha_documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        applicant_id VARCHAR NOT NULL REFERENCES dha_applicants(id),
        document_type TEXT NOT NULL,
        document_number TEXT NOT NULL UNIQUE,
        issue_date TEXT NOT NULL,
        expiry_date TEXT,
        status TEXT NOT NULL,
        reference_number TEXT,
        permit_category TEXT,
        visa_type TEXT,
        relative_details JSONB,
        qualifications JSONB,
        employer_details JSONB,
        issue_location TEXT DEFAULT 'Department of Home Affairs',
        issuing_officer TEXT,
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dha_document_verifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR NOT NULL REFERENCES dha_documents(id),
        verification_code TEXT NOT NULL UNIQUE,
        qr_code_data TEXT NOT NULL,
        qr_code_url TEXT,
        verification_type TEXT NOT NULL DEFAULT 'QR',
        is_valid BOOLEAN NOT NULL DEFAULT true,
        last_verified_at TIMESTAMP,
        verification_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        expires_at TIMESTAMP
      )
    `);

    console.log("✅ Tables created successfully");

    // Seed Pakistani applicants
    const pakistaniApplicants = [
      {
        fullName: "Muhammad Hasnain Younis",
        idNumber: "37405-6961586-3",
        dateOfBirth: "1986-07-22",
        nationality: "Pakistani",
        gender: "M",
        address: "123 Main Street, Johannesburg",
        isSouthAfricanCitizen: false
      },
      {
        fullName: "Anna Munaf",
        dateOfBirth: "1965-08-25",
        nationality: "Pakistani",
        gender: "F",
        address: "456 Park Avenue, Cape Town",
        isSouthAfricanCitizen: false
      },
      {
        fullName: "Ikram Ibrahim Yusuf Mansuri",
        passportNumber: "10611952",
        dateOfBirth: "1980-03-15",
        nationality: "Pakistani",
        gender: "M",
        address: "789 Oak Road, Durban",
        isSouthAfricanCitizen: false
      },
      {
        fullName: "Annisa Mansuri",
        dateOfBirth: "1985-11-10",
        nationality: "Pakistani",
        gender: "F",
        address: "789 Oak Road, Durban",
        isSouthAfricanCitizen: false
      },
      {
        fullName: "Ahmed Ali Khan",
        passportNumber: "PK9876543",
        dateOfBirth: "1975-05-20",
        nationality: "Pakistani",
        gender: "M",
        address: "321 Rose Street, Pretoria",
        isSouthAfricanCitizen: false
      }
    ];

    // Seed South African citizens
    const southAfricanApplicants = [
      {
        fullName: "Shera Banoo Ally",
        idNumber: "8210070213084",
        dateOfBirth: "1982-10-07",
        nationality: "South African",
        gender: "F",
        address: "100 Freedom Way, Johannesburg",
        isSouthAfricanCitizen: true
      },
      {
        fullName: "Zaheera Osman",
        dateOfBirth: "2005-06-15",
        nationality: "South African",
        gender: "F",
        address: "100 Freedom Way, Johannesburg",
        isSouthAfricanCitizen: true
      }
    ];

    // Insert applicants
    const insertedPakistaniApplicants = [];
    for (const applicant of pakistaniApplicants) {
      const result = await db.insert(dhaApplicants).values(applicant).returning();
      insertedPakistaniApplicants.push(result[0]);
      console.log(`✅ Added applicant: ${applicant.fullName}`);
    }

    const insertedSAApplicants = [];
    for (const applicant of southAfricanApplicants) {
      const result = await db.insert(dhaApplicants).values(applicant).returning();
      insertedSAApplicants.push(result[0]);
      console.log(`✅ Added applicant: ${applicant.fullName}`);
    }

    // Add asylum seeker
    const asylumSeeker = await db.insert(dhaApplicants).values({
      fullName: "John Doe",
      dateOfBirth: "1990-01-01",
      nationality: "Unknown",
      gender: "M",
      address: "Refugee Camp, Cape Town",
      isSouthAfricanCitizen: false
    }).returning();
    console.log(`✅ Added asylum seeker`);

    // Create documents for applicants
    const documents = [
      // Muhammad Hasnain - Work Visa
      {
        applicantId: insertedPakistaniApplicants[0].id,
        documentType: DHA_DOCUMENT_TYPES.GENERAL_WORK_VISA,
        documentNumber: "WV2024001",
        issueDate: "2024-01-15",
        expiryDate: "2026-01-14",
        status: "active",
        visaType: "General Work",
        employerDetails: { company: "Tech Solutions SA", position: "Software Developer" }
      },
      // Anna Munaf - Permanent Residence
      {
        applicantId: insertedPakistaniApplicants[1].id,
        documentType: DHA_DOCUMENT_TYPES.PERMANENT_RESIDENCE_PERMIT,
        documentNumber: "PRP2023567",
        issueDate: "2023-06-20",
        status: "active",
        permitCategory: "Spouse of SA Citizen"
      },
      // Ikram Mansuri - Critical Skills Visa
      {
        applicantId: insertedPakistaniApplicants[2].id,
        documentType: DHA_DOCUMENT_TYPES.CRITICAL_SKILLS_WORK_VISA,
        documentNumber: "CSV2024089",
        issueDate: "2024-03-10",
        expiryDate: "2029-03-09",
        status: "active",
        qualifications: { degree: "PhD Engineering", skills: "Aerospace Engineering" }
      },
      // Annisa Mansuri - Relatives Visa
      {
        applicantId: insertedPakistaniApplicants[3].id,
        documentType: DHA_DOCUMENT_TYPES.RELATIVES_VISA,
        documentNumber: "RV2024456",
        issueDate: "2024-02-01",
        expiryDate: "2025-02-01",
        status: "active",
        relativeDetails: { relativeName: "Ikram Ibrahim Yusuf Mansuri", relationship: "Wife" }
      },
      // Ahmed Ali Khan - Permanent Residence
      {
        applicantId: insertedPakistaniApplicants[4].id,
        documentType: DHA_DOCUMENT_TYPES.PERMANENT_RESIDENCE_PERMIT,
        documentNumber: "PRP2024789",
        issueDate: "2024-04-15",
        status: "active",
        permitCategory: "Business"
      },
      // Shera Banoo - Birth Certificate for Zaheera
      {
        applicantId: insertedSAApplicants[0].id,
        documentType: DHA_DOCUMENT_TYPES.BIRTH_CERTIFICATE,
        documentNumber: "BC2005123456",
        issueDate: "2005-06-20",
        status: "active",
        metadata: { childName: "Zaheera Osman", motherName: "Shera Banoo Ally" }
      },
      // Asylum Seeker Permit
      {
        applicantId: asylumSeeker[0].id,
        documentType: DHA_DOCUMENT_TYPES.ASYLUM_SEEKER_PERMIT,
        documentNumber: "ASP2024001",
        issueDate: "2024-01-01",
        expiryDate: "2024-12-31",
        status: "active",
        referenceNumber: "P7AZ000920215"
      }
    ];

    // Insert documents and create verifications
    for (const doc of documents) {
      const insertedDoc = await db.insert(dhaDocuments).values(doc).returning();
      console.log(`✅ Added document: ${doc.documentType} - ${doc.documentNumber}`);

      // Create verification for each document
      const verificationCode = `VER${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
      const qrData = JSON.stringify({
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        verificationCode,
        issueDate: doc.issueDate
      });

      await db.insert(dhaDocumentVerifications).values({
        documentId: insertedDoc[0].id,
        verificationCode,
        qrCodeData: qrData,
        verificationType: "QR"
      }).returning();
      console.log(`✅ Added verification code for document: ${doc.documentNumber}`);
    }

    console.log("\n🎉 DHA database seeding completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - ${pakistaniApplicants.length} Pakistani applicants added`);
    console.log(`   - ${southAfricanApplicants.length} South African citizens added`);
    console.log(`   - 1 Asylum seeker added`);
    console.log(`   - ${documents.length} documents created`);
    console.log(`   - ${documents.length} verification codes generated`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seedDhaData()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export default seedDhaData;