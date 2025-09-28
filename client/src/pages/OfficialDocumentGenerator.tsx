import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Fingerprint,
  User,
  Calendar,
  Globe,
  Briefcase,
  Home,
  Heart,
  Shield,
  Plane,
  GraduationCap,
  Building,
  Users,
  Ship,
  FileDown,
  Filter,
  History,
  Layers
} from 'lucide-react';

// DHA Document Types
const DOCUMENT_TYPES = [
  { code: 'DHA-802', name: 'Permanent Residence Permit', icon: Home, category: 'residence', color: 'bg-emerald-500' },
  { code: 'DHA-1738', name: 'Temporary Residence Visa', icon: Clock, category: 'residence', color: 'bg-blue-500' },
  { code: 'DHA-529', name: 'Identity Document', icon: User, category: 'identity', color: 'bg-purple-500' },
  { code: 'DHA-24', name: 'Birth Certificate', icon: Heart, category: 'civil', color: 'bg-pink-500' },
  { code: 'DHA-1663', name: 'Death Certificate', icon: FileText, category: 'civil', color: 'bg-gray-500' },
  { code: 'DHA-175', name: 'Passport Application', icon: Globe, category: 'travel', color: 'bg-indigo-500' },
  { code: 'DHA-73', name: 'Travel Document', icon: Plane, category: 'travel', color: 'bg-sky-500' },
  { code: 'DHA-1739', name: 'Visa Extension', icon: Clock, category: 'visa', color: 'bg-orange-500' },
  { code: 'DHA-84', name: 'Work Permit', icon: Briefcase, category: 'permit', color: 'bg-green-500' },
  { code: 'DHA-169', name: 'Study Permit', icon: GraduationCap, category: 'permit', color: 'bg-yellow-500' },
  { code: 'DHA-1740', name: 'Business Permit', icon: Building, category: 'permit', color: 'bg-teal-500' },
  { code: 'DHA-177', name: 'Retirement Permit', icon: Home, category: 'permit', color: 'bg-amber-500' },
  { code: 'DHA-1741', name: 'Medical Treatment Permit', icon: Heart, category: 'permit', color: 'bg-red-500' },
  { code: 'DHA-178', name: "Relative's Permit", icon: Users, category: 'permit', color: 'bg-violet-500' },
  { code: 'DHA-1742', name: 'Exchange Permit', icon: Users, category: 'permit', color: 'bg-cyan-500' },
  { code: 'DHA-1743', name: 'Corporate Permit', icon: Building, category: 'permit', color: 'bg-slate-500' },
  { code: 'DHA-1744', name: 'Treaty Permit', icon: Shield, category: 'permit', color: 'bg-rose-500' },
  { code: 'DHA-179', name: 'Refugee Status', icon: Shield, category: 'protection', color: 'bg-orange-600' },
  { code: 'DHA-1745', name: 'Asylum Seeker Permit', icon: Shield, category: 'protection', color: 'bg-red-600' },
  { code: 'DHA-176', name: 'Cross-Border Permit', icon: Globe, category: 'travel', color: 'bg-blue-600' },
  { code: 'DHA-1746', name: 'Crew Permit', icon: Ship, category: 'permit', color: 'bg-indigo-600' },
];

const CATEGORIES = [
  { id: 'all', name: 'All Documents', count: 21 },
  { id: 'residence', name: 'Residence', count: 2 },
  { id: 'identity', name: 'Identity', count: 1 },
  { id: 'civil', name: 'Civil Registry', count: 2 },
  { id: 'travel', name: 'Travel', count: 3 },
  { id: 'visa', name: 'Visa', count: 1 },
  { id: 'permit', name: 'Permits', count: 10 },
  { id: 'protection', name: 'Protection', count: 2 },
];

