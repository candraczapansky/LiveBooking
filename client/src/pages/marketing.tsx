import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "@/styles/components.css";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import EmailTemplateEditor, { EmailTemplateEditorRef } from "@/components/email/EmailTemplateEditor";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Mail, 
  MessageSquare, 
  Tag, 
  Calendar, 
  Search,
  ArrowRight,
  Edit,
  Trash2,
  AlertTriangle,
  Eye,
  Users,
  UserX,
  Clock,
  MailX,
  Phone,
  Check,
  X,
  Upload
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type Campaign = {
  id: number;
  name: string;
  type: 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  audience: string;
  subject?: string;
  content: string;
  photoUrl?: string; // Add photo support
  sendDate?: string;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  createdAt?: string;
  sentAt?: string;
};

type Promo = {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  service?: string;
  expirationDate: string;
  usageLimit: number;
  usedCount: number;
  active: boolean;
};

type OptOut = {
  id: number;
  userId: number;
  email: string;
  unsubscribedAt: string;
  campaignId?: number;
  reason?: string;
  ipAddress?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    username: string;
    phone?: string;
  };
  campaign?: {
    name: string;
  };
};

type Client = {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: string;
};

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.enum(['email', 'sms']),
  audience: z.string().min(1, "Audience is required"),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  photoUrl: z.string().optional(), // Add photo support
  sendDate: z.string().optional(),
  sendTime: z.string().optional(),
  sendNow: z.boolean().default(false),
}).refine((data) => {
  if (data.type === 'email' && !data.subject) {
    return false;
  }
  return true;
}, {
  message: "Subject is required for email campaigns",
  path: ["subject"],
}).refine((data) => {
  if (data.type === 'sms' && data.content.length > 160) {
    return false;
  }
  return true;
}, {
  message: "SMS messages cannot exceed 160 characters",
  path: ["content"],
});

