import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Download,
  Check,
  Loader2,
  FileCheck,
  UserCheck,
  Home,
  Globe,
  CreditCard,
  Baby,
  Shield,
  Users
} from "lucide-react";

interface DocumentData {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  applicantData: {
    fullName: string;
    idNumber?: string;
    passportNumber?: string;
    dateOfBirth: string;
    nationality: string;
    gender: "M" | "F" | "X";
    address?: string;
    contactNumber?: string;
    email?: string;
    isSouthAfricanCitizen?: boolean;
  };
  documentType: string;
  permitCategory?: string;
  additionalData?: Record<string, any>;
}

export default function DhaDocuments() {
  const { toast } = useToast();
  const [generatedDocuments, setGeneratedDocuments] = useState<Record<string, any>>({});
  const [creatingApplicants, setCreatingApplicants] = useState<Record<string, boolean>>({});

  // Document data for all 11 specified documents
  const documents: DocumentData[] = [
    {
      id: "hasnain-permit",
      title: "Permanent Residence Permit",
      description: "Muhammad Hasnain Younis - Pakistani National",
      icon: CreditCard,
      color: "bg-green-500",
      applicantData: {
        fullName: "Muhammad Hasnain Younis",
        idNumber: "37405-6961586-3",
        dateOfBirth: "1985-03-15",
        nationality: "Pakistani",
        gender: "M",
        address: "123 Main Road, Johannesburg, Gauteng, 2001",
        contactNumber: "+27123456789",
        email: "hasnain.younis@email.com",
        isSouthAfricanCitizen: false
      },
      documentType: "permanent_residence_permit",
      permitCategory: "Work",
      additionalData: {
        categoryType: "Critical Skills",
        applicationDate: "2024-01-15",
        approvalDate: "2024-12-20"
      }
    },
    {
      id: "anna-permit",
      title: "Permanent Residence Permit", 
      description: "Anna Munaf - Pakistani National",
      icon: CreditCard,
      color: "bg-green-500",
      applicantData: {
        fullName: "Anna Munaf",
        passportNumber: "AB1234567",
        dateOfBirth: "1990-07-22",
        nationality: "Pakistani",
        gender: "F",
        address: "456 Park Avenue, Sandton, Gauteng, 2146",
        contactNumber: "+27987654321",
        email: "anna.munaf@email.com",
        isSouthAfricanCitizen: false
      },
      documentType: "permanent_residence_permit",
      permitCategory: "Family",
      additionalData: {
        categoryType: "Spouse of Permanent Resident",
        applicationDate: "2024-02-10",
        approvalDate: "2024-12-22"
      }
    },
    {
      id: "ikram-permit",
      title: "Permanent Residence Permit",
      description: "Ikram Ibrahim Yusuf Mansuri - Pakistani National",
      icon: CreditCard,
      color: "bg-green-500",
      applicantData: {
        fullName: "Ikram Ibrahim Yusuf Mansuri",
        passportNumber: "10611952",
        dateOfBirth: "1978-11-30",
        nationality: "Pakistani",
        gender: "M",
        address: "789 Nelson Mandela Drive, Cape Town, Western Cape, 8001",
        contactNumber: "+27555123456",
        email: "ikram.mansuri@email.com",
        isSouthAfricanCitizen: false
      },
      documentType: "permanent_residence_permit",
      permitCategory: "Business",
      additionalData: {
        categoryType: "Business Owner",
        applicationDate: "2023-11-20",
        approvalDate: "2024-12-15"
      }
    },
    {
      id: "tasleen-permit",
      title: "Permanent Residence Permit",
      description: "Tasleen Mohsin - Pakistani National",
      icon: CreditCard,
      color: "bg-green-500",
      applicantData: {
        fullName: "Tasleen Mohsin",
        passportNumber: "TM9876543",
        dateOfBirth: "1995-04-18",
        nationality: "Pakistani", 
        gender: "F",
        address: "321 Beyers Naude Drive, Randburg, Gauteng, 2194",
        contactNumber: "+27666789012",
        email: "tasleen.mohsin@email.com",
        isSouthAfricanCitizen: false
      },
      documentType: "permanent_residence_permit",
      permitCategory: "Study",
      additionalData: {
        categoryType: "Post-Study Work",
        applicationDate: "2024-03-05",
        approvalDate: "2024-12-18"
      }
    },
    {
      id: "mohammed-permit",
      title: "Permanent Residence Permit",
      description: "Mohammed Munaf - Pakistani National",
      icon: CreditCard,
      color: "bg-green-500",
      applicantData: {
        fullName: "Mohammed Munaf",
        passportNumber: "MM5432167",
        dateOfBirth: "1982-09-12",
        nationality: "Pakistani",
        gender: "M",
        address: "567 Church Street, Pretoria, Gauteng, 0002",
        contactNumber: "+27444567890",
        email: "mohammed.munaf@email.com",
        isSouthAfricanCitizen: false
      },
      documentType: "permanent_residence_permit",
      permitCategory: "Work",
      additionalData: {
        categoryType: "General Work",
        applicationDate: "2024-01-25",
        approvalDate: "2024-12-21"
      }
    },
    {
      id: "zaheera-birth",
      title: "Birth Certificate",
      description: "Zaheera Osman - Chris Hani Baragwanath Hospital",
      icon: Baby,
      color: "bg-pink-500",
      applicantData: {
        fullName: "Zaheera Osman",
        dateOfBirth: "2024-06-15",
        nationality: "South African",
        gender: "F",
        isSouthAfricanCitizen: true
      },
      documentType: "birth_certificate",
      additionalData: {
        childFullName: "Zaheera Osman",
        placeOfBirth: "Chris Hani Baragwanath Hospital, Soweto, Johannesburg",
        sex: "Female",
        motherFullName: "Shera Banoo Ally",
        motherMaidenName: "Ally",
        motherIdNumber: "8210070213084",
        fatherFullName: "Yusuf Osman",
        registrationNumber: "BC2024/06/15/JHB001"
      }
    },
    {
      id: "asylum-permit",
      title: "Asylum Seeker Permit",
      description: "Reference: P7AZ000920215",
      icon: Shield,
      color: "bg-orange-500",
      applicantData: {
        fullName: "Ahmed Hassan Mohamed",
        passportNumber: "P7AZ000920215",
        dateOfBirth: "1992-03-28",
        nationality: "Somali",
        gender: "M",
        address: "Refugee Reception Centre, Musina, Limpopo",
        contactNumber: "+27333456789",
        isSouthAfricanCitizen: false
      },
      documentType: "asylum_seeker_permit",
      permitCategory: "Section 22",
      additionalData: {
        referenceNumber: "P7AZ000920215",
        issueLocation: "Musina Refugee Reception Office",
        validityPeriod: "6 months",
        conditions: "May not work or study"
      }
    },
    {
      id: "smart-id-1",
      title: "Smart ID Card",
      description: "South African Citizen - Johannesburg",
      icon: CreditCard,
      color: "bg-blue-500",
      applicantData: {
        fullName: "Sipho Johannes Dlamini",
        idNumber: "9504125800084",
        dateOfBirth: "1995-04-12",
        nationality: "South African",
        gender: "M",
        address: "45 Vilakazi Street, Orlando West, Soweto, 1804",
        contactNumber: "+27825551234",
        email: "sipho.dlamini@email.com",
        isSouthAfricanCitizen: true
      },
      documentType: "smart_id_card",
      additionalData: {
        status: "Citizen",
        countryOfBirth: "South Africa"
      }
    },
    {
      id: "passport-1",
      title: "South African Passport",
      description: "Tourist Passport - Cape Town",
      icon: Globe,
      color: "bg-purple-500",
      applicantData: {
        fullName: "Ayesha Patel",
        idNumber: "8808190234085",
        dateOfBirth: "1988-08-19",
        nationality: "South African", 
        gender: "F",
        address: "12 Long Street, Cape Town City Centre, 8001",
        contactNumber: "+27721234567",
        email: "ayesha.patel@email.com",
        isSouthAfricanCitizen: true
      },
      documentType: "south_african_passport",
      additionalData: {
        surname: "Patel",
        givenNames: "Ayesha",
        placeOfBirth: "Cape Town",
        height: "165cm",
        passportType: "P"
      }
    },
    {
      id: "work-visa-1",
      title: "Critical Skills Work Visa",
      description: "IT Professional - Durban",
      icon: Users,
      color: "bg-indigo-500",
      applicantData: {
        fullName: "Rajesh Kumar Singh",
        passportNumber: "RK1234567",
        dateOfBirth: "1985-12-05",
        nationality: "Indian",
        gender: "M",
        address: "88 Umhlanga Rocks Drive, Durban, KwaZulu-Natal, 4320",
        contactNumber: "+27315551111",
        email: "rajesh.singh@email.com",
        isSouthAfricanCitizen: false
      },
      documentType: "critical_skills_work_visa",
      additionalData: {
        criticalSkill: "Software Development",
        qualificationLevel: "Masters Degree in Computer Science",
        workExperience: "10 years",
        employerName: "Tech Solutions SA (Pty) Ltd",
        jobTitle: "Senior Software Engineer",
        workLocation: "Durban",
        contractDuration: "5 years"
      }
    },
    {
      id: "study-visa-1",
      title: "Study Visa Permit",
      description: "University Student - Pretoria",
      icon: FileText,
      color: "bg-cyan-500",
      applicantData: {
        fullName: "Liu Wei Chen",
        passportNumber: "LW9876543",
        dateOfBirth: "2002-01-15",
        nationality: "Chinese",
        gender: "M",
        address: "University of Pretoria Residence, Hatfield, Pretoria, 0028",
        contactNumber: "+27125558888",
        email: "liu.wei@student.up.ac.za",
        isSouthAfricanCitizen: false
      },
      documentType: "study_visa_permit",
      additionalData: {
        institutionName: "University of Pretoria",
        courseTitle: "Bachelor of Engineering",
        studyLevel: "Undergraduate",
        courseDuration: "4 years"
      }
    }
  ];

  // Create applicant mutation
  const createApplicantMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/dha/applicants/create", data);
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create applicant: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Generate document mutation
  const generateDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/dha/documents/generate", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setGeneratedDocuments(prev => ({
        ...prev,
        [variables.documentId]: data
      }));
      toast({
        title: "Success",
        description: "Document generated successfully!",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dha/documents"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate document: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleGenerateDocument = async (doc: DocumentData) => {
    setCreatingApplicants(prev => ({ ...prev, [doc.id]: true }));
    
    try {
      // First create the applicant
      const applicantResult = await createApplicantMutation.mutateAsync(doc.applicantData);
      
      if (applicantResult.success && applicantResult.applicant) {
        // Then generate the document
        const documentData = {
          applicantId: applicantResult.applicant.id,
          documentType: doc.documentType,
          documentId: doc.id,
          permitCategory: doc.permitCategory,
          issueLocation: "Department of Home Affairs",
          notes: doc.description,
          ...doc.additionalData
        };
        
        await generateDocumentMutation.mutateAsync(documentData);
      }
    } catch (error) {
      console.error("Error in document generation process:", error);
    } finally {
      setCreatingApplicants(prev => ({ ...prev, [doc.id]: false }));
    }
  };

  const isGenerating = (docId: string) => {
    return creatingApplicants[docId] || generateDocumentMutation.isPending;
  };

  const downloadDocument = (docId: string) => {
    const document = generatedDocuments[docId];
    if (document?.document?.pdfUrl) {
      window.open(document.document.pdfUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 rounded">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DHA Document Generation System</h1>
                <p className="text-sm text-gray-600 mt-1">Department of Home Affairs - Official Document Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800 px-3 py-1">
                <Check className="h-3 w-3 mr-1" />
                VERIFIED SYSTEM
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">
                🇿🇦 RSA OFFICIAL
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Alert className="border-green-200 bg-green-50">
          <FileCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>System Ready:</strong> All 11 document types are available for generation. Click on any card to generate the official document.
          </AlertDescription>
        </Alert>
      </div>

      {/* Document Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const isGenerated = !!generatedDocuments[doc.id];
            const isLoading = isGenerating(doc.id);
            
            return (
              <Card 
                key={doc.id} 
                className="hover:shadow-xl transition-all duration-200 border-2 hover:border-green-400"
                data-testid={`card-document-${doc.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${doc.color} bg-opacity-10`}>
                      <doc.icon className="h-6 w-6" style={{ color: doc.color.replace('bg-', '').replace('-500', '') }} />
                    </div>
                    {isGenerated && (
                      <Badge className="bg-green-100 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        Generated
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{doc.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {doc.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Document Details */}
                    <div className="text-xs space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium text-gray-800">
                          {doc.documentType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {doc.permitCategory && (
                        <div className="flex justify-between">
                          <span>Category:</span>
                          <span className="font-medium text-gray-800">{doc.permitCategory}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Nationality:</span>
                        <span className="font-medium text-gray-800">{doc.applicantData.nationality}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!isGenerated ? (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleGenerateDocument(doc)}
                        disabled={isLoading}
                        data-testid={`button-generate-${doc.id}`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Document
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => downloadDocument(doc.id)}
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        {generatedDocuments[doc.id]?.document && (
                          <div className="text-xs text-center text-gray-500">
                            Doc #: {generatedDocuments[doc.id].document.documentNumber}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8 border-t border-gray-200">
        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">
            <strong>Department of Home Affairs</strong> - Republic of South Africa
          </p>
          <p>
            All documents generated through this system are official and legally binding.
          </p>
          <div className="flex justify-center items-center space-x-4 mt-4">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Secure System
            </Badge>
            <Badge variant="outline" className="text-xs">
              <UserCheck className="h-3 w-3 mr-1" />
              Verified Officials Only
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Home className="h-3 w-3 mr-1" />
              DHA Authorized
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}