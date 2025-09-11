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
import { FileText, Download, Eye, Shield, CheckCircle, QrCode, Calendar, User, Hash } from "lucide-react";

const certificateFormSchema = z.object({
  type: z.string().min(1, "Type is required"),
  templateType: z.string().min(1, "Template type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  expiresAt: z.string().optional(),
  data: z.record(z.string()).optional()
});

const permitFormSchema = z.object({
  type: z.string().min(1, "Type is required"),
  templateType: z.string().min(1, "Template type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  expiresAt: z.string().optional(),
  data: z.record(z.string()).optional(),
  conditions: z.record(z.string()).optional()
});

interface Certificate {
  id: string;
  type: string;
  title: string;
  description: string;
  serialNumber: string;
  issuedAt: string;
  expiresAt?: string;
  status: string;
  verificationCode: string;
  documentUrl?: string;
  qrCodeUrl?: string;
  isRevoked: boolean;
}

interface Permit {
  id: string;
  type: string;
  title: string;
  description: string;
  permitNumber: string;
  issuedAt: string;
  expiresAt?: string;
  status: string;
  verificationCode: string;
  documentUrl?: string;
  qrCodeUrl?: string;
  isRevoked: boolean;
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: "certificate" | "permit";
}

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Document Generation Center
              </h1>
              <p className="text-muted-foreground mt-1">
                Generate secure certificates and permits with official authentication
              </p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Secure & Verified
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          {/* Generate Documents Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Generator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create professional certificates and permits with security features
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
        </Tabs>
      </div>
    </div>
  );
}