import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  MessageSquare, 
  Mail, 
  Users, 
  Clock, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Phone,
  Mail as MailIcon
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AIMessagingDialog } from "@/components/llm/ai-messaging-dialog";
import FAQManagement from "@/components/llm/faq-management";
import CategoryManagement from "@/components/llm/category-management";
import LLMTest from "@/components/llm/llm-test";
import { Input } from "@/components/ui/input";

export default function AIMessagingPage() {
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isOpen: sidebarOpen } = useSidebar();

  useDocumentTitle("AI Messaging");

  // Fetch recent conversations (mock data for now)
  const { data: recentConversations = [] } = useQuery({
    queryKey: ["/api/llm/conversations"],
    queryFn: async () => {
      // Mock data - in real implementation, this would fetch from API
      return [
        {
          id: 1,
          clientName: "Sarah Johnson",
          clientEmail: "sarah@example.com",
          lastMessage: "Hi, I'd like to book an appointment for a haircut",
          channel: "email",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          confidence: 0.92
        },
        {
          id: 2,
          clientName: "Mike Chen",
          clientEmail: "mike@example.com",
          lastMessage: "What are your prices for hair coloring?",
          channel: "sms",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: "responded",
          confidence: 0.88
        },
        {
          id: 3,
          clientName: "Emily Davis",
          clientEmail: "emily@example.com",
          lastMessage: "Can I reschedule my appointment for next week?",
          channel: "email",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          confidence: 0.95
        }
      ];
    }
  });

  // Fetch clients for quick access
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/users?role=client"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=client");
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    }
  });

  const filteredConversations = recentConversations.filter((conv: any) =>
    conv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "responded": return "bg-green-100 text-green-800";
      case "escalated": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === "email" ? <MailIcon className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        !sidebarOpen ? 'ml-16' : 'ml-64'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Bot className="h-8 w-8 text-primary" />
                    AI Messaging Center
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Intelligent client communication powered by AI
                  </p>
                </div>
                <Button 
                  onClick={() => setIsAIDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New AI Response
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Conversations</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">1,247</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Response Rate</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">94.2%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">2.3m</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Clients</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{clients.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="conversations" className="space-y-6">
              <TabsList>
                <TabsTrigger value="conversations">Recent Conversations</TabsTrigger>
                <TabsTrigger value="clients">Client Directory</TabsTrigger>
                <TabsTrigger value="faq">Business Knowledge</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="test">AI Test</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="conversations" className="space-y-6">
                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>

                {/* Conversations List */}
                <div className="space-y-4">
                  {filteredConversations.map((conversation: any) => (
                    <Card key={conversation.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                {getChannelIcon(conversation.channel)}
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {conversation.clientName}
                                </h3>
                              </div>
                              <Badge className={getStatusColor(conversation.status)}>
                                {conversation.status}
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-800">
                                {Math.round(conversation.confidence * 100)}% Confidence
                              </Badge>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                              {conversation.lastMessage}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatTimeAgo(conversation.timestamp)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MailIcon className="h-3 w-3" />
                                {conversation.clientEmail}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Respond
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="clients" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Directory</CardTitle>
                    <CardDescription>
                      Quick access to all clients for AI messaging
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clients.map((client: any) => (
                        <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {client.firstName && client.lastName
                                    ? `${client.firstName} ${client.lastName}`
                                    : client.username}
                                </h4>
                                <p className="text-sm text-gray-500">{client.email}</p>
                              </div>
                            </div>
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="flex-1">
                                <MailIcon className="h-3 w-3 mr-1" />
                                Email
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                SMS
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faq" className="space-y-6">
                <FAQManagement />
              </TabsContent>

              <TabsContent value="categories" className="space-y-6">
                <CategoryManagement />
              </TabsContent>

              <TabsContent value="test" className="space-y-6">
                <LLMTest />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Messaging Analytics</CardTitle>
                    <CardDescription>
                      Insights into your AI-powered communication performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-4">Response Confidence Distribution</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">High Confidence (90%+)</span>
                            <Badge className="bg-green-100 text-green-800">67%</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Medium Confidence (70-89%)</span>
                            <Badge className="bg-yellow-100 text-yellow-800">28%</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Low Confidence (&lt;70%)</span>
                            <Badge className="bg-red-100 text-red-800">5%</Badge>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-4">Channel Usage</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Email</span>
                            <Badge className="bg-blue-100 text-blue-800">72%</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">SMS</span>
                            <Badge className="bg-green-100 text-green-800">28%</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* AI Messaging Dialog */}
      <AIMessagingDialog 
        open={isAIDialogOpen} 
        onOpenChange={setIsAIDialogOpen} 
      />
    </div>
  );
} 