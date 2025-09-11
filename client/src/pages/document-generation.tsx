import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileText, Download, Eye, Shield, CheckCircle, QrCode, Calendar, User, Hash,
  Baby, Heart, Plane, Skull, Briefcase, CreditCard, UserCheck, Search,
  Building2, Scan, Clock, AlertTriangle, FileCheck, Camera, Upload,
  Users, Globe, Lock, ShieldCheck
} from "lucide-react";

// ==================== FORM SCHEMAS ====================

// Refugee Document Schema
const refugeeDocumentSchema = z.object({
  documentType: z.enum(["section22_permit", "asylum_permit", "refugee_id", "refugee_travel"]),
  fullName: z.string().min(1, "Full name is required"),
  unhcrNumber: z.string().optional(),
  countryOfOrigin: z.string().min(1, "Country of origin is required"),
  dateOfEntry: z.string().min(1, "Date of entry is required"),
  campLocation: z.string().optional(),
  permitNumber: z.string().optional(),
  permitExpiryDate: z.string().optional(),
  maroonPassportNumber: z.string().optional(),
});

// Diplomatic Passport Schema
const diplomaticPassportSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  sex: z.enum(["M", "F", "X"]),
  nationality: z.string().min(1, "Nationality is required"),
  diplomaticNoteNumber: z.string().min(1, "Diplomatic note number is required"),
  embassy: z.string().min(1, "Embassy is required"),
  consulate: z.string().optional(),
  diplomaticRank: z.string().min(1, "Diplomatic rank is required"),
  immunityStatus: z.enum(["full", "partial", "none"]),
  countryOfAccreditation: z.string().min(1, "Country of accreditation is required"),
  emergencyContactEmbassy: z.string().min(1, "Emergency contact is required"),
});

const birthCertificateSchema = z.object({
  childFullName: z.string().min(1, "Child's full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  sex: z.enum(["male", "female", "other"]),
  motherFullName: z.string().min(1, "Mother's full name is required"),
  motherAge: z.number().min(1).optional(),
  fatherFullName: z.string().min(1, "Father's full name is required"),
  fatherAge: z.number().min(1).optional(),
  attendantType: z.string().optional(),
  attendantName: z.string().optional()
});

const marriageCertificateSchema = z.object({
  partner1FullName: z.string().min(1, "Partner 1 full name is required"),
  partner1Age: z.number().min(18, "Must be at least 18 years old"),
  partner1Occupation: z.string().optional(),
  partner2FullName: z.string().min(1, "Partner 2 full name is required"),
  partner2Age: z.number().min(18, "Must be at least 18 years old"),
  partner2Occupation: z.string().optional(),
  marriageDate: z.string().min(1, "Marriage date is required"),
  marriagePlace: z.string().min(1, "Marriage place is required"),
  officiantName: z.string().min(1, "Officiant name is required"),
  witness1Name: z.string().optional(),
  witness2Name: z.string().optional()
});

const passportSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  sex: z.enum(["M", "F", "X"]),
  nationality: z.string().min(1, "Nationality is required"),
  height: z.string().optional(),
  eyeColor: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required")
});

