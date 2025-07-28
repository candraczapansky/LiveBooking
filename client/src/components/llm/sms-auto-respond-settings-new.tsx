import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Phone,
  Clock,
  Zap,
  Brain,
  Database,
  Wifi,
  RefreshCw,
  Send,
  Loader2,
  TrendingUp,
  Plus,
  Trash2,
  Move,
  GripVertical,
  Calendar,
  X,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";

interface SMSConfig {
  enabled: boolean;
  confidenceThreshold: number;
  maxResponseLength: number;
  businessHoursOnly: boolean;
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  excludedKeywords: string[];
  excludedPhoneNumbers: string[];
  autoRespondPhoneNumbers: string[];
}

interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  steps: ConversationStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConversationStep {
  id: string;
  type: 'trigger' | 'response' | 'question' | 'condition' | 'action';
  name: string;
  content: string;
  conditions?: string[];
  actions?: string[];
  nextStepId?: string;
  order: number;
}

interface SMSStats {
  totalProcessed: number;
  responsesSent: number;
  averageConfidence: number;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  configLoaded: boolean;
  openAIKeyAvailable: boolean;
  storageConnected: boolean;
  issues: string[];
}

export default function SMSAutoRespondSettingsNew() {
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("+1234567890");
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [editingPhoneNumbers, setEditingPhoneNumbers] = useState(false);
  const [newPhoneNumbers, setNewPhoneNumbers] = useState<string[]>([]);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ConversationFlow | null>(null);
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const queryClient = useQueryClient();

  // Health check with automatic retry
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['sms-health'],
    queryFn: async (): Promise<HealthStatus> => {
      try {
        const response = await fetch('/api/sms-auto-respond/health');
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Health check error:', error);
        return {
          status: 'unhealthy',
          configLoaded: false,
          openAIKeyAvailable: false,
          storageConnected: false,
          issues: ['Connection failed']
        };
      }
    },
    retry: 3,
    retryDelay: 1000,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Configuration with automatic retry
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['sms-config'],
    queryFn: async (): Promise<SMSConfig> => {
      try {
        const response = await fetch('/api/sms-auto-respond/config');
        if (!response.ok) {
          throw new Error(`Config fetch failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Config fetch error:', error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Conversation flows
  const { data: conversationFlows, refetch: refetchFlows } = useQuery({
    queryKey: ['sms-conversation-flows'],
    queryFn: async (): Promise<ConversationFlow[]> => {
      try {
        const response = await fetch('/api/sms-auto-respond/conversation-flows');
        if (!response.ok) {
          throw new Error(`Flows fetch failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Flows fetch error:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: async (): Promise<SMSStats> => {
      try {
        const response = await fetch('/api/sms-auto-respond/stats');
        if (!response.ok) {
          throw new Error(`Stats fetch failed: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error('Stats fetch error:', error);
        return {
          totalProcessed: 0,
          responsesSent: 0,
          averageConfidence: 0
        };
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Update configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<SMSConfig>) => {
      const response = await fetch('/api/sms-auto-respond/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] });
      queryClient.invalidateQueries({ queryKey: ['sms-health'] });
      toast.success("Configuration updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    }
  });

  // Update phone numbers specifically
  const updatePhoneNumbersMutation = useMutation({
    mutationFn: async (phoneNumbers: string[]) => {
      const response = await fetch('/api/sms-auto-respond/phone-numbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers }),
      });
      if (!response.ok) {
        throw new Error(`Phone number update failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] });
      queryClient.invalidateQueries({ queryKey: ['sms-health'] });
      toast.success("Phone numbers updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update phone numbers: ${error.message}`);
    }
  });

  // Save conversation flow
  const saveFlowMutation = useMutation({
    mutationFn: async (flow: ConversationFlow) => {
      const response = await fetch('/api/sms-auto-respond/conversation-flows', {
        method: flow.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });
      if (!response.ok) {
        throw new Error(`Flow save failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-conversation-flows'] });
      setShowFlowBuilder(false);
      setEditingFlow(null);
      toast.success("Conversation flow saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save conversation flow: ${error.message}`);
    }
  });

  // Delete conversation flow
  const deleteFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await fetch(`/api/sms-auto-respond/conversation-flows/${flowId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Flow delete failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-conversation-flows'] });
      toast.success("Conversation flow deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete conversation flow: ${error.message}`);
    }
  });

  // Test SMS
  const testSMSMutation = useMutation({
    mutationFn: async (testData: { from: string; to: string; body: string }) => {
      const response = await fetch('/api/sms-auto-respond/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });
      if (!response.ok) {
        throw new Error(`Test failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setLastTestResult(data);
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
      toast.success("SMS test completed successfully!");
    },
    onError: (error) => {
      toast.error(`SMS test failed: ${error.message}`);
    }
  });

  const handleTestSMS = () => {
    if (!testMessage.trim()) {
      toast.error("Please enter a test message");
      return;
    }
    
    setIsLoading(true);
    testSMSMutation.mutate({
      from: testPhoneNumber,
      to: config?.autoRespondPhoneNumbers[0] || "+1234567890",
      body: testMessage
    }, {
      onSettled: () => setIsLoading(false)
    });
  };

  const handleRefresh = () => {
    refetchHealth();
    refetchConfig();
    refetchStats();
    refetchFlows();
    toast.success("Refreshed SMS auto-responder status");
  };

  const handleEditPhoneNumbers = () => {
    if (config) {
      setNewPhoneNumbers([...config.autoRespondPhoneNumbers]);
      setEditingPhoneNumbers(true);
    }
  };

  const handleSavePhoneNumbers = () => {
    if (newPhoneNumbers.length === 0) {
      toast.error("At least one phone number is required");
      return;
    }
    
    updatePhoneNumbersMutation.mutate(newPhoneNumbers, {
      onSuccess: () => {
        setEditingPhoneNumbers(false);
        setNewPhoneNumbers([]);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingPhoneNumbers(false);
    setNewPhoneNumbers([]);
  };

  const handleAddPhoneNumber = () => {
    setNewPhoneNumbers([...newPhoneNumbers, ""]);
  };

  const handleRemovePhoneNumber = (index: number) => {
    setNewPhoneNumbers(newPhoneNumbers.filter((_, i) => i !== index));
  };

  const handlePhoneNumberChange = (index: number, value: string) => {
    const updated = [...newPhoneNumbers];
    updated[index] = value;
    setNewPhoneNumbers(updated);
  };

  const handleCreateFlow = (flowType: 'booking' | 'reschedule' | 'cancel' | 'business' = 'booking') => {
    let newFlow: ConversationFlow;
    
    switch (flowType) {
      case 'reschedule':
        newFlow = {
          id: '',
          name: 'Reschedule Appointment Flow',
          description: 'Handle appointment rescheduling requests',
          steps: [
            {
              id: 'step-1',
              type: 'trigger',
              name: 'Reschedule Request',
              content: 'reschedule, change appointment, move appointment',
              order: 1
            },
            {
              id: 'step-2',
              type: 'response',
              name: 'Find Appointments',
              content: 'I\'d be happy to help you reschedule your appointment. Let me find your upcoming appointments.',
              order: 2
            },
            {
              id: 'step-3',
              type: 'question',
              name: 'Select Appointment',
              content: 'Which appointment would you like to reschedule?',
              order: 3
            },
            {
              id: 'step-4',
              type: 'response',
              name: 'Ask for New Time',
              content: 'What date and time would work better for you?',
              order: 4
            },
            {
              id: 'step-5',
              type: 'action',
              name: 'Reschedule Appointment',
              content: 'reschedule_appointment',
              order: 5
            }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;
        
      case 'cancel':
        newFlow = {
          id: '',
          name: 'Cancel Appointment Flow',
          description: 'Handle appointment cancellation requests',
          steps: [
            {
              id: 'step-1',
              type: 'trigger',
              name: 'Cancel Request',
              content: 'cancel, cancellation, cancel appointment',
              order: 1
            },
            {
              id: 'step-2',
              type: 'response',
              name: 'Find Appointments',
              content: 'I\'ll help you cancel your appointment. Let me find your upcoming appointments.',
              order: 2
            },
            {
              id: 'step-3',
              type: 'question',
              name: 'Select Appointment',
              content: 'Which appointment would you like to cancel?',
              order: 3
            },
            {
              id: 'step-4',
              type: 'response',
              name: 'Confirm Cancellation',
              content: 'I\'ve cancelled your appointment. You\'ll receive a confirmation email shortly.',
              order: 4
            },
            {
              id: 'step-5',
              type: 'action',
              name: 'Cancel Appointment',
              content: 'cancel_appointment',
              order: 5
            }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;
        
      case 'business':
        newFlow = {
          id: '',
          name: 'Business Questions Flow',
          description: 'Handle business-related questions',
          steps: [
            {
              id: 'step-1',
              type: 'trigger',
              name: 'Business Question',
              content: 'what time, how much, where, hours, services',
              order: 1
            },
            {
              id: 'step-2',
              type: 'response',
              name: 'Provide Information',
              content: 'I\'d be happy to help with your question about our business.',
              order: 2
            },
            {
              id: 'step-3',
              type: 'action',
              name: 'Answer Question',
              content: 'answer_business_question',
              order: 3
            }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;
        
      default: // booking
        newFlow = {
          id: '',
          name: 'Book Appointment Flow',
          description: 'Handle appointment booking requests',
          steps: [
            {
              id: 'step-1',
              type: 'trigger',
              name: 'Booking Request',
              content: 'book, appointment, schedule',
              order: 1
            },
            {
              id: 'step-2',
              type: 'response',
              name: 'Ask for Service',
              content: 'Great! I\'d love to help you book an appointment. What service would you like?',
              order: 2
            },
            {
              id: 'step-3',
              type: 'question',
              name: 'Service Selection',
              content: 'Which service would you like to book?',
              order: 3
            },
            {
              id: 'step-4',
              type: 'response',
              name: 'Ask for Date',
              content: 'Perfect! What date would you like to come in?',
              order: 4
            },
            {
              id: 'step-5',
              type: 'question',
              name: 'Date Selection',
              content: 'What date works for you?',
              order: 5
            },
            {
              id: 'step-6',
              type: 'response',
              name: 'Show Available Times',
              content: 'Great! Here are the available times for {date}: {available_times}. Which time works best?',
              order: 6
            },
            {
              id: 'step-7',
              type: 'action',
              name: 'Book Appointment',
              content: 'book_appointment',
              order: 7
            }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
    }
    setEditingFlow(newFlow);
    setShowFlowBuilder(true);
  };

  const handleEditFlow = (flow: ConversationFlow) => {
    setEditingFlow(flow);
    setShowFlowBuilder(true);
  };

  const handleDeleteFlow = (flowId: string) => {
    if (confirm('Are you sure you want to delete this conversation flow?')) {
      deleteFlowMutation.mutate(flowId);
    }
  };

  const handleSaveFlow = () => {
    if (!editingFlow) return;
    
    if (!editingFlow.name.trim()) {
      toast.error("Flow name is required");
      return;
    }
    
    saveFlowMutation.mutate(editingFlow);
  };

  const handleCancelFlow = () => {
    setShowFlowBuilder(false);
    setEditingFlow(null);
  };

  const handleAddStep = () => {
    if (!editingFlow) return;
    
    const newStep: ConversationStep = {
      id: `step-${Date.now()}`,
      type: 'response',
      name: 'New Step',
      content: '',
      order: editingFlow.steps.length + 1
    };
    
    setEditingFlow({
      ...editingFlow,
      steps: [...editingFlow.steps, newStep]
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!editingFlow) return;
    
    setEditingFlow({
      ...editingFlow,
      steps: editingFlow.steps.filter(step => step.id !== stepId)
    });
  };

  const handleUpdateStep = (stepId: string, updates: Partial<ConversationStep>) => {
    if (!editingFlow) return;
    
    setEditingFlow({
      ...editingFlow,
      steps: editingFlow.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    return status === 'healthy' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />;
  };

  if (!health || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading SMS auto-responder...</p>
        </div>
      </div>
    );
  }

  if (showFlowBuilder && editingFlow) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Conversation Flow Builder
            </h2>
            <p className="text-gray-600">Design your custom appointment booking flow</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCancelFlow} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveFlow} disabled={saveFlowMutation.isPending}>
              {saveFlowMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Flow'
              )}
            </Button>
          </div>
        </div>

        {/* Flow Details */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="flow-name">Flow Name</Label>
              <Input
                id="flow-name"
                value={editingFlow.name}
                onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                placeholder="e.g., Standard Appointment Booking"
              />
            </div>
            <div>
              <Label htmlFor="flow-description">Description</Label>
              <Textarea
                id="flow-description"
                value={editingFlow.description}
                onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                placeholder="Describe what this flow does..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="flow-active"
                checked={editingFlow.isActive}
                onCheckedChange={(checked) => setEditingFlow({ ...editingFlow, isActive: checked })}
              />
              <Label htmlFor="flow-active">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Flow Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Flow Steps</span>
              <Button onClick={handleAddStep} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editingFlow.steps.map((step, index) => (
                <div key={step.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <Badge variant="outline">Step {index + 1}</Badge>
                      <Badge variant={step.type === 'trigger' ? 'default' : step.type === 'response' ? 'secondary' : 'outline'}>
                        {step.type}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveStep(step.id)}
                      disabled={editingFlow.steps.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label>Step Name</Label>
                    <Input
                      value={step.name}
                      onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                      placeholder="e.g., Ask for Service"
                    />
                  </div>
                  
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={step.content}
                      onChange={(e) => handleUpdateStep(step.id, { content: e.target.value })}
                      placeholder={step.type === 'trigger' ? 'Keywords to trigger this step (comma separated)' : 'Message content or action'}
                      rows={3}
                    />
                  </div>
                  
                  {step.type === 'question' && (
                    <div>
                      <Label>Conditions (optional)</Label>
                      <Input
                        value={step.conditions?.join(', ') || ''}
                        onChange={(e) => handleUpdateStep(step.id, { conditions: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="Conditions for this step (comma separated)"
                      />
                    </div>
                  )}
                  
                  {step.type === 'action' && (
                    <div>
                      <Label>Actions</Label>
                      <Input
                        value={step.actions?.join(', ') || ''}
                        onChange={(e) => handleUpdateStep(step.id, { actions: e.target.value.split(',').map(s => s.trim()) })}
                        placeholder="Actions to perform (comma separated)"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            SMS Auto-Responder
          </h2>
          <p className="text-gray-600">Configure AI-powered SMS responses</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Health Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              <span className={`font-medium ${getStatusColor(health.status)}`}>
                {health.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className={health.configLoaded ? 'text-green-600' : 'text-red-600'}>
                Config: {health.configLoaded ? 'Loaded' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className={health.openAIKeyAvailable ? 'text-green-600' : 'text-red-600'}>
                OpenAI: {health.openAIKeyAvailable ? 'Ready' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className={health.storageConnected ? 'text-green-600' : 'text-red-600'}>
                Storage: {health.storageConnected ? 'Connected' : 'Failed'}
              </span>
            </div>
          </div>
          {health.issues.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Issues detected:</span>
              </div>
              <ul className="mt-2 text-sm text-red-700">
                {health.issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Flows Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Flows
            </span>
            <div className="flex gap-2">
              <Button onClick={() => handleCreateFlow('booking')} size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Booking
              </Button>
              <Button onClick={() => handleCreateFlow('reschedule')} size="sm" variant="outline">
                <Move className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button onClick={() => handleCreateFlow('cancel')} size="sm" variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={() => handleCreateFlow('business')} size="sm" variant="outline">
                <HelpCircle className="h-4 w-4 mr-2" />
                Q&A
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Design custom conversation flows for different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversationFlows && conversationFlows.length > 0 ? (
            <div className="space-y-3">
              {conversationFlows.map((flow) => (
                <div key={flow.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{flow.name}</h4>
                      <Badge variant={flow.isActive ? "default" : "secondary"}>
                        {flow.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{flow.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {flow.steps.length} steps • Updated {new Date(flow.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFlow(flow)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow.id)}
                      disabled={deleteFlowMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation flows yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first conversation flow to customize how the AI handles different scenarios.
              </p>
              <div className="space-y-2">
                <Button onClick={() => handleCreateFlow('booking')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Booking Flow
                </Button>
                <Button onClick={() => handleCreateFlow('reschedule')} variant="outline">
                  <Move className="h-4 w-4 mr-2" />
                  Create Reschedule Flow
                </Button>
                <Button onClick={() => handleCreateFlow('cancel')} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Create Cancel Flow
                </Button>
                <Button onClick={() => handleCreateFlow('business')} variant="outline">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Create Business Q&A Flow
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-base font-medium">Enable SMS Auto-Responder</Label>
              <p className="text-sm text-gray-600">Turn on automatic SMS responses</p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfigMutation.mutate({ enabled: checked })}
            />
          </div>

          <Separator />

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label htmlFor="confidence" className="text-base font-medium">
              Confidence Threshold: {config.confidenceThreshold}
            </Label>
            <p className="text-sm text-gray-600">
              Minimum confidence level required to send an auto-response (0.0 - 1.0)
            </p>
            <Input
              id="confidence"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.confidenceThreshold}
              onChange={(e) => updateConfigMutation.mutate({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Response Length */}
          <div className="space-y-2">
            <Label htmlFor="length" className="text-base font-medium">
              Max Response Length: {config.maxResponseLength} characters
            </Label>
            <p className="text-sm text-gray-600">Maximum length of auto-generated responses</p>
            <Input
              id="length"
              type="number"
              min="50"
              max="500"
              value={config.maxResponseLength}
              onChange={(e) => updateConfigMutation.mutate({ maxResponseLength: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Business Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="business-hours" className="text-base font-medium">Business Hours Only</Label>
                <p className="text-sm text-gray-600">Only respond during business hours</p>
              </div>
              <Switch
                id="business-hours"
                checked={config.businessHoursOnly}
                onCheckedChange={(checked) => updateConfigMutation.mutate({ businessHoursOnly: checked })}
              />
            </div>
            
            {config.businessHoursOnly && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={config.businessHours.start}
                    onChange={(e) => updateConfigMutation.mutate({
                      businessHours: { ...config.businessHours, start: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={config.businessHours.end}
                    onChange={(e) => updateConfigMutation.mutate({
                      businessHours: { ...config.businessHours, end: e.target.value }
                    })}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Auto-Respond Phone Numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Auto-Respond Phone Numbers</Label>
              {!editingPhoneNumbers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditPhoneNumbers}
                  disabled={updatePhoneNumbersMutation.isPending}
                >
                  Edit
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600">Phone numbers that will receive auto-responses</p>
            
            {editingPhoneNumbers ? (
              <div className="space-y-3">
                {newPhoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <Input
                      value={phone}
                      onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                      placeholder="+1234567890"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemovePhoneNumber(index)}
                      disabled={newPhoneNumbers.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPhoneNumber}
                  className="w-full"
                >
                  Add Phone Number
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePhoneNumbers}
                    disabled={updatePhoneNumbersMutation.isPending}
                    className="flex-1"
                  >
                    {updatePhoneNumbersMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updatePhoneNumbersMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {config.autoRespondPhoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="font-mono">{phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test SMS Auto-Responder
          </CardTitle>
          <CardDescription>
            Send a test message to verify the auto-responder is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-phone">From Phone Number</Label>
              <Input
                id="test-phone"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="test-message">Test Message</Label>
              <Textarea
                id="test-message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Hi, I would like to book an appointment for a haircut"
                rows={3}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleTestSMS} 
            disabled={isLoading || !testMessage.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Testing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test SMS
              </>
            )}
          </Button>

          {lastTestResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Last Test Result:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge variant={lastTestResult.responseSent ? "default" : "destructive"}>
                    {lastTestResult.responseSent ? "Response Sent" : "No Response"}
                  </Badge>
                </div>
                {lastTestResult.confidence && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Confidence:</span>
                    <span>{(lastTestResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                )}
                {lastTestResult.response && (
                  <div>
                    <span className="font-medium">AI Response:</span>
                    <p className="mt-1 text-gray-700">{lastTestResult.response}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalProcessed || 0}</div>
              <div className="text-sm text-gray-600">Total Processed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.responsesSent || 0}</div>
              <div className="text-sm text-gray-600">Responses Sent</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.averageConfidence ? (stats.averageConfidence * 100).toFixed(1) : '0'}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 