// Form Schema
const documentFormSchema = z.object({
  // Personal Information
  idNumber: z.string().optional(),
  passportNumber: z.string().optional(),
  fullName: z.string().min(2, 'Full name is required'),
  surname: z.string().optional(),
  givenNames: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  placeOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F', 'X']),
  nationality: z.string().min(2, 'Nationality is required'),
  maritalStatus: z.string().optional(),
  
  // Contact Information
  residentialAddress: z.string().min(5, 'Residential address is required'),
  postalAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  emailAddress: z.string().email().optional(),
  
  // Employment
  occupation: z.string().optional(),
  employer: z.string().optional(),
  employerAddress: z.string().optional(),
  
  // Document Specific
  validityPeriod: z.string().optional(),
  purpose: z.string().optional(),
  
  // Parent Details (for birth certificates)
  motherFullName: z.string().optional(),
  motherIdNumber: z.string().optional(),
  fatherFullName: z.string().optional(),
  fatherIdNumber: z.string().optional(),
  
  // Biometric Simulation
  biometricConsent: z.boolean().optional(),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

export default function OfficialDocumentGenerator() {
  const [selectedDocument, setSelectedDocument] = useState<typeof DOCUMENT_TYPES[0] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: 'M',
      nationality: 'South African',
      residentialAddress: '',
      biometricConsent: false,
    },
  });

  // Load recent documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentDhaDocuments');
    if (saved) {
      setRecentDocuments(JSON.parse(saved));
    }
  }, []);

  // Generate Document Mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { documentType: string; formData: DocumentFormData }) => {
      const response = await apiRequest('/api/dha/engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: data.documentType,
          personalData: data.formData,
          biometricInfo: data.formData.biometricConsent ? {
            type: 'fingerprint',
            data: btoa('SIMULATED_FINGERPRINT_DATA'),
            quality: 95,
          } : undefined,
          priority: 'normal',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate document');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedDocument(data);
      setShowPreview(true);
      
      // Add to recent documents
      const newRecent = {
        id: data.documentNumber,
        type: selectedDocument?.name,
        code: selectedDocument?.code,
        date: new Date().toISOString(),
        status: 'completed',
        registrationNumber: data.registrationNumber,
      };
      
      const updated = [newRecent, ...recentDocuments].slice(0, 10);
      setRecentDocuments(updated);
      localStorage.setItem('recentDhaDocuments', JSON.stringify(updated));
      
      toast({
        title: "Document Generated Successfully",
        description: `${selectedDocument?.name} has been generated with registration number: ${data.registrationNumber}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Batch Generation
  const batchGenerateMutation = useMutation({
    mutationFn: async (data: { documents: string[]; formData: DocumentFormData }) => {
      const promises = data.documents.map(docCode => 
        apiRequest('/api/dha/engine/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType: docCode,
            personalData: data.formData,
            priority: 'normal',
          }),
        }).then(res => res.json())
      );
      
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Generation Complete",
        description: `Successfully generated ${data.length} documents`,
      });
      setBatchMode(false);
      setSelectedDocuments([]);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Generation Failed",
        description: error.message || "Failed to generate documents",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DocumentFormData) => {
    if (batchMode && selectedDocuments.length > 0) {
      batchGenerateMutation.mutate({ documents: selectedDocuments, formData: data });
    } else if (selectedDocument) {
      generateMutation.mutate({ documentType: selectedDocument.code, formData: data });
    }
  };

  const filteredDocuments = DOCUMENT_TYPES.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const downloadDocument = (pdfBase64: string, documentName: string) => {
    const linkSource = `data:application/pdf;base64,${pdfBase64}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = `${documentName}.pdf`;
    downloadLink.click();
  };

  const simulateBiometric = () => {
    toast({
      title: "Biometric Capture",
      description: "Fingerprint captured successfully (simulated)",
    });
    form.setValue('biometricConsent', true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-[#006642] rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Official DHA Document Generator</h1>
                <p className="text-sm text-gray-500">Generate all 21 official document types</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-[#006642] border-[#006642]">
                21 Document Types Available
              </Badge>
              <Button 
                variant="outline"
                onClick={() => setBatchMode(!batchMode)}
                className={batchMode ? 'border-[#006642] text-[#006642]' : ''}
                data-testid="button-batch-mode"
              >
                <Layers className="h-4 w-4 mr-2" />
                {batchMode ? 'Exit Batch Mode' : 'Batch Mode'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Categories & Search */}
          <div className="space-y-6">
            {/* Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Search Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or code..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full px-3 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                        selectedCategory === category.id 
                          ? 'bg-[#006642] text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      data-testid={`button-category-${category.id}`}
                    >
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={selectedCategory === category.id ? 'bg-white/20 text-white' : ''}
                      >
                        {category.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Documents</CardTitle>
                  <History className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {recentDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {recentDocuments.map((doc, index) => (
                        <div key={index} className="p-2 rounded-lg border hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{doc.code}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(doc.date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent documents</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="documents" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="documents">Select Document</TabsTrigger>
                <TabsTrigger value="form" disabled={!selectedDocument && !batchMode}>
                  Generate Form
                </TabsTrigger>
              </TabsList>

              {/* Documents Grid */}
              <TabsContent value="documents" className="space-y-6">
                {batchMode && (
                  <Alert className="border-[#006642] bg-green-50">
                    <Layers className="h-4 w-4 text-[#006642]" />
                    <AlertDescription className="text-[#006642]">
                      Batch mode enabled. Select multiple documents to generate them all at once.
                      Selected: {selectedDocuments.length}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocuments.map((doc) => (
                    <Card 
                      key={doc.code}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        batchMode 
                          ? selectedDocuments.includes(doc.code) 
                            ? 'ring-2 ring-[#006642] bg-green-50' 
                            : 'hover:ring-2 hover:ring-gray-300'
                          : selectedDocument?.code === doc.code 
                            ? 'ring-2 ring-[#006642] bg-green-50' 
                            : 'hover:ring-2 hover:ring-gray-300'
                      }`}
                      onClick={() => {
                        if (batchMode) {
                          setSelectedDocuments(prev => 
                            prev.includes(doc.code)
                              ? prev.filter(d => d !== doc.code)
                              : [...prev, doc.code]
                          );
                        } else {
                          setSelectedDocument(doc);
                        }
                      }}
                      data-testid={`card-document-${doc.code}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${doc.color} bg-opacity-10`}>
                            <doc.icon className="h-5 w-5" style={{color: doc.color.replace('bg-', '#')}} />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {doc.code}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mt-2">{doc.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 capitalize">{doc.category}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      if (batchMode && selectedDocuments.length > 0) {
                        // Switch to form tab
                        document.querySelector('[value="form"]')?.click();
                      } else if (selectedDocument) {
                        document.querySelector('[value="form"]')?.click();
                      } else {
                        toast({
                          title: "No Document Selected",
                          description: "Please select a document to continue",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="bg-[#006642] hover:bg-[#005532]"
                    disabled={!selectedDocument && (!batchMode || selectedDocuments.length === 0)}
                    data-testid="button-continue"
                  >
                    Continue to Form
                  </Button>
                </div>
              </TabsContent>

              {/* Generation Form */}
              <TabsContent value="form" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {batchMode 
                        ? `Generate ${selectedDocuments.length} Documents`
                        : selectedDocument?.name || 'Document Generation Form'
                      }
                    </CardTitle>
                    <CardDescription>
                      Complete the form below to generate your official DHA document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Personal Information */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Personal Information
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter full name" data-testid="input-fullname" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="dateOfBirth"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date of Birth *</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" data-testid="input-dob" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="idNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ID Number</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter ID number" data-testid="input-id" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="passportNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Passport Number</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter passport number" data-testid="input-passport" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="gender"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Gender *</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-gender">
                                        <SelectValue placeholder="Select gender" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="M">Male</SelectItem>
                                      <SelectItem value="F">Female</SelectItem>
                                      <SelectItem value="X">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="nationality"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nationality *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter nationality" data-testid="input-nationality" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Contact Information */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <Home className="h-4 w-4 mr-2" />
                            Contact Information
                          </h3>
                          
                          <FormField
                            control={form.control}
                            name="residentialAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Residential Address *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter residential address" data-testid="input-address" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="+27 XX XXX XXXX" data-testid="input-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="emailAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" placeholder="email@example.com" data-testid="input-email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Document-Specific Fields */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Document-Specific Information
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="validityPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Validity Period</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-validity">
                                        <SelectValue placeholder="Select validity period" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="30">30 Days</SelectItem>
                                      <SelectItem value="90">90 Days</SelectItem>
                                      <SelectItem value="365">1 Year</SelectItem>
                                      <SelectItem value="1095">3 Years</SelectItem>
                                      <SelectItem value="1825">5 Years</SelectItem>
                                      <SelectItem value="3650">10 Years</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="purpose"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Purpose</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter purpose" data-testid="input-purpose" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="occupation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Occupation</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter occupation" data-testid="input-occupation" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="employer"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Employer</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter employer" data-testid="input-employer" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Biometric Data */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <Fingerprint className="h-4 w-4 mr-2" />
                            Biometric Data
                          </h3>
                          
                          <Card className="bg-gray-50">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Fingerprint Capture</p>
                                  <p className="text-xs text-gray-500">Simulate biometric capture for testing</p>
                                </div>
                                <Button
                                  type="button"
                                  variant={form.watch('biometricConsent') ? 'default' : 'outline'}
                                  onClick={simulateBiometric}
                                  className={form.watch('biometricConsent') ? 'bg-green-600 hover:bg-green-700' : ''}
                                  data-testid="button-biometric"
                                >
                                  {form.watch('biometricConsent') ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Captured
                                    </>
                                  ) : (
                                    <>
                                      <Fingerprint className="h-4 w-4 mr-2" />
                                      Capture
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-between pt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              form.reset();
                              setSelectedDocument(null);
                              setSelectedDocuments([]);
                              document.querySelector('[value="documents"]')?.click();
                            }}
                            data-testid="button-cancel"
                          >
                            Cancel
                          </Button>
                          
                          <Button
                            type="submit"
                            className="bg-[#006642] hover:bg-[#005532]"
                            disabled={generateMutation.isPending || batchGenerateMutation.isPending}
                            data-testid="button-generate"
                          >
                            {generateMutation.isPending || batchGenerateMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                {batchMode ? `Generate ${selectedDocuments.length} Documents` : 'Generate Document'}
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Generated Successfully</DialogTitle>
            <DialogDescription>
              Your document has been generated and registered with the DHA system
            </DialogDescription>
          </DialogHeader>
          
          {generatedDocument && (
            <div className="space-y-6">
              {/* Document Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Document Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Document Number</Label>
                      <p className="font-mono font-semibold">{generatedDocument.documentNumber}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Registration Number</Label>
                      <p className="font-mono font-semibold">{generatedDocument.registrationNumber}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Generated At</Label>
                      <p className="text-sm">{new Date(generatedDocument.metadata?.generatedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Status</Label>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Registered
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Verification QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img
                        src={`data:image/png;base64,${generatedDocument.qrCode}`}
                        alt="Verification QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        Scan this QR code to verify the authenticity of this document
                      </p>
                      <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                        {generatedDocument.verificationUrl}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PDF Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Document Preview</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const win = window.open();
                          win?.document.write(`
                            <html>
                              <head><title>${generatedDocument.documentNumber}</title></head>
                              <body style="margin:0;">
                                <iframe 
                                  src="data:application/pdf;base64,${generatedDocument.pdfBase64}" 
                                  style="width:100%;height:100vh;border:none;"
                                ></iframe>
                              </body>
                            </html>
                          `);
                        }}
                        data-testid="button-preview"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadDocument(generatedDocument.pdfBase64, generatedDocument.documentNumber)}
                        className="bg-[#006642] hover:bg-[#005532]"
                        data-testid="button-download"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <iframe
                      src={`data:application/pdf;base64,${generatedDocument.pdfBase64}`}
                      className="w-full h-96"
                      title="Document Preview"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false);
                    setGeneratedDocument(null);
                  }}
                  data-testid="button-close"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowPreview(false);
                    setGeneratedDocument(null);
                    form.reset();
                    setSelectedDocument(null);
                    document.querySelector('[value="documents"]')?.click();
                  }}
                  className="bg-[#006642] hover:bg-[#005532]"
                  data-testid="button-generate-another"
                >
                  Generate Another Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}