const deathCertificateSchema = z.object({
  deceasedFullName: z.string().min(1, "Deceased full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  dateOfDeath: z.string().min(1, "Date of death is required"),
  placeOfDeath: z.string().min(1, "Place of death is required"),
  causeOfDeath: z.string().min(1, "Cause of death is required"),
  mannerOfDeath: z.string().optional(),
  certifyingPhysician: z.string().min(1, "Certifying physician is required"),
  informantName: z.string().optional(),
  relationshipToDeceased: z.string().optional()
});

const workPermitSchema = z.object({
  employeeFullName: z.string().min(1, "Employee full name is required"),
  employeeNationality: z.string().min(1, "Employee nationality is required"),
  employeePassportNumber: z.string().min(1, "Employee passport number is required"),
  employerName: z.string().min(1, "Employer name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  workLocation: z.string().min(1, "Work location is required"),
  validFrom: z.string().min(1, "Valid from date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  jobDescription: z.string().optional()
});

const permanentVisaSchema = z.object({
  holderFullName: z.string().min(1, "Holder full name is required"),
  holderNationality: z.string().min(1, "Holder nationality is required"),
  holderPassportNumber: z.string().min(1, "Holder passport number is required"),
  visaType: z.string().min(1, "Visa type is required"),
  visaCategory: z.string().min(1, "Visa category is required"),
  countryOfIssue: z.string().min(1, "Country of issue is required"),
  validFrom: z.string().min(1, "Valid from date is required"),
  expiryDate: z.string().optional(),
  portOfEntry: z.string().optional()
});

const idCardSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(["M", "F", "X"]),
  nationality: z.string().min(1, "Nationality is required"),
  address: z.string().min(1, "Address is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  parentNames: z.string().optional(),
  emergencyContact: z.string().optional()
});

const verificationSchema = z.object({
  verificationCode: z.string().min(1, "Verification code is required"),
  documentType: z.enum([
    "birth_certificate", "marriage_certificate", "passport", 
    "death_certificate", "work_permit", "permanent_visa", "id_card"
  ]).optional()
});

// Certificate form schema for general certificates
const certificateFormSchema = z.object({
  type: z.string().min(1, "Certificate type is required"),
  templateType: z.string().min(1, "Template type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  expiresAt: z.string().optional(),
  data: z.record(z.any()).optional()
});

// ==================== DHA FORM SCHEMAS ====================

// DHA Applicant Profile Schema
const dhaApplicantSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  surname: z.string().min(1, "Surname is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  citizenshipStatus: z.enum(["citizen", "permanent_resident", "temporary_resident", "foreign_national"]),
  idNumber: z.string().min(13, "Valid ID number is required"),
  passportNumber: z.string().optional(),
  nationality: z.string().min(1, "Nationality is required"),
  contactDetails: z.object({
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email("Valid email is required"),
    address: z.string().min(1, "Address is required")
  }),
  parentDetails: z.object({
    motherFullName: z.string().optional(),
    fatherFullName: z.string().optional()
  }).optional()
});

// DHA Application Schema
const dhaApplicationSchema = z.object({
  applicantId: z.string().min(1, "Applicant ID is required"),
  applicationType: z.enum([
    "new_passport", "passport_renewal", "emergency_travel_document",
    "id_book", "smart_id_card", "birth_certificate", "marriage_certificate", "death_certificate"
  ]),
  priorityLevel: z.enum(["urgent", "standard", "low"]).default("standard"),
  documents: z.array(z.string()).optional(),
  specialRequests: z.string().optional()
});

// MRZ Scanning Schema
const mrzScanSchema = z.object({
  applicantId: z.string().min(1, "Applicant ID is required"),
  applicationId: z.string().min(1, "Application ID is required"),
  mrzLine1: z.string().min(30, "MRZ Line 1 must be at least 30 characters"),
  mrzLine2: z.string().min(30, "MRZ Line 2 must be at least 30 characters"),
  passportImage: z.string().optional()
});

// Identity Verification Schema
const identityVerificationSchema = z.object({
  applicantId: z.string().min(1, "Applicant ID is required"),
  applicationId: z.string().min(1, "Application ID is required"),
  idNumber: z.string().min(13, "Valid ID number is required"),
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().optional()
});

// Background Check Consent Schema
const backgroundCheckSchema = z.object({
  applicantId: z.string().min(1, "Applicant ID is required"),
  applicationId: z.string().min(1, "Application ID is required"),
  purpose: z.enum(["employment", "immigration", "adoption", "firearm_license", "other"]),
  consentGiven: z.boolean().refine(val => val === true, "Consent is required for background check"),
  additionalInfo: z.string().optional()
});

// Permit form schema for general permits
const permitFormSchema = z.object({
  type: z.string().min(1, "Permit type is required"),
  templateType: z.string().min(1, "Template type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  expiresAt: z.string().optional(),
  data: z.record(z.any()).optional(),
  conditions: z.record(z.any()).optional()
});

// ==================== INTERFACES ====================

interface DocumentTemplate {
  id: string;
  name: string;
  type: "certificate" | "permit";
  category: string;
  description?: string;
}

interface Certificate {
  id: string;
  type: string;
  title: string;
  description: string;
  status: "active" | "expired" | "revoked";
  serialNumber: string;
  issuedAt: string;
  expiresAt?: string;
  verificationCode: string;
  userId: string;
  documentUrl?: string;
  qrCodeUrl?: string;
}

interface Permit {
  id: string;
  type: string;
  title: string;
  description: string;
  status: "active" | "expired" | "revoked";
  permitNumber: string;
  issuedAt: string;
  expiresAt?: string;
  verificationCode: string;
  userId: string;
  conditions?: Record<string, any>;
  documentUrl?: string;
  qrCodeUrl?: string;
}

interface BaseDocument {
  id: string;
  userId: string;
  verificationCode: string;
  createdAt: string;
}

interface BirthCertificate extends BaseDocument {
  childFullName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  sex: string;
  motherFullName: string;
  fatherFullName: string;
  registrationNumber: string;
}

interface MarriageCertificate extends BaseDocument {
  partner1FullName: string;
  partner2FullName: string;
  marriageDate: string;
  marriagePlace: string;
  licenseNumber: string;
}

interface Passport extends BaseDocument {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  expiryDate: string;
  sex: string;
}

interface DeathCertificate extends BaseDocument {
  deceasedFullName: string;
  dateOfDeath: string;
  placeOfDeath: string;
  causeOfDeath: string;
  registrationNumber: string;
}

interface WorkPermit extends BaseDocument {
  employeeFullName: string;
  employerName: string;
  jobTitle: string;
  permitNumber: string;
  validFrom: string;
  validUntil: string;
}

interface PermanentVisa extends BaseDocument {
  holderFullName: string;
  visaType: string;
  visaNumber: string;
  countryOfIssue: string;
  validFrom: string;
}

interface IdCard extends BaseDocument {
  fullName: string;
  dateOfBirth: string;
  address: string;
  idNumber: string;
  expiryDate: string;
}

interface VerificationResult {
  isValid: boolean;
  documentType?: string;
  verificationCode?: string;
  verificationTimestamp: string;
  message?: string;
}

type DocumentType = "birth_certificate" | "marriage_certificate" | "passport" | 
                   "death_certificate" | "work_permit" | "permanent_visa" | "id_card";

export default function DocumentGenerationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generate");
  const [documentType, setDocumentType] = useState<"certificate" | "permit">("certificate");
  
  // Forms
  const certificateForm = useForm<z.infer<typeof certificateFormSchema>>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: {
      type: "",
      templateType: "",
      title: "",
      description: "",
      expiresAt: "",
      data: {}
    }
  });

  const permitForm = useForm<z.infer<typeof permitFormSchema>>({
    resolver: zodResolver(permitFormSchema),
    defaultValues: {
      type: "",
      templateType: "",
      title: "",
      description: "",
      expiresAt: "",
      data: {},
      conditions: {}
    }
  });

  // Queries
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/templates', documentType],
    enabled: !!documentType
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['/api/certificates']
  });

  const { data: permits = [] } = useQuery({
    queryKey: ['/api/permits']
  });

  // Mutations
  const generateCertificateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof certificateFormSchema>) => {
      const response = await apiRequest('POST', '/api/certificates', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      certificateForm.reset();
      toast({
        title: "Certificate Generated",
        description: "Your certificate has been generated successfully.",
        className: "border-green-500 bg-green-50"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate certificate",
        variant: "destructive"
      });
    }
  });

  const generatePermitMutation = useMutation({
    mutationFn: async (data: z.infer<typeof permitFormSchema>) => {
      const response = await apiRequest('POST', '/api/permits', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/permits'] });
      permitForm.reset();
      toast({
        title: "Permit Generated",
        description: "Your permit has been generated successfully.",
        className: "border-green-500 bg-green-50"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate permit",
        variant: "destructive"
      });
    }
  });

  const onCertificateSubmit = (values: z.infer<typeof certificateFormSchema>) => {
    generateCertificateMutation.mutate(values);
  };

  const onPermitSubmit = (values: z.infer<typeof permitFormSchema>) => {
    generatePermitMutation.mutate(values);
  };

  return (
    <div className="min-h-screen dha-page">
      {/* Official DHA Header */}
      <div className="dha-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="official-seal w-16 h-16 flex items-center justify-center text-3xl">
                🇿🇦
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Department of Home Affairs
                </h1>
                <p className="text-white/90">Republic of South Africa • Digital Services Platform</p>
              </div>
            </div>
            <p className="text-white/80 max-w-2xl mx-auto mb-4">
              Official government document services, certificate generation, and citizen verification portal.
            </p>
            <Badge className="dha-badge">
              <CheckCircle className="h-4 w-4 mr-1" />
              Government Authorized
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 government-card p-2">
            <TabsTrigger value="generate" data-testid="tab-generate">
              <FileText className="h-4 w-4 mr-2" />
              Generate Documents
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              <Shield className="h-4 w-4 mr-2" />
              Certificates ({(certificates as Certificate[]).length})
            </TabsTrigger>
            <TabsTrigger value="permits" data-testid="tab-permits">
              <User className="h-4 w-4 mr-2" />
              Permits ({(permits as Permit[]).length})
            </TabsTrigger>
            <TabsTrigger value="dha" data-testid="tab-dha">
              <Building2 className="h-4 w-4 mr-2" />
              DHA Services
            </TabsTrigger>
          </TabsList>

          {/* Generate Documents Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card className="government-card">
              <CardHeader className="border-b border-certificate-green">
                <CardTitle className="text-primary flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Official DHA Document Generator
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generate authentic government documents with advanced security features and digital verification
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Document Type Selection */}
                  <div className="flex gap-4">
                    <Button
                      variant={documentType === "certificate" ? "default" : "outline"}
                      onClick={() => setDocumentType("certificate")}
                      className="flex-1"
                      data-testid="button-select-certificate"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Certificate
                    </Button>
                    <Button
                      variant={documentType === "permit" ? "default" : "outline"}
                      onClick={() => setDocumentType("permit")}
                      className="flex-1"
                      data-testid="button-select-permit"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Permit
                    </Button>
                  </div>

                  <Separator />

                  {/* Certificate Form */}
                  {documentType === "certificate" && (
                    <Form {...certificateForm}>
                      <form onSubmit={certificateForm.handleSubmit(onCertificateSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={certificateForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Certificate Type</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger data-testid="select-certificate-type">
                                      <SelectValue placeholder="Select certificate type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="completion">Completion Certificate</SelectItem>
                                      <SelectItem value="achievement">Achievement Certificate</SelectItem>
                                      <SelectItem value="compliance">Compliance Certificate</SelectItem>
                                      <SelectItem value="training">Training Certificate</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={certificateForm.control}
                            name="templateType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger data-testid="select-certificate-template">
                                      <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(templates as DocumentTemplate[])
                                        .filter((t: DocumentTemplate) => t.type === "certificate")
                                        .map((template: DocumentTemplate) => (
                                          <SelectItem key={template.id} value={template.id}>
                                            {template.name}
                                          </SelectItem>
                                        ))
                                      }
                                      <SelectItem value="default">Default Official Template</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={certificateForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Certificate Title</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="e.g., Certificate of Completion"
                                  data-testid="input-certificate-title"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={certificateForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Detailed description of the certificate..."
                                  rows={3}
                                  data-testid="textarea-certificate-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={certificateForm.control}
                          name="expiresAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="date"
                                  data-testid="input-certificate-expiry"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={generateCertificateMutation.isPending}
                          data-testid="button-generate-certificate"
                        >
                          {generateCertificateMutation.isPending ? "Generating..." : "Generate Certificate"}
                        </Button>
                      </form>
                    </Form>
                  )}

                  {/* Permit Form */}
                  {documentType === "permit" && (
                    <Form {...permitForm}>
                      <form onSubmit={permitForm.handleSubmit(onPermitSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={permitForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Permit Type</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger data-testid="select-permit-type">
                                      <SelectValue placeholder="Select permit type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="building">Building Permit</SelectItem>
                                      <SelectItem value="business">Business Permit</SelectItem>
                                      <SelectItem value="special_event">Special Event Permit</SelectItem>
                                      <SelectItem value="environmental">Environmental Permit</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={permitForm.control}
                            name="templateType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger data-testid="select-permit-template">
                                      <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(templates as DocumentTemplate[])
                                        .filter((t: DocumentTemplate) => t.type === "permit")
                                        .map((template: DocumentTemplate) => (
                                          <SelectItem key={template.id} value={template.id}>
                                            {template.name}
                                          </SelectItem>
                                        ))
                                      }
                                      <SelectItem value="default">Default Official Template</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={permitForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Permit Title</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="e.g., Building Construction Permit"
                                  data-testid="input-permit-title"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={permitForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Detailed description of the permit..."
                                  rows={3}
                                  data-testid="textarea-permit-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={permitForm.control}
                          name="expiresAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="date"
                                  data-testid="input-permit-expiry"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={generatePermitMutation.isPending}
                          data-testid="button-generate-permit"
                        >
                          {generatePermitMutation.isPending ? "Generating..." : "Generate Permit"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <div className="space-y-4">
              {(certificates as Certificate[]).map((certificate: Certificate) => (
                <Card key={certificate.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg" data-testid={`text-certificate-title-${certificate.id}`}>
                            {certificate.title}
                          </h3>
                          <Badge variant={certificate.status === "active" ? "default" : "secondary"}>
                            {certificate.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{certificate.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            <span>Serial: {certificate.serialNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Issued: {new Date(certificate.issuedAt).toLocaleDateString()}</span>
                          </div>
                          {certificate.expiresAt && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Expires: {new Date(certificate.expiresAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {certificate.documentUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(certificate.documentUrl, '_blank')}
                            data-testid={`button-download-certificate-${certificate.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {certificate.qrCodeUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(certificate.qrCodeUrl, '_blank')}
                            data-testid={`button-qr-certificate-${certificate.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-view-certificate-${certificate.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(certificates as Certificate[]).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
                    <p className="text-muted-foreground">
                      Generate your first certificate using the Document Generator.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Permits Tab */}
          <TabsContent value="permits">
            <div className="space-y-4">
              {(permits as Permit[]).map((permit: Permit) => (
                <Card key={permit.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg" data-testid={`text-permit-title-${permit.id}`}>
                            {permit.title}
                          </h3>
                          <Badge variant={permit.status === "active" ? "default" : "secondary"}>
                            {permit.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{permit.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            <span>Number: {permit.permitNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Issued: {new Date(permit.issuedAt).toLocaleDateString()}</span>
                          </div>
                          {permit.expiresAt && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Expires: {new Date(permit.expiresAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {permit.documentUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(permit.documentUrl, '_blank')}
                            data-testid={`button-download-permit-${permit.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {permit.qrCodeUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(permit.qrCodeUrl, '_blank')}
                            data-testid={`button-qr-permit-${permit.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-view-permit-${permit.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(permits as Permit[]).length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Permits Yet</h3>
                    <p className="text-muted-foreground">
                      Generate your first permit using the Document Generator.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* DHA Services Tab */}
          <TabsContent value="dha">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* DHA Applicant Profile */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Create Applicant Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...useForm({
                      resolver: zodResolver(dhaApplicantSchema),
                      defaultValues: {
                        fullName: "",
                        surname: "",
                        dateOfBirth: "",
                        placeOfBirth: "",
                        citizenshipStatus: "citizen",
                        idNumber: "",
                        nationality: "South African",
                        contactDetails: {
                          phone: "",
                          email: "",
                          address: ""
                        }
                      }
                    })}>
                      <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} data-testid="input-dha-full-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="surname"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Surname</FormLabel>
                                <FormControl>
                                  <Input placeholder="Smith" {...field} data-testid="input-dha-surname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            name="dateOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-dha-dob" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="placeOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Place of Birth</FormLabel>
                                <FormControl>
                                  <Input placeholder="Cape Town" {...field} data-testid="input-dha-pob" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          name="idNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>South African ID Number</FormLabel>
                              <FormControl>
                                <Input placeholder="8001015009087" {...field} data-testid="input-dha-id-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="citizenshipStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Citizenship Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-dha-citizenship">
                                    <SelectValue placeholder="Select citizenship status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="citizen">South African Citizen</SelectItem>
                                  <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                                  <SelectItem value="temporary_resident">Temporary Resident</SelectItem>
                                  <SelectItem value="foreign_national">Foreign National</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-4">
                          <h4 className="font-medium">Contact Details</h4>
                          <FormField
                            name="contactDetails.email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="john@example.com" {...field} data-testid="input-dha-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="contactDetails.phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+27 12 345 6789" {...field} data-testid="input-dha-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="contactDetails.address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Physical Address</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="123 Main Street, Cape Town, 8001" {...field} data-testid="input-dha-address" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" className="w-full" data-testid="button-create-dha-applicant">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Create DHA Profile
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* DHA Application Submission */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Submit DHA Application
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...useForm({
                      resolver: zodResolver(dhaApplicationSchema),
                      defaultValues: {
                        applicantId: "",
                        applicationType: "new_passport",
                        priorityLevel: "standard"
                      }
                    })}>
                      <form className="space-y-4">
                        <FormField
                          name="applicantId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Applicant Profile</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-dha-applicant">
                                    <SelectValue placeholder="Select applicant profile" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sample-id">John Smith (8001015009087)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="applicationType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Application Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-dha-application-type">
                                    <SelectValue placeholder="Select application type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="new_passport">New Passport</SelectItem>
                                  <SelectItem value="passport_renewal">Passport Renewal</SelectItem>
                                  <SelectItem value="emergency_travel_document">Emergency Travel Document</SelectItem>
                                  <SelectItem value="id_book">ID Book</SelectItem>
                                  <SelectItem value="smart_id_card">Smart ID Card</SelectItem>
                                  <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
                                  <SelectItem value="marriage_certificate">Marriage Certificate</SelectItem>
                                  <SelectItem value="death_certificate">Death Certificate</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="priorityLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-dha-priority">
                                    <SelectValue placeholder="Select priority level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="standard">Standard (4-6 weeks)</SelectItem>
                                  <SelectItem value="urgent">Urgent (2-3 weeks) - Additional fee</SelectItem>
                                  <SelectItem value="low">Low Priority (6-8 weeks)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="specialRequests"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Requests (Optional)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Any special requirements or requests..." {...field} data-testid="input-dha-special-requests" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" data-testid="button-submit-dha-application">
                          <FileText className="h-4 w-4 mr-2" />
                          Submit Application
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

              </div>

              {/* Verification Services */}
              <div className="grid gap-6 md:grid-cols-3">
                
                {/* MRZ Passport Scanning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="h-5 w-5" />
                      Passport MRZ Scanner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...useForm({
                      resolver: zodResolver(mrzScanSchema),
                      defaultValues: {
                        applicantId: "",
                        applicationId: "",
                        mrzLine1: "",
                        mrzLine2: ""
                      }
                    })}>
                      <form className="space-y-4">
                        <FormField
                          name="mrzLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MRZ Line 1</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="P<ZAFSMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<" 
                                  {...field} 
                                  data-testid="input-mrz-line1"
                                  className="font-mono text-xs"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="mrzLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MRZ Line 2</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="A12345678ZAF8001015M2501017<<<<<<<<<<<<<<<4" 
                                  {...field} 
                                  data-testid="input-mrz-line2"
                                  className="font-mono text-xs"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Upload passport photo</p>
                          <Button variant="outline" size="sm" className="mt-2" data-testid="button-upload-passport">
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                        <Button type="submit" className="w-full" data-testid="button-scan-mrz">
                          <Scan className="h-4 w-4 mr-2" />
                          Parse MRZ Data
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Identity Verification */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      NPR Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...useForm({
                      resolver: zodResolver(identityVerificationSchema),
                      defaultValues: {
                        applicantId: "",
                        applicationId: "",
                        idNumber: "",
                        fullName: "",
                        dateOfBirth: ""
                      }
                    })}>
                      <form className="space-y-4">
                        <FormField
                          name="idNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID Number</FormLabel>
                              <FormControl>
                                <Input placeholder="8001015009087" {...field} data-testid="input-verify-id-number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Smith" {...field} data-testid="input-verify-full-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-verify-dob" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" data-testid="button-verify-identity">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Verify with NPR
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Background Check */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Background Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...useForm({
                      resolver: zodResolver(backgroundCheckSchema),
                      defaultValues: {
                        applicantId: "",
                        applicationId: "",
                        purpose: "employment",
                        consentGiven: false
                      }
                    })}>
                      <form className="space-y-4">
                        <FormField
                          name="purpose"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purpose</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-background-purpose">
                                    <SelectValue placeholder="Select purpose" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="employment">Employment</SelectItem>
                                  <SelectItem value="immigration">Immigration</SelectItem>
                                  <SelectItem value="adoption">Adoption</SelectItem>
                                  <SelectItem value="firearm_license">Firearm License</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-800">POPIA Consent Required</p>
                              <p className="text-amber-700">
                                This will check your criminal record with SAPS. Your personal information will be processed according to POPIA.
                              </p>
                            </div>
                          </div>
                        </div>
                        <FormField
                          name="consentGiven"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  data-testid="checkbox-background-consent"
                                  className="mt-1"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm">
                                  I consent to a background check being performed
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  This is required for certain application types
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" data-testid="button-background-check">
                          <Shield className="h-4 w-4 mr-2" />
                          Request Background Check
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

              </div>

              {/* Application Status Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Application Status Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">DHA2025NP123456</Badge>
                            <span className="text-sm text-muted-foreground">New Passport Application</span>
                          </div>
                          <Badge variant="outline" className="text-blue-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Identity Verification
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Submitted: 2025-01-10</span>
                          <span>Est. Completion: 2025-02-15</span>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">Progress</span>
                            <span className="text-xs text-muted-foreground">25%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{width: '25%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active Applications</h3>
                      <p className="text-muted-foreground mb-4">
                        Submit your first DHA application to track its progress here.
                      </p>
                      <Button variant="outline" data-testid="button-new-application">
                        <FileText className="h-4 w-4 mr-2" />
                        New Application
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Public Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Document Verification Portal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Verify the authenticity of DHA-issued documents using their verification codes.
                    </p>
                    <Form {...useForm({
                      resolver: zodResolver(verificationSchema),
                      defaultValues: {
                        verificationCode: ""
                      }
                    })}>
                      <form className="space-y-4">
                        <FormField
                          name="verificationCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification Code</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="DHA2025NP123456" 
                                  {...field} 
                                  data-testid="input-verification-code"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" data-testid="button-verify-document">
                          <Search className="h-4 w-4 mr-2" />
                          Verify Document
                        </Button>
                      </form>
                    </Form>
                    
                    <div className="border border-green-200 bg-green-50 p-3 rounded-lg hidden" data-testid="verification-result">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Document Verified</p>
                          <p className="text-green-700">
                            This document is authentic and was issued by the Department of Home Affairs.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}