// Document type schemas
import { z } from 'zod';

export const documentTypeSchemas = {
  smart_id_card: z.object({
    fullName: z.string().min(1, "Full name is required"),
    idNumber: z.string().min(13, "Valid SA ID number required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    sex: z.enum(['M', 'F']),
    nationality: z.string().default('South African'),
    countryOfBirth: z.string().default('South Africa'),
    status: z.string().default('Citizen')
  }),
  identity_document_book: z.object({
    fullName: z.string().min(1, "Full name is required"),
    placeOfBirth: z.string().min(1, "Place of birth is required"),
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']),
    occupation: z.string().optional()
  }),
  south_african_passport: z.object({
    fullName: z.string().min(1, "Full name is required"),
    passportNumber: z.string().min(1, "Passport number is required"),
    nationality: z.string().default('South African'),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    placeOfBirth: z.string().min(1, "Place of birth is required"),
    sex: z.enum(['M', 'F']),
    dateOfIssue: z.string().min(1, "Date of issue is required"),
    dateOfExpiry: z.string().min(1, "Date of expiry is required"),
    passportType: z.enum(['ordinary', 'diplomatic', 'official']).default('ordinary'),
    issuingAuthority: z.string().default('Department of Home Affairs')
  })
};

export const documentGenerationRequestSchema = z.object({
  documentType: z.enum([
    'smart_id_card',
    'identity_document_book',
    'south_african_passport'
  ]),
  data: z.any()
});

// Type exports
export type DocumentGenerationRequest = z.infer<typeof documentGenerationRequestSchema>;
export type SmartIdCardData = z.infer<typeof documentTypeSchemas.smart_id_card>;
export type IdentityDocumentBookData = z.infer<typeof documentTypeSchemas.identity_document_book>;
export type SouthAfricanPassportData = z.infer<typeof documentTypeSchemas.south_african_passport>;