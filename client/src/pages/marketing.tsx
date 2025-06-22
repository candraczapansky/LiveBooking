import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
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
  AlertTriangle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type Campaign = {
  id: number;
  name: string;
  type: 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  audience: string;
  subject?: string;
  content: string;
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

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.enum(['email', 'sms']),
  audience: z.string().min(1, "Audience is required"),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  sendDate: z.string().optional(),
  sendNow: z.boolean().default(false),
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
  useDocumentTitle("Marketing | BeautyBook");
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(location.includes("new=true"));
  const [campaignToEdit, setCampaignToEdit] = useState<any>(null);
  const [isPromoFormOpen, setIsPromoFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Get URL params
  const searchParams = new URLSearchParams(location.split("?")[1]);
  
  // Check if we should open the form for creating a new campaign
  useState(() => {
    if (searchParams.get("new") === "true") {
      setIsCampaignFormOpen(true);
      // Clean up the URL
      setLocation("/marketing", { replace: true });
    }
  });

  // Campaign form
  const campaignForm = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      type: "email",
      audience: "",
      subject: "",
      content: "",
      sendDate: "",
      sendNow: false,
    },
  });

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

  // Fetch campaigns from API
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/marketing-campaigns'],
  });

  // Fetch SMS configuration status
  const { data: smsConfig } = useQuery({
    queryKey: ['/api/sms-config-status'],
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: CampaignFormValues) => {
      const response = await fetch('/api/marketing-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignData.name,
          type: campaignData.type,
          audience: campaignData.audience,
          subject: campaignData.type === 'email' ? campaignData.subject : undefined,
          content: campaignData.content,
          sendDate: campaignData.sendDate ? new Date(campaignData.sendDate) : undefined,
          status: 'draft'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-campaigns'] });
      setIsCampaignFormOpen(false);
      campaignForm.reset();
      
      // If "Send Now" was selected, immediately send the campaign
      if (variables.sendNow) {
        handleSendCampaign(data.id, data.type);
      } else {
        toast({
          title: "Campaign created",
          description: "Your marketing campaign has been saved as a draft.",
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
      const response = await fetch(`/api/marketing-campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send campaign');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-campaigns'] });
      toast({
        title: "Campaign sent",
        description: `SMS campaign sent to ${data.results?.sentCount || 0} recipients`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending campaign",
        description: error.message || "Failed to send SMS campaign",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onCampaignSubmit = async (data: CampaignFormValues) => {
    if (data.type === 'sms' && !smsConfig?.configured) {
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
    if (campaignType === 'sms' && !smsConfig?.configured) {
      toast({
        title: "SMS not configured",
        description: "Please configure Twilio credentials to send SMS campaigns.",
        variant: "destructive",
      });
      return;
    }
    
    sendCampaignMutation.mutate(campaignId);
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

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPromos = promos.filter(promo =>
    promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    promo.service?.toLowerCase().includes(searchQuery.toLowerCase())
  );



  const handleCreatePromo = (values: PromoFormValues) => {
    // In a real app, this would send the data to an API
    console.log("Creating promo:", values);
    
    toast({
      title: "Promo Code Created",
      description: `Promo code ${values.code} has been created.`,
    });
    
    promoForm.reset();
    setIsPromoFormOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketing</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage campaigns, promotions, and client communications
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={() => activeTab === "campaigns" ? setIsCampaignFormOpen(true) : setIsPromoFormOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {activeTab === "campaigns" ? "New Campaign" : "New Promo"}
                </Button>
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
                      <Button onClick={() => setIsCampaignFormOpen(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCampaigns.map((campaign) => (
                      <Card key={campaign.id} className="overflow-hidden">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge 
                                variant="outline"
                                className={`mb-2 ${
                                  campaign.status === "sent" 
                                    ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100" 
                                    : campaign.status === "scheduled" 
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100"
                                    : ""
                                }`}
                              >
                                {campaign.status === "sent" 
                                  ? "Sent" 
                                  : campaign.status === "scheduled" 
                                  ? "Scheduled" 
                                  : "Draft"}
                              </Badge>
                              <CardTitle className="text-lg">{campaign.name}</CardTitle>
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
                        </CardContent>
                        
                        <CardFooter className="bg-muted/50 pt-4">
                          <div className="flex justify-between w-full">
                            {campaign.status === "draft" && (
                              <>
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
                                    });
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleSendCampaign(campaign.id, campaign.type)}
                                  disabled={sendCampaignMutation.isPending}
                                >
                                  {sendCampaignMutation.isPending ? "Sending..." : "Send"}
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              </>
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
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toast({ title: "Feature Coming Soon", description: "Promo code editing will be available soon!" })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => toast({ title: "Feature Coming Soon", description: "Promo code deletion will be available soon!" })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            {promo.type === "percentage" 
                              ? `${promo.value}% off` 
                              : `$${promo.value.toFixed(2)} off`}
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
                              <p className="text-sm">{promo.usedCount} / {promo.usageLimit}</p>
                            </div>
                          </div>
                          
                          {promo.usedCount / promo.usageLimit > 0.8 && (
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
            </Tabs>
          </div>
        </main>
      </div>
      
      {/* Campaign Form Dialog */}
      <Dialog open={isCampaignFormOpen} onOpenChange={setIsCampaignFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
              
              <FormField
                control={campaignForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your message here..." 
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {campaignForm.watch("type") === "sms" 
                        ? "SMS messages are limited to 160 characters." 
                        : "You can use HTML formatting in email campaigns."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4 items-end">
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
                <Button type="submit">
                  Create Campaign
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Promo Form Dialog */}
      <Dialog open={isPromoFormOpen} onOpenChange={setIsPromoFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Promo Code</DialogTitle>
            <DialogDescription>
              Create a promotional code for discounts on your services.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...promoForm}>
            <form onSubmit={promoForm.handleSubmit(handleCreatePromo)} className="space-y-4">
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
                        <SelectItem value="">All Services</SelectItem>
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
    </div>
  );
};

export default MarketingPage;
