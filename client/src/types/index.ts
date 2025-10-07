import { z } from 'zod';

// Re-export zod for use in other files
export { z };

// Define base types
export interface BaseDocument {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Export common types used across the application
export type DocumentType = 
  | 'smart_id_card'
  | 'identity_document_book'
  | 'south_african_passport';

export interface DocumentTemplate extends BaseDocument {
  type: DocumentType;
  name: string;
  displayName: string;
  description: string;
  category: string;
  formNumber: string;
  icon: string;
  color: string;
  isImplemented: boolean;
  requirements: string[];
  securityFeatures: string[];
  processingTime: string;
  fees: string;
}