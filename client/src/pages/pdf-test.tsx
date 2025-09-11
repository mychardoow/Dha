import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Printer, Shield, FileText, CreditCard, Globe, Users, BookOpen, Award } from "lucide-react";
import { SouthAfricanCoatOfArms, DHALogo } from "@/components/GovernmentAssets";

export default function PDFTestPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState("work-permit");
  
  // Form data states
  const [personalData, setPersonalData] = useState({
    fullName: "John Michael Smith",
    surname: "Smith",
    givenNames: "John Michael",
    dateOfBirth: "1985-06-15",
    nationality: "British",
    passportNumber: "GB1234567",
    idNumber: "",
    gender: "Male",
    maritalStatus: "Single",
    countryOfBirth: "United Kingdom"
  });

  const [workPermitData, setWorkPermitData] = useState({
    permitType: "Section 19(1)",
    employer: {
      name: "Tech Solutions (Pty) Ltd",
      address: "123 Main Street, Sandton, Johannesburg, 2196",
      registrationNumber: "2020/123456/07"
    },
    occupation: "Software Engineer",
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    conditions: [
      "May only work for the specified employer",
      "Must not change occupation without permission",
      "Must maintain valid passport throughout stay"
    ]
  });

  const [asylumData, setAsylumData] = useState({
    fileReference: "CPT-2025-00123",
    unhcrNumber: "ZAF-2025-00456",
    countryOfOrigin: "Democratic Republic of Congo",
    dateOfApplication: new Date().toISOString().split('T')[0],
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dependents: [
      { name: "Jane Smith", relationship: "Spouse", dateOfBirth: "1987-03-22" },
      { name: "Mary Smith", relationship: "Child", dateOfBirth: "2015-08-10" }
    ]
  });

  const [birthCertData, setBirthCertData] = useState({
    fullName: "Sarah Jane Johnson",
    dateOfBirth: "2024-01-15",
    placeOfBirth: "Cape Town, Western Cape",
    gender: "Female",
    mother: {
      fullName: "Emily Johnson",
      idNumber: "8505150123085",
      nationality: "South African"
    },
    father: {
      fullName: "Michael Johnson",
      idNumber: "8301010123084",
      nationality: "South African"
    },
    registrationOffice: "Cape Town Home Affairs"
  });

  const generatePDF = async () => {
    setLoading(true);
    
    try {
      let endpoint = "";
      let requestData: any = {};
      
      switch (documentType) {
        case "work-permit":
          endpoint = "/api/pdf/work-permit";
          requestData = {
            personal: personalData,
            ...workPermitData
          };
          break;
        
        case "asylum-visa":
          endpoint = "/api/pdf/asylum-visa";
          requestData = {
            personal: personalData,
            ...asylumData
          };
          break;
        
        case "residence-permit":
          endpoint = "/api/pdf/residence-permit";
          requestData = {
            personal: personalData,
            permitCategory: "Direct Residence",
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: "Permanent",
            conditions: ["Must not engage in prohibited activities"]
          };
          break;
        
        case "birth-certificate":
          endpoint = "/api/pdf/birth-certificate";
          requestData = birthCertData;
          break;
        
        case "passport":
          endpoint = "/api/pdf/passport";
          requestData = {
            personal: personalData,
            passportType: "Ordinary",
            dateOfIssue: new Date().toISOString().split('T')[0],
            dateOfExpiry: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            placeOfIssue: "Pretoria"
          };
          break;
        
        case "study-permit":
          endpoint = "/api/pdf/study-permit";
          requestData = {
            personal: personalData,
            institution: "University of Cape Town",
            course: "Master of Computer Science",
            duration: "2 years",
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };
          break;
          
        default:
          throw new Error("Invalid document type");
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Generated",
        description: `Your ${documentType.replace('-', ' ')} PDF has been generated and downloaded.`,
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <SouthAfricanCoatOfArms className="h-16 w-16" />
          <div>
            <h1 className="text-3xl font-bold">PDF Generation Test</h1>
            <p className="text-gray-600">Test South African government document generation</p>
          </div>
        </div>
        <DHALogo className="h-12" />
      </div>

      {/* Document Type Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Document Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Button
              variant={documentType === "work-permit" ? "default" : "outline"}
              onClick={() => setDocumentType("work-permit")}
              className="flex flex-col items-center gap-2 h-auto py-4"
              data-testid="button-work-permit"
            >
              <CreditCard className="h-8 w-8" />
              <span>Work Permit</span>
            </Button>
            
            <Button
              variant={documentType === "asylum-visa" ? "default" : "outline"}
              onClick={() => setDocumentType("asylum-visa")}
              className="flex flex-col items-center gap-2 h-auto py-4"
              data-testid="button-asylum-visa"
            >
              <Shield className="h-8 w-8" />
              <span>Asylum Visa</span>
            </Button>
            
            <Button
              variant={documentType === "residence-permit" ? "default" : "outline"}
              onClick={() => setDocumentType("residence-permit")}
              className="flex flex-col items-center gap-2 h-auto py-4"
              data-testid="button-residence-permit"
            >
              <Globe className="h-8 w-8" />
              <span>Residence Permit</span>
            </Button>
            
            <Button
              variant={documentType === "birth-certificate" ? "default" : "outline"}
              onClick={() => setDocumentType("birth-certificate")}
              className="flex flex-col items-center gap-2 h-auto py-4"
              data-testid="button-birth-certificate"
            >
              <Users className="h-8 w-8" />
              <span>Birth Certificate</span>
            </Button>
            
            <Button
              variant={documentType === "passport" ? "default" : "outline"}
              onClick={() => setDocumentType("passport")}
              className="flex flex-col items-center gap-2 h-auto py-4"
              data-testid="button-passport"
            >
              <BookOpen className="h-8 w-8" />
              <span>Passport</span>
            </Button>
            
            <Button
              variant={documentType === "study-permit" ? "default" : "outline"}
              onClick={() => setDocumentType("study-permit")}
              className="flex flex-col items-center gap-2 h-auto py-4"
              data-testid="button-study-permit"
            >
              <Award className="h-8 w-8" />
              <span>Study Permit</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Form */}
      {documentType !== "birth-certificate" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={personalData.fullName}
                  onChange={(e) => setPersonalData({...personalData, fullName: e.target.value})}
                  data-testid="input-fullname"
                />
              </div>
              
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={personalData.dateOfBirth}
                  onChange={(e) => setPersonalData({...personalData, dateOfBirth: e.target.value})}
                  data-testid="input-dob"
                />
              </div>
              
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={personalData.nationality}
                  onChange={(e) => setPersonalData({...personalData, nationality: e.target.value})}
                  data-testid="input-nationality"
                />
              </div>
              
              <div>
                <Label htmlFor="passportNumber">Passport Number</Label>
                <Input
                  id="passportNumber"
                  value={personalData.passportNumber}
                  onChange={(e) => setPersonalData({...personalData, passportNumber: e.target.value})}
                  data-testid="input-passport"
                />
              </div>
              
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select 
                  value={personalData.gender}
                  onValueChange={(value) => setPersonalData({...personalData, gender: value})}
                >
                  <SelectTrigger id="gender" data-testid="select-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="countryOfBirth">Country of Birth</Label>
                <Input
                  id="countryOfBirth"
                  value={personalData.countryOfBirth}
                  onChange={(e) => setPersonalData({...personalData, countryOfBirth: e.target.value})}
                  data-testid="input-country-birth"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document-specific forms */}
      {documentType === "work-permit" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Work Permit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="permitType">Permit Type</Label>
                <Select 
                  value={workPermitData.permitType}
                  onValueChange={(value) => setWorkPermitData({...workPermitData, permitType: value as any})}
                >
                  <SelectTrigger id="permitType" data-testid="select-permit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Section 19(1)">Section 19(1) - General Work</SelectItem>
                    <SelectItem value="Section 19(2)">Section 19(2) - Critical Skills</SelectItem>
                    <SelectItem value="Section 19(3)">Section 19(3) - Intra-company Transfer</SelectItem>
                    <SelectItem value="Section 19(4)">Section 19(4) - Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="employerName">Employer Name</Label>
                <Input
                  id="employerName"
                  value={workPermitData.employer.name}
                  onChange={(e) => setWorkPermitData({
                    ...workPermitData, 
                    employer: {...workPermitData.employer, name: e.target.value}
                  })}
                  data-testid="input-employer"
                />
              </div>
              
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={workPermitData.occupation}
                  onChange={(e) => setWorkPermitData({...workPermitData, occupation: e.target.value})}
                  data-testid="input-occupation"
                />
              </div>
              
              <div>
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={workPermitData.validUntil}
                  onChange={(e) => setWorkPermitData({...workPermitData, validUntil: e.target.value})}
                  data-testid="input-valid-until"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>Selected Document: <strong>{documentType.replace('-', ' ').toUpperCase()}</strong></p>
              <p className="mt-1">Format: PDF (A4)</p>
              <p className="text-xs mt-2 text-orange-600">
                <Shield className="inline h-3 w-3 mr-1" />
                For demonstration purposes only
              </p>
            </div>
            
            <Button 
              onClick={generatePDF} 
              disabled={loading}
              size="lg"
              className="gap-2"
              data-testid="button-generate-pdf"
            >
              {loading ? (
                <>
                  <Printer className="h-5 w-5 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-5 w-5" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Document Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              QR Code for verification
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Barcode tracking
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Official watermark
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Government branding
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Security features
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Digital signature ready
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}