const promoFormSchema = z.object({
  code: z.string().min(4, "Promo code must be at least 4 characters"),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0, "Value must be a positive number"),
  service: z.string().optional(),
  expirationDate: z.string().min(1, "Expiration date is required"),
  usageLimit: z.coerce.number().min(1, "Usage limit must be at least 1"),
  active: z.boolean().default(true),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;
type PromoFormValues = z.infer<typeof promoFormSchema>;

const MarketingPage = () => {
  useDocumentTitle("Marketing | Glo Head Spa");
  const { toast } = useToast();

  const [location, setLocation] = useLocation();
  
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<any>(null);
  const [isPromoFormOpen, setIsPromoFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewCampaign, setViewCampaign] = useState<any>(null);
  const [isViewCampaignOpen, setIsViewCampaignOpen] = useState(false);
  const [emailTemplateDesign, setEmailTemplateDesign] = useState<any>(null);
  const [emailTemplateHtml, setEmailTemplateHtml] = useState<string>("");
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const emailEditorRef = useRef<EmailTemplateEditorRef>(null);
  const [optOutSearchQuery, setOptOutSearchQuery] = useState("");
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showClientSelector, setShowClientSelector] = useState(false);



  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  // Handle quick action navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    if (searchParams.get('new') === 'true') {
      setIsCampaignFormOpen(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, '', '/marketing');
    }
  }, [location]);

  // Fetch clients for selection
  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/users?role=client"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users?role=client");
      return response.json();
    },
  });

  // Campaign form
  const campaignForm = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: "email",
      audience: "",
      subject: "",
      content: "Please create an email template using the editor above.",
      sendDate: "",
      sendTime: "09:00",
      sendNow: false,
    },
  });

  // Reset selected clients when audience changes
  useEffect(() => {
    const currentAudience = campaignForm.watch("audience");
    if (currentAudience !== "Specific Clients") {
      setSelectedClients([]);
      setShowClientSelector(false);
    } else {
      setShowClientSelector(true);
    }
  }, [campaignForm.watch("audience")]);

  // Promo form
  const promoForm = useForm<PromoFormValues>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: 10,
      service: "",
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      usageLimit: 100,
      active: true,
    },
  });

  // Fetch campaigns from API (fallback to legacy path)
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<any[]>({
    queryKey: ['/api/marketing-campaigns'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/marketing-campaigns');
        return res.json();
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const res = await apiRequest('GET', '/api/marketing/campaigns');
          return res.json();
        }
        throw err;
      }
    }
  });

  // Periodically refresh campaigns while any are actively sending
  const hasSendingCampaigns = (campaigns as any[]).some((c: any) => c.status === 'sending');
  useEffect(() => {
    if (!hasSendingCampaigns) return;
    const interval = setInterval(() => {
      try {
        queryClient.refetchQueries({ queryKey: ['/api/marketing-campaigns'] });
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [hasSendingCampaigns]);

  // Fetch promo codes from API (gracefully handle missing endpoint)
  const { data: promoCodes = [], isLoading: promoCodesLoading } = useQuery<any[]>({
    queryKey: ['/api/promo-codes'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/promo-codes');
        return res.json();
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return [] as any[];
        }
        throw err;
      }
    }
  });

  // Fetch SMS configuration status
  const { data: smsConfig } = useQuery<any>({
    queryKey: ['/api/sms-config-status'],
  });

  // Fetch opt-outs (gracefully handle missing endpoint)
  const { data: optOuts = [], isLoading: optOutsLoading } = useQuery<any[]>({
    queryKey: ['/api/unsubscribes'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/unsubscribes');
        return res.json();
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return [] as any[];
        }
        throw err;
      }
    }
  });

  // Fetch active SMS clients (not opted-out + any SMS pref true)
  const { data: activeSmsClients = [], isLoading: activeSmsLoading } = useQuery<any[]>({
    queryKey: ['/api/marketing/active-sms-clients'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/marketing/active-sms-clients');
        return res.json();
      } catch {
        return [] as any[];
      }
    }
  });

  // Fetch clients who haven't opened tracked campaign emails
  const { data: nonOpeners = [], isLoading: nonOpenersLoading } = useQuery<any[]>({
    queryKey: ['/api/marketing/non-openers'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/marketing/non-openers');
        return res.json();
      } catch {
        return [] as any[];
      }
    }
  });

  // Derived opt-in counts
  const emailOptInCount = (allClients as any[]).filter((u: any) => !!u.email && u.emailPromotions === true).length;
  const smsOptInCount = (activeSmsClients as any[]).length;

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: CampaignFormValues) => {
      // Combine date and time for proper scheduling
      let sendDate = undefined;
      if (campaignData.sendDate && !campaignData.sendNow) {
        const timeStr = campaignData.sendTime || "09:00";
        sendDate = new Date(`${campaignData.sendDate}T${timeStr}:00`);
      }
      
      const payload = {
        name: campaignData.name,
        type: campaignData.type,
        audience: campaignData.audience,
        subject: campaignData.type === 'email' ? campaignData.subject : undefined,
        content: campaignData.content,
        photoUrl: campaignData.type === 'sms' ? (campaignData.photoUrl || undefined) : undefined,
        sendDate: sendDate,
        status: sendDate ? 'scheduled' : 'draft',
        // Include selected client IDs for specific clients audience
        ...(campaignData.audience === 'Specific Clients' && selectedClients.length > 0 && {
          targetClientIds: selectedClients.map(client => client.id)
        })
      };
      
      // Try new path first, then legacy
      try {
        const res = await apiRequest('POST', '/api/marketing-campaigns', payload);
        return res.json();
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const res = await apiRequest('POST', '/api/marketing/campaigns', payload);
          return res.json();
        }
        throw err;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-campaigns'] });
      queryClient.refetchQueries({ queryKey: ['/api/marketing-campaigns'] });
      setIsCampaignFormOpen(false);
      campaignForm.reset();
      setSelectedClients([]); // Reset selected clients
      
      // If "Send Now" was selected, immediately send the campaign
      if (variables.sendNow) {
        handleSendCampaign(data.id, data.type);
      } else {
        const isScheduled = variables.sendDate && !variables.sendNow;
        toast({
          title: "Campaign created",
          description: isScheduled 
            ? "Your marketing campaign has been scheduled for delivery."
            : "Your marketing campaign has been saved as a draft.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      try {
        const res = await apiRequest('POST', `/api/marketing-campaigns/${campaignId}/send`);
        return res.json();
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const res = await apiRequest('POST', `/api/marketing/campaigns/${campaignId}/send`);
          return res.json();
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      // Force immediate refresh of campaign data to update status
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-campaigns'] });
      queryClient.refetchQueries({ queryKey: ['/api/marketing-campaigns'] });
      const queuedCount = (data && (data.queuedCount ?? data.results?.queuedCount)) ?? undefined;
      const totalRecipients = (data && (data.totalRecipients ?? data.results?.totalRecipients)) ?? undefined;
      const sentCount = (data && data.results?.sentCount) ?? undefined;
      let description = data?.message || 'Campaign queued for sending';
      if (typeof queuedCount === 'number' && typeof totalRecipients === 'number') {
        description = `Queued ${queuedCount} of ${totalRecipients} recipients for sending`;
      } else if (typeof sentCount === 'number') {
        description = `Sent to ${sentCount} recipients`;
      }
      toast({
        title: "Campaign queued",
        description,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending campaign",
        description: error.message || "Failed to send campaign",
        variant: "destructive",
      });
    },
  });

  // Create promo code mutation
  const createPromoCodeMutation = useMutation({
    mutationFn: async (promoData: PromoFormValues) => {
      console.log('Making API call with data:', promoData);
      
      const payload = {
        code: promoData.code,
        type: promoData.type,
        value: promoData.value,
        service: promoData.service || null,
        usageLimit: promoData.usageLimit,
        active: promoData.active,
        expirationDate: promoData.expirationDate,
      };
      
      console.log('API payload:', payload);
      
      const response = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('API error response:', error);
        throw new Error(error.error || 'Failed to create promo code');
      }
      
      const result = await response.json();
      console.log('API success response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Mutation success, closing dialog and resetting form');
      queryClient.invalidateQueries({ queryKey: ['/api/promo-codes'] });
      toast({
        title: "Promo code created",
        description: "Your promo code has been created successfully.",
      });
      setIsPromoFormOpen(false);
      promoForm.reset();
    },
    onError: (error: any) => {
      console.log('Mutation error:', error);
      toast({
        title: "Error creating promo code",
        description: error.message || "Failed to create promo code",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onCampaignSubmit = async (data: CampaignFormValues) => {
    if (createCampaignMutation.isPending) {
      return; // Prevent duplicate submissions
    }
    
    // Validate that specific clients are selected when audience is "Specific Clients"
    if (data.audience === "Specific Clients" && selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client for the Specific Clients audience.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate SMS character limit
    if (data.type === 'sms' && data.content.length > 160) {
      toast({
        title: "Message too long",
        description: "SMS messages cannot exceed 160 characters. Please shorten your message.",
        variant: "destructive",
      });
      return;
    }
    
    if (data.type === 'sms' && !(smsConfig as any)?.configured) {
      toast({
        title: "SMS not configured",
        description: "Please configure Twilio credentials to send SMS campaigns.",
        variant: "destructive",
      });
      return;
    }
    
    createCampaignMutation.mutate(data);
  };

  const handleSendCampaign = (campaignId: number, campaignType: string) => {
    if (campaignType === 'sms' && !(smsConfig as any)?.configured) {
      toast({
        title: "SMS not configured",
        description: "Please configure Twilio credentials to send SMS campaigns.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the campaign to validate SMS length
    if (campaignType === 'sms') {
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      if (campaign && campaign.content.length > 160) {
        toast({
          title: "Cannot send campaign",
          description: "SMS message exceeds 160 character limit. Please edit the campaign first.",
          variant: "destructive",
        });
        return;
      }
    }
    
    sendCampaignMutation.mutate(campaignId);
  };

  const handleViewCampaign = (campaign: any) => {
    setViewCampaign(campaign);
    setIsViewCampaignOpen(true);
  };

  // Mock promo data - would be replaced with API call
  const promos: Promo[] = [
    {
      id: 1,
      code: "SUMMER20",
      type: "percentage",
      value: 20,
      expirationDate: "2023-08-31",
      usageLimit: 200,
      usedCount: 78,
      active: true,
    },
    {
      id: 2,
      code: "NEWCLIENT",
      type: "percentage",
      value: 15,
      expirationDate: "2023-12-31",
      usageLimit: 500,
      usedCount: 124,
      active: true,
    },
    {
      id: 3,
      code: "FACIAL10",
      type: "fixed",
      value: 10,
      service: "Facial Treatments",
      expirationDate: "2023-07-31",
      usageLimit: 100,
      usedCount: 45,
      active: true,
    },
  ];

  const filteredCampaigns = (campaigns as any[]).filter((campaign: any) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPromos = (promoCodes as any[]).filter((promo: any) =>
    promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    promo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOptOuts = (optOuts as any[]).filter((optOut: any) =>
    optOut.email.toLowerCase().includes(optOutSearchQuery.toLowerCase()) ||
    (optOut.user?.firstName && optOut.user.firstName.toLowerCase().includes(optOutSearchQuery.toLowerCase())) ||
    (optOut.user?.lastName && optOut.user.lastName.toLowerCase().includes(optOutSearchQuery.toLowerCase())) ||
    (optOut.reason && optOut.reason.toLowerCase().includes(optOutSearchQuery.toLowerCase()))
  );



  const onPromoSubmit = (data: PromoFormValues) => {
    console.log('Form submission data:', data);
    console.log('Form errors:', promoForm.formState.errors);
    
    // Prevent multiple submissions
    if (createPromoCodeMutation.isPending) {
      console.log('Submission already in progress, skipping...');
      return;
    }
    
    createPromoCodeMutation.mutate(data);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-screen-2xl mx-auto w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketing</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage campaigns, promotions, and client communications
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 w-full sm:w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => activeTab === "campaigns" ? setIsCampaignFormOpen(true) : setIsPromoFormOpen(true)}
                  className="w-full sm:w-auto min-h-[44px]"
                  size="default"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{activeTab === "campaigns" ? "New Campaign" : "New Promo"}</span>
                  <span className="sm:hidden">{activeTab === "campaigns" ? "Campaign" : "Promo"}</span>
                </Button>
              </div>
            </div>
            
            {/* Opt-In Summary */}
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Email opt-in:</span>
                <span className="font-medium">{emailOptInCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>SMS opt-in:</span>
                <span className="font-medium">{smsOptInCount}</span>
              </div>
            </div>

            {/* Marketing Tabs */}
            <Tabs defaultValue="campaigns" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="campaigns" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="promos" className="flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Promo Codes
                </TabsTrigger>
                <TabsTrigger value="optouts" className="flex items-center">
                  <UserX className="h-4 w-4 mr-2" />
                  Opt Outs
                </TabsTrigger>
                <TabsTrigger value="activeSms" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Active SMS
                </TabsTrigger>
                <TabsTrigger value="nonOpeners" className="flex items-center">
                  <MailX className="h-4 w-4 mr-2" />
                  Non-Openers
                </TabsTrigger>
              </TabsList>
              
              {/* Campaigns Tab */}
              <TabsContent value="campaigns">
                {filteredCampaigns.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Mail className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Campaigns Found</h3>
                      <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                        {searchQuery 
                          ? "No campaigns match your search criteria. Try a different search term."
                          : "Create your first marketing campaign to reach out to your clients."}
                      </p>
                      <Button 
                        onClick={() => setIsCampaignFormOpen(true)}
                        className="min-h-[44px]"
                        size="default"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCampaigns.map((campaign) => (
                      <Card key={campaign.id} className="overflow-hidden">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={`${
                                  campaign.status === "sent" 
                                    ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100" 
                                    : campaign.status === "scheduled" 
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-green-100"
                                    : ""
                                }`}
                              >
                                {campaign.status === "sent" 
                                  ? "Sent" 
                                  : campaign.status === "scheduled" 
                                  ? "Scheduled" 
                                  : campaign.status === "sending"
                                  ? "Sending"
                                  : "Draft"}
                              </Badge>
                              <CardTitle className="text-lg">{campaign.name}</CardTitle>
                              {campaign.type === "sms" && campaign.photoUrl && (
                                <Badge variant="secondary" className="text-xs">
                                  📷 Photo
                                </Badge>
                              )}
                            </div>
                            <Badge variant={campaign.type === "email" ? "default" : "secondary"}>
                              {campaign.type === "email" ? "Email" : "SMS"}
                            </Badge>
                          </div>
                          <CardDescription>
                            Audience: {campaign.audience}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-4">
                          {campaign.subject && (
                            <div className="mb-2">
                              <span className="text-sm font-medium">Subject:</span>{" "}
                              <span className="text-sm">{campaign.subject}</span>
                            </div>
                          )}
                          <div className="mb-4">
                            <span className="text-sm">{campaign.content.substring(0, 120)}...</span>
                          </div>
                          
                          {campaign.sendDate && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(campaign.sendDate).toLocaleDateString()}
                            </div>
                          )}
                          
                          {campaign.status === "sent" && (
                            <div className="mt-4 grid grid-cols-2 gap-4">
                              <div className="text-center p-2 bg-muted rounded">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Sent to</span>
                                <p className="font-medium">{campaign.sentCount}</p>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Open Rate</span>
                                <p className="font-medium">{campaign.openRate}%</p>
                              </div>
                            </div>
                          )}
                          {campaign.status === "sending" && (
                            <div className="mt-4 grid grid-cols-1 gap-4">
                              <div className="text-center p-2 bg-muted rounded">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Sent so far</span>
                                <p className="font-medium">{campaign.sentCount ?? 0}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                        
                        <CardFooter className="bg-muted/50 pt-4">
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between w-full">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewCampaign(campaign)}
                                className="flex-1 sm:flex-initial"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {campaign.status === "draft" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setCampaignToEdit(campaign);
                                    setIsCampaignFormOpen(true);
                                    campaignForm.reset({
                                      name: campaign.name,
                                      type: campaign.type as 'email' | 'sms',
                                      audience: campaign.audience,
                                      content: campaign.content,
                                      subject: campaign.subject || '',
                                      photoUrl: campaign.photoUrl || '',
                                    });
                                  }}
                                  className="flex-1 sm:flex-initial"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                            {campaign.status === "draft" && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleSendCampaign(campaign.id, campaign.type)}
                                disabled={sendCampaignMutation.isPending}
                                className="w-full sm:w-auto"
                              >
                                {sendCampaignMutation.isPending ? "Sending..." : "Send"}
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            )}
                            {campaign.status === "scheduled" && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleSendCampaign(campaign.id, campaign.type)}
                                disabled={sendCampaignMutation.isPending}
                                className="w-full sm:w-auto"
                              >
                                {sendCampaignMutation.isPending ? "Sending..." : "Send Now"}
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            )}
                            {campaign.status === "sent" && (
                              <div className="flex justify-center w-full">
                                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                  Campaign sent successfully
                                </span>
                              </div>
                            )}
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Promo Codes Tab */}
              <TabsContent value="promos">
                {filteredPromos.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Tag className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Promo Codes Found</h3>
                      <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                        {searchQuery 
                          ? "No promo codes match your search criteria. Try a different search term."
                          : "Create your first promo code to offer discounts to your clients."}
                      </p>
                      <Button onClick={() => setIsPromoFormOpen(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Promo Code
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    {filteredPromos.map((promo) => (
                      <Card key={promo.id}>
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <CardTitle className="text-lg mr-3">{promo.code}</CardTitle>
                              <Badge variant={promo.active ? "default" : "secondary"}>
                                {promo.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="default"
                                className="min-h-[44px] min-w-[44px] p-3"
                                onClick={() => toast({ title: "Feature Coming Soon", description: "Promo code editing will be available soon!" })}
                              >
                                <Edit className="h-4 w-4 text-gray-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="default"
                                className="min-h-[44px] min-w-[44px] p-3 text-destructive"
                                onClick={() => toast({ title: "Feature Coming Soon", description: "Promo code deletion will be available soon!" })}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            {promo.type === "percentage" 
                              ? `${promo.value}% off` 
                              : `$${promo.value?.toFixed(2)} off`}
                            {promo.service ? ` ${promo.service}` : " all services"}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium">Expiration:</span>
                              <p className="text-sm">{new Date(promo.expirationDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Usage:</span>
                              <p className="text-sm">{promo.usedCount || 0} / {promo.usageLimit}</p>
                            </div>
                          </div>
                          
                          {(promo.usedCount || 0) / promo.usageLimit > 0.8 && (
                            <div className="mt-4 flex items-center text-amber-600 dark:text-amber-500">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              <span className="text-sm">Almost reached limit</span>
                            </div>
                          )}
                          
                          <div className="mt-4">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-medium">Usage Progress</span>
                              <span className="text-xs font-medium">{Math.round(promo.usedCount / promo.usageLimit * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${(promo.usedCount / promo.usageLimit * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Opt Outs Tab */}
              <TabsContent value="optouts">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium">Opted Out Clients</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View and manage clients who have opted out of marketing communications.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search opt-outs..."
                        className="pl-8 w-full sm:w-[250px]"
                        value={optOutSearchQuery}
                        onChange={(e) => setOptOutSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {optOutsLoading ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                      <p className="mt-4 text-sm text-gray-500">Loading opt-outs...</p>
                    </CardContent>
                  </Card>
                ) : filteredOptOuts.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <MailX className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Opt-Outs Found</h3>
                      <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                        {optOutSearchQuery 
                          ? "No opt-outs match your search criteria. Try a different search term."
                          : "No clients have opted out of marketing communications yet."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredOptOuts.map((optOut) => (
                      <Card key={optOut.id} className="overflow-hidden">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="destructive" className="mb-2">
                                Opted Out
                              </Badge>
                              <CardTitle className="text-lg">{optOut.email}</CardTitle>
                            </div>
                            <UserX className="h-5 w-5 text-red-500" />
                          </div>
                          <CardDescription>
                            {optOut.user?.firstName && optOut.user?.lastName 
                              ? `${optOut.user.firstName} ${optOut.user.lastName}`
                              : optOut.user?.username || 'Unknown User'}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(optOut.unsubscribedAt).toLocaleDateString()}
                            </div>
                            {optOut.reason && (
                              <div className="text-sm">
                                <span className="font-medium">Reason:</span>{" "}
                                <span className="text-gray-600 dark:text-gray-400">{optOut.reason}</span>
                              </div>
                            )}
                            {optOut.campaign?.name && (
                              <div className="text-sm">
                                <span className="font-medium">Campaign:</span>{" "}
                                <span className="text-gray-600 dark:text-gray-400">{optOut.campaign.name}</span>
                              </div>
                            )}
                            {optOut.user?.phone && (
                              <div className="text-sm">
                                <span className="font-medium">Phone:</span>{" "}
                                <span className="text-gray-600 dark:text-gray-400">{optOut.user.phone}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        
                        <CardFooter className="pt-0">
                          <div className="flex justify-between items-center w-full">
                            <div className="text-xs text-gray-500">
                              ID: {optOut.id}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast({
                                  title: "Feature Coming Soon",
                                  description: "Opt-out management actions will be available soon!",
                                });
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Active SMS Tab */}
              <TabsContent value="activeSms">
                <div className="mb-6">
                  <h3 className="text-lg font-medium">Active SMS Clients</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Clients who have not opted out and have at least one SMS preference enabled.
                  </p>
                </div>
                {activeSmsLoading ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                      <p className="mt-4 text-sm text-gray-500">Loading active SMS clients...</p>
                    </CardContent>
                  </Card>
                ) : (activeSmsClients as any[]).length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-sm text-gray-500">No active SMS clients found.</CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {(activeSmsClients as any[]).map((c: any) => (
                      <Card key={c.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{c.firstName} {c.lastName}</CardTitle>
                          <CardDescription>{c.email || 'No email'}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <div>Phone: {c.phone || '—'}</div>
                          <div className="mt-1">SMS Prefs: {['smsAccountManagement','smsAppointmentReminders','smsPromotions'].filter(k => c[k]).length > 0 ? 'Enabled' : 'Disabled'}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Non-Openers Tab */}
              <TabsContent value="nonOpeners">
                <div className="mb-6">
                  <h3 className="text-lg font-medium">Non-Openers (Email)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Clients who have not opened any tracked marketing emails.
                  </p>
                </div>
                {nonOpenersLoading ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                      <p className="mt-4 text-sm text-gray-500">Loading non-openers...</p>
                    </CardContent>
                  </Card>
                ) : (nonOpeners as any[]).length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-sm text-gray-500">No non-openers found.</CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {(nonOpeners as any[]).map((c: any) => (
                      <Card key={c.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{c.firstName} {c.lastName}</CardTitle>
                          <CardDescription>{c.email || 'No email'}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <div>Phone: {c.phone || '—'}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      {/* Campaign Form Dialog */}
      <Dialog 
        open={isCampaignFormOpen} 
        onOpenChange={(open) => {
          // Prevent the campaign dialog from closing due to outside clicks while the email editor overlay is open
          if (showEmailEditor && !open) return;
          setIsCampaignFormOpen(open);
        }} 
        modal={false}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Create an email or SMS campaign to communicate with your clients.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...campaignForm}>
            <form onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4">
              <FormField
                control={campaignForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Special" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={campaignForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={campaignForm.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="All Clients">All Clients</SelectItem>
                          <SelectItem value="Regular Clients">Regular Clients</SelectItem>
                          <SelectItem value="New Clients">New Clients</SelectItem>
                          <SelectItem value="Inactive Clients">Inactive Clients</SelectItem>
                          <SelectItem value="Upcoming Appointments">Upcoming Appointments</SelectItem>
                          <SelectItem value="Specific Clients">Specific Clients</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Client Selection for Specific Clients */}
              {campaignForm.watch("audience") === "Specific Clients" && (
                <div className="space-y-4">
                  <FormItem>
                    <FormLabel>Select Specific Clients</FormLabel>
                    <div className="space-y-3">
                      {/* Selected Clients Display */}
                      {selectedClients.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedClients.map((client) => (
                            <div
                              key={client.id}
                              className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                            >
                              <span>
                                {client.firstName} {client.lastName} ({client.email}{client.phone ? ` · ${client.phone}` : ''})
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedClients(prev => prev.filter(c => c.id !== client.id))}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-100"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Client Search and Selection */}
                      <div className="relative">
                        <Input
                          placeholder="Search clients by name, email, or phone..."
                          value={clientSearchQuery}
                          onFocus={() => setShowClientSelector(true)}
                          onChange={(e) => {
                            setClientSearchQuery(e.target.value);
                            if (!showClientSelector) setShowClientSelector(true);
                          }}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClientSelector(!showClientSelector)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          <Users size={16} />
                        </button>
                      </div>
                      
                      {/* Client List */}
                      {showClientSelector && (
                        <div className="border rounded-lg max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
                          {clientSearchQuery.trim().length < 2 ? (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                              Type at least 2 characters to search clients.
                            </div>
                          ) : (
                            (() => {
                              const searchTerm = clientSearchQuery.toLowerCase();
                              const matches = allClients
                                .filter((client) => {
                                  const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
                                  const email = (client.email || '').toLowerCase();
                                  const phone = (client.phone || '').replace(/\D/g, '');
                                  const phoneSearch = searchTerm.replace(/\D/g, '');
                                  const phoneMatch = phoneSearch.length >= 3 && phone.includes(phoneSearch);
                                  return fullName.includes(searchTerm) || email.includes(searchTerm) || phoneMatch;
                                })
                                .filter((client) => !selectedClients.some((selected) => selected.id === client.id))
                                .slice(0, 50);

                              if (matches.length === 0) {
                                return (
                                  <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                                    No matching clients found.
                                  </div>
                                );
                              }

                              return matches.map((client) => (
                                <div
                                  key={client.id}
                                  className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                                  onClick={() => {
                                    setSelectedClients((prev) => [...prev, client]);
                                    setClientSearchQuery("");
                                  }}
                                >
                                  <div>
                                    <div className="font-medium">
                                      {client.firstName} {client.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {client.email || 'No email'}
                                      {client.phone ? ` · ${client.phone}` : ''}
                                    </div>
                                  </div>
                                  <Check size={16} className="text-gray-400" />
                                </div>
                              ));
                            })()
                          )}
                        </div>
                      )}
                      
                      {selectedClients.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No clients selected. Click the search icon to browse and select clients.
                        </p>
                      )}
                    </div>
                  </FormItem>
                </div>
              )}
              
              {campaignForm.watch("type") === "email" && (
                <FormField
                  control={campaignForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Line</FormLabel>
                      <FormControl>
                        <Input placeholder="Special offer for you" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {campaignForm.watch("type") === "email" ? (
                <div className="space-y-4">
                  <FormField
                    control={campaignForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Template</FormLabel>
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Create professional email templates with our visual editor
                          </p>
                          <Button
                            type="button"
                            onClick={() => setShowEmailEditor(true)}
                            className="w-full"
                          >
                            Open Email Template Editor
                          </Button>
                          {emailTemplateHtml && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                              ✓ Email template created
                            </p>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* SMS Campaign Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          SMS Campaign with Photo Support
                        </h4>
                        <p className="text-blue-700 dark:text-blue-300 mb-2">
                          Create engaging SMS campaigns with optional photos. Photos will be sent as MMS messages.
                        </p>
                        <ul className="text-blue-600 dark:text-blue-400 space-y-1 text-xs">
                          <li>• SMS messages limited to 160 characters</li>
                          <li>• Photos stored as base64 data</li>
                          <li>• MMS sending requires Twilio MMS configuration</li>
                          <li>• Additional carrier charges may apply for MMS</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <FormField
                    control={campaignForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Content</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Textarea 
                              placeholder="Write your SMS message here..." 
                              rows={5}
                              {...field} 
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>
                                {field.value.length} / 160 characters
                              </span>
                              {field.value.length > 160 && (
                                <span className="text-red-500">
                                  Message exceeds SMS limit
                                </span>
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          SMS messages are limited to 160 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={campaignForm.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Photo/Video (Optional)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (field.value) {
                                field.onChange("");
                              } else {
                                // Show photo upload section
                                document.getElementById('sms-photo-upload')?.click();
                              }
                            }}
                            className="text-xs"
                          >
                            {field.value ? "Remove Photo" : "Add Photo"}
                          </Button>
                        </div>
                        <FormControl>
                          <div className="space-y-3">
                            {field.value ? (
                              <div className="relative">
                                {typeof field.value === 'string' && field.value.startsWith('data:video/') ? (
                                  <video
                                    src={field.value}
                                    className="w-full h-32 object-cover rounded-md border"
                                    controls
                                  />
                                ) : (
                                  <img
                                    src={field.value}
                                    alt="Campaign media"
                                    className="w-full h-32 object-cover rounded-md border"
                                  />
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => field.onChange("")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => document.getElementById('sms-photo-upload')?.click()}
                                >
                                  Choose Photo
                                </Button>
                                <p className="text-xs text-gray-500 mt-2">
                                  JPEG, PNG, GIF, MOV up to 5MB
                                </p>
                              </div>
                            )}
                            <input
                              id="sms-photo-upload"
                              type="file"
                              accept="image/*,video/quicktime"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Validate file type
                                  const isImage = file.type.startsWith('image/');
                                  const isMov = file.type === 'video/quicktime';
                                  if (!isImage && !isMov) {
                                    toast({
                                      title: "Invalid file type",
                                      description: "Please select an image (JPEG, PNG, GIF) or MOV video",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  // Validate file size (max 5MB)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      title: "File too large",
                                      description: "Please select an image smaller than 5MB",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  // Convert to base64
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const dataUrl = e.target?.result as string;
                                    field.onChange(dataUrl);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Add a photo to your SMS campaign. The photo will be sent as an MMS message.
                          <br />
                          <span className="text-amber-600 dark:text-amber-400">
                            Note: MMS messages may incur additional charges from your carrier.
                          </span>
                          <br />
                          <span className="text-blue-600 dark:text-blue-400">
                            Current implementation: Photos are stored and displayed, but actual MMS sending requires Twilio MMS configuration.
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* SMS Preview */}
                  {(campaignForm.watch("content") || campaignForm.watch("photoUrl")) && (
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <h4 className="text-sm font-medium mb-3">Message Preview</h4>
                      <div className="space-y-3">
                        {campaignForm.watch("photoUrl") && (
                          <div className="text-center">
                            {typeof campaignForm.watch("photoUrl") === 'string' && campaignForm.watch("photoUrl")!.startsWith('data:video/') ? (
                              <video
                                src={campaignForm.watch("photoUrl")!}
                                className="w-32 h-32 object-cover rounded-md border mx-auto"
                                controls
                              />
                            ) : (
                              <img
                                src={campaignForm.watch("photoUrl")!}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded-md border mx-auto"
                              />
                            )}
                            <p className="text-xs text-gray-500 mt-1">Media will be sent as MMS</p>
                          </div>
                        )}
                        {campaignForm.watch("content") && (
                          <div className="bg-white dark:bg-gray-700 p-3 rounded border">
                            <p className="text-sm whitespace-pre-wrap">{campaignForm.watch("content")}</p>
                            <div className="text-xs text-gray-500 mt-2 text-right">
                              {campaignForm.watch("content").length} / 160 characters
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={campaignForm.control}
                    name="sendDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Send Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            disabled={campaignForm.watch("sendNow")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={campaignForm.control}
                    name="sendTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Send Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            disabled={campaignForm.watch("sendNow") || !campaignForm.watch("sendDate")}
                          />
                        </FormControl>
                        <FormDescription>
                          Specify the time to send the campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={campaignForm.control}
                  name="sendNow"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Send immediately
                        </FormLabel>
                        <FormDescription>
                          Otherwise, it will be saved as a draft.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCampaignFormOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Campaign View Dialog */}
      <Dialog open={isViewCampaignOpen} onOpenChange={setIsViewCampaignOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          {viewCampaign && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{viewCampaign.name}</DialogTitle>
                    <DialogDescription className="mt-2">
                      <div className="flex items-center gap-4">
                        <Badge variant={viewCampaign.type === "email" ? "default" : "secondary"}>
                          {viewCampaign.type === "email" ? "Email Campaign" : "SMS Campaign"}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`${
                            viewCampaign.status === "sent" 
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100" 
                              : viewCampaign.status === "scheduled" 
                              ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-green-100"
                              : ""
                          }`}
                        >
                          {viewCampaign.status === "sent" 
                            ? "Sent" 
                            : viewCampaign.status === "scheduled" 
                            ? "Scheduled" 
                            : viewCampaign.status === "sending"
                            ? "Sending"
                            : "Draft"}
                        </Badge>
                      </div>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Campaign Details */}
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Audience</label>
                    <p className="text-lg">{viewCampaign.audience}</p>
                  </div>
                  
                  {viewCampaign.subject && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject</label>
                      <p className="text-lg">{viewCampaign.subject}</p>
                    </div>
                  )}
                  
                  {viewCampaign.sendDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Send Date</label>
                      <p className="text-lg">{new Date(viewCampaign.sendDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  
                  {viewCampaign.createdAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                      <p className="text-lg">{new Date(viewCampaign.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                  
                  {viewCampaign.sentAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sent</label>
                      <p className="text-lg">{new Date(viewCampaign.sentAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                
                {/* Campaign Content */}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Content</label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    {viewCampaign.type === "sms" && viewCampaign.photoUrl && (
                      <div className="mb-4">
                        <img
                          src={viewCampaign.photoUrl}
                          alt="Campaign photo"
                          className="w-full max-w-md h-auto rounded-md border"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{viewCampaign.content}</p>
                  </div>
                </div>
                
                {/* Analytics - Only show for sent campaigns */}
                {viewCampaign.status === "sent" && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 block">Campaign Analytics</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {viewCampaign.sentCount || 0}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Sent</div>
                      </div>
                      
                      <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          {viewCampaign.deliveredCount || 0}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Delivered</div>
                      </div>
                      
                      <div className="text-center p-3 sm:p-4 bg-muted rounded-lg col-span-2 sm:col-span-1">
                        <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                          {viewCampaign.failedCount || 0}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Failed</div>
                      </div>
                    </div>
                    
                    {viewCampaign.type === "email" && viewCampaign.sentCount && viewCampaign.sentCount > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {viewCampaign.openedCount || 0}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Opens</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {viewCampaign.sentCount > 0 ? Math.round(((viewCampaign.openedCount || 0) / viewCampaign.sentCount) * 100) : 0}% rate
                          </div>
                        </div>
                        
                        <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {Math.round(((viewCampaign.deliveredCount || 0) / viewCampaign.sentCount) * 100)}%
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Delivery Rate</div>
                        </div>
                        
                        <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {viewCampaign.unsubscribedCount || 0}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Unsubscribes</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {viewCampaign.sentCount > 0 ? Math.round(((viewCampaign.unsubscribedCount || 0) / viewCampaign.sentCount) * 100) : 0}% rate
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Recipient Information */}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Recipient Information</label>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm">
                        Targeted to: <strong>{viewCampaign.audience}</strong> audience segment
                      </span>
                    </div>
                    {viewCampaign.sentCount && (
                      <div className="flex items-center gap-2 mt-2">
                        <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm">
                          Sent to <strong>{viewCampaign.sentCount}</strong> recipients
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewCampaignOpen(false)}>
                  Close
                </Button>
                {viewCampaign.status === "draft" && (
                  <Button 
                    onClick={() => {
                      setIsViewCampaignOpen(false);
                      setCampaignToEdit(viewCampaign);
                      setIsCampaignFormOpen(true);
                      campaignForm.reset({
                        name: viewCampaign.name,
                        type: viewCampaign.type as 'email' | 'sms',
                        audience: viewCampaign.audience,
                        content: viewCampaign.content,
                        subject: viewCampaign.subject || '',
                        photoUrl: viewCampaign.photoUrl || '',
                      });
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Campaign
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Promo Form Dialog */}
      <Dialog open={isPromoFormOpen} onOpenChange={setIsPromoFormOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Promo Code</DialogTitle>
            <DialogDescription>
              Create a promotional code for discounts on your services.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...promoForm}>
            <form onSubmit={promoForm.handleSubmit(onPromoSubmit)} className="space-y-4">
              <FormField
                control={promoForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Code</FormLabel>
                    <FormControl>
                      <Input placeholder="SUMMER20" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is the code clients will enter to get the discount.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={promoForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={promoForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          min={0} 
                          step={promoForm.watch("type") === "percentage" ? 1 : 0.01} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={promoForm.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable Service (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All services" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        <SelectItem value="Haircut & Style">Haircut & Style</SelectItem>
                        <SelectItem value="Color Services">Color Services</SelectItem>
                        <SelectItem value="Facial Treatments">Facial Treatments</SelectItem>
                        <SelectItem value="Massage">Massage</SelectItem>
                        <SelectItem value="Nail Services">Nail Services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave blank to apply to all services.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={promoForm.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={promoForm.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Limit</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={promoForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Active
                      </FormLabel>
                      <FormDescription>
                        If unchecked, promo code will be created but not yet active.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPromoFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Promo Code
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Template Editor Fullscreen Overlay (Portal) */}
      {showEmailEditor && createPortal(
        <div 
          className="fixed inset-0 z-[100]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowEmailEditor(false)} />
          <div className="relative inset-0 h-screen w-screen bg-background flex flex-col">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="text-lg font-semibold">Email Template Editor</h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Template name"
                  className="w-56 hidden sm:block"
                  value={campaignForm.watch('subject') || ''}
                  onChange={(e) => campaignForm.setValue('subject', e.target.value)}
                />
                <Button
                  variant="default"
                  disabled={createCampaignMutation.isPending || sendCampaignMutation.isPending}
                  onClick={async () => {
                    // Ensure latest HTML from editor
                    emailEditorRef.current?.exportHtml();
                    const audience = campaignForm.watch('audience');
                    const subject = campaignForm.watch('subject');
                    const html = emailTemplateHtml || campaignForm.watch('content') || '';
                    if (!audience) {
                      toast({ title: 'Select audience', description: 'Please choose an audience in the campaign form before sending.', variant: 'destructive' });
                      return;
                    }
                    if (!subject || subject.trim() === '') {
                      toast({ title: 'Subject required', description: 'Enter a subject line before sending.', variant: 'destructive' });
                      return;
                    }
                    try {
                      campaignForm.setValue('content', html);
                      // Create campaign as email and mark sendNow=true. onSuccess will trigger actual send.
                      const values = { ...campaignForm.getValues(), type: 'email' as const, sendNow: true };
                      await createCampaignMutation.mutateAsync(values as any);
                      setShowEmailEditor(false);
                    } catch (err: any) {
                      toast({ title: 'Send failed', description: err?.message || 'Unable to send campaign', variant: 'destructive' });
                    }
                  }}
                  className="min-h-[36px]"
                >
                  Save & Send Now
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    emailEditorRef.current?.exportHtml();
                    const name = campaignForm.watch('subject') || `Template ${new Date().toLocaleString()}`;
                    const html = emailTemplateHtml || campaignForm.watch('content') || '';
                    try {
                      const res = await apiRequest('POST', '/api/marketing/email-templates', {
                        name,
                        subject: name,
                        htmlContent: html,
                        variables: [],
                      });
                      const saved = await res.json();
                      toast({ title: 'Template saved', description: `Saved as "${saved.name}".` });
                      setShowEmailEditor(false);
                    } catch (err: any) {
                      toast({ title: 'Save failed', description: err?.message || 'Unable to save template', variant: 'destructive' });
                    }
                  }}
                  className="min-h-[36px]"
                >
                  Save Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEmailEditor(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <EmailTemplateEditor
                ref={emailEditorRef}
                onDesignChange={setEmailTemplateDesign}
                onHtmlChange={(html) => {
                  setEmailTemplateHtml(html);
                  campaignForm.setValue("content", html);
                }}
                initialDesign={emailTemplateDesign}
                className="h-full w-full"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowEmailEditor(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  emailEditorRef.current?.exportHtml();
                  setShowEmailEditor(false);
                  toast({
                    title: "Template saved",
                    description: "Email template has been saved to your campaign.",
                  });
                }}
              >
                Save & Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MarketingPage;
