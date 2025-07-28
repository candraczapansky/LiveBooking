import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  MessageSquare, 
  Clock, 
  Shield, 
  TestTube, 
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SMSAutoRespondConfig {
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

interface SMSAutoRespondStats {
  totalProcessed: number;
  responsesSent: number;
  responsesBlocked: number;
  averageConfidence: number;
  topReasons: string[];
}

export default function SMSAutoRespondSettings() {
  const [testSMS, setTestSMS] = useState({
    from: "",
    to: "",
    body: ""
  });
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newAutoRespondNumber, setNewAutoRespondNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch SMS auto-respond configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["sms-auto-respond-config"],
    queryFn: async () => {
      const response = await fetch("/api/sms-auto-respond/config");
      if (!response.ok) throw new Error("Failed to fetch configuration");
      const data = await response.json();
      return data as SMSAutoRespondConfig;
    }
  });

  // Fetch SMS auto-respond statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["sms-auto-respond-stats"],
    queryFn: async () => {
      const response = await fetch("/api/sms-auto-respond/stats");
      if (!response.ok) throw new Error("Failed to fetch statistics");
      const data = await response.json();
      return data as SMSAutoRespondStats;
    }
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<SMSAutoRespondConfig>) => {
      const response = await fetch("/api/sms-auto-respond/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-auto-respond-config"] });
      toast({
        title: "Configuration Updated",
        description: "SMS auto-respond settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  // Test SMS auto-respond mutation
  const testMutation = useMutation({
    mutationFn: async (testData: { from: string; to: string; body: string }) => {
      const response = await fetch("/api/sms-auto-respond/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      });
      if (!response.ok) throw new Error("Failed to test SMS auto-respond");
      return response.json();
    },
    onSuccess: (data) => {
      console.log('SMS Test Result:', data);
      setLastTestResult(data);
      toast({
        title: "Test Completed",
        description: data.responseSent 
          ? `SMS auto-response was sent successfully! Response: "${data.response}"` 
          : `Test completed. Reason: ${data.reason}`,
        variant: data.responseSent ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test SMS auto-respond",
        variant: "destructive",
      });
    },
  });

  // Test FAQ integration mutation
  const testFAQMutation = useMutation({
    mutationFn: async (testData: { from: string; to: string; body: string }) => {
      const response = await fetch("/api/sms-auto-respond/test-faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      });
      if (!response.ok) throw new Error("Failed to test FAQ integration");
      return response.json();
    },
    onSuccess: (data) => {
      console.log('FAQ Test Result:', data);
      toast({
        title: "FAQ Test Completed",
        description: `Found ${data.faqData.count} FAQ entries. LLM ${data.llmResponse.success ? 'successful' : 'failed'}`,
        variant: data.llmResponse.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "FAQ Test Failed",
        description: error.message || "Failed to test FAQ integration",
        variant: "destructive",
      });
    },
  });

  const handleConfigChange = (key: keyof SMSAutoRespondConfig, value: any) => {
    if (!config) return;
    
    const newConfig = { ...config, [key]: value };
    updateConfigMutation.mutate(newConfig);
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim() || !config) return;
    
    const updatedKeywords = [...(config.excludedKeywords || []), newKeyword.trim()];
    handleConfigChange("excludedKeywords", updatedKeywords);
    setNewKeyword("");
  };

  const handleRemoveKeyword = (keyword: string) => {
    if (!config) return;
    
    const updatedKeywords = (config.excludedKeywords || []).filter(k => k !== keyword);
    handleConfigChange("excludedKeywords", updatedKeywords);
  };

  const handleAddPhoneNumber = () => {
    if (!newPhoneNumber.trim() || !config) return;
    
    const updatedPhoneNumbers = [...(config.excludedPhoneNumbers || []), newPhoneNumber.trim()];
    handleConfigChange("excludedPhoneNumbers", updatedPhoneNumbers);
    setNewPhoneNumber("");
  };

  const handleRemovePhoneNumber = (phoneNumber: string) => {
    if (!config) return;
    
    const updatedPhoneNumbers = (config.excludedPhoneNumbers || []).filter(p => p !== phoneNumber);
    handleConfigChange("excludedPhoneNumbers", updatedPhoneNumbers);
  };

  const handleAddAutoRespondNumber = () => {
    if (!newAutoRespondNumber.trim() || !config) return;
    
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(newAutoRespondNumber.trim())) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedNumbers = [...(config.autoRespondPhoneNumbers || []), newAutoRespondNumber.trim()];
    handleConfigChange("autoRespondPhoneNumbers", updatedNumbers);
    setNewAutoRespondNumber("");
  };

  const handleRemoveAutoRespondNumber = (phoneNumber: string) => {
    if (!config) return;
    
    const updatedNumbers = (config.autoRespondPhoneNumbers || []).filter(p => p !== phoneNumber);
    handleConfigChange("autoRespondPhoneNumbers", updatedNumbers);
  };

  const handleTest = () => {
    if (!testSMS.from || !testSMS.to || !testSMS.body) {
      toast({
        title: "Test Data Required",
        description: "Please fill in all test SMS fields.",
        variant: "destructive",
      });
      return;
    }
    
    testMutation.mutate(testSMS);
  };

  if (configLoading || statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading SMS auto-respond settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            Failed to load SMS auto-respond configuration
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SMS Auto-Respond Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic SMS responses using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable SMS Auto-Respond</Label>
              <p className="text-sm text-gray-600">
                Automatically respond to incoming SMS messages using AI
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => handleConfigChange("enabled", checked)}
            />
          </div>

          <Separator />

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Confidence Threshold</Label>
            <p className="text-sm text-gray-600">
              Minimum AI confidence required to send auto-response ({(config.confidenceThreshold * 100).toFixed(0)}%)
            </p>
            <Input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.confidenceThreshold}
              onChange={(e) => handleConfigChange("confidenceThreshold", parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <Separator />

          {/* Response Length */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Maximum Response Length</Label>
            <p className="text-sm text-gray-600">
              Maximum characters allowed in SMS auto-responses (increased to 500 characters)
            </p>
            <Input
              type="number"
              value={config.maxResponseLength}
              onChange={(e) => handleConfigChange("maxResponseLength", parseInt(e.target.value))}
              min="50"
              max="500"
              className="w-32"
            />
          </div>

          <Separator />

          {/* Business Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Business Hours Only</Label>
                <p className="text-sm text-gray-600">
                  Only send auto-responses during business hours
                </p>
              </div>
              <Switch
                checked={config.businessHoursOnly}
                onCheckedChange={(checked) => handleConfigChange("businessHoursOnly", checked)}
              />
            </div>
            
            {config.businessHoursOnly && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={config.businessHours.start}
                    onChange={(e) => handleConfigChange("businessHours", {
                      ...config.businessHours,
                      start: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={config.businessHours.end}
                    onChange={(e) => handleConfigChange("businessHours", {
                      ...config.businessHours,
                      end: e.target.value
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Excluded Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Excluded Keywords
          </CardTitle>
          <CardDescription>
            SMS messages containing these keywords will not trigger auto-responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword (e.g., urgent, emergency, 911)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
            />
            <Button onClick={handleAddKeyword} disabled={!newKeyword.trim()}>
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(config.excludedKeywords || []).map((keyword) => (
              <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                {keyword}
                <XCircle
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveKeyword(keyword)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Excluded Phone Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Excluded Phone Numbers
          </CardTitle>
          <CardDescription>
            SMS messages from these phone numbers will not trigger auto-responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add phone number (e.g., +1234567890)"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPhoneNumber()}
            />
            <Button onClick={handleAddPhoneNumber} disabled={!newPhoneNumber.trim()}>
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(config.excludedPhoneNumbers || []).map((phoneNumber) => (
              <Badge key={phoneNumber} variant="secondary" className="flex items-center gap-1">
                {phoneNumber}
                <XCircle
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemovePhoneNumber(phoneNumber)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Respond Phone Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Auto-Respond Phone Numbers
          </CardTitle>
          <CardDescription>
            Only SMS messages sent to these phone numbers will trigger auto-responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add phone number (e.g., +1234567890)"
              value={newAutoRespondNumber}
              onChange={(e) => setNewAutoRespondNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAutoRespondNumber()}
            />
            <Button onClick={handleAddAutoRespondNumber} disabled={!newAutoRespondNumber.trim()}>
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(config.autoRespondPhoneNumbers || []).map((phoneNumber) => (
              <Badge key={phoneNumber} variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
                {phoneNumber}
                <XCircle
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveAutoRespondNumber(phoneNumber)}
                />
              </Badge>
            ))}
          </div>
          
          {config.autoRespondPhoneNumbers.length === 0 && (
            <p className="text-sm text-gray-500">
              No specific numbers configured. Auto-responses will be sent to all incoming SMS messages.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test SMS Auto-Respond */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test SMS Auto-Respond
          </CardTitle>
          <CardDescription>
            Test the SMS auto-respond system with a sample message
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={testSMS.from}
                onChange={(e) => setTestSMS({ ...testSMS, from: e.target.value })}
              />
            </div>
            <div>
              <Label>To Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={testSMS.to}
                onChange={(e) => setTestSMS({ ...testSMS, to: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label>SMS Message</Label>
            <Textarea
              placeholder="Enter test SMS content..."
              value={testSMS.body}
              onChange={(e) => setTestSMS({ ...testSMS, body: e.target.value })}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {testSMS.body.length}/500 characters
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleTest} 
              disabled={testMutation.isPending || !testSMS.from || !testSMS.to || !testSMS.body}
              className="w-full"
            >
              {testMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test SMS Auto-Respond
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => testFAQMutation.mutate(testSMS)}
              disabled={testFAQMutation.isPending || !testSMS.from || !testSMS.body}
              variant="outline"
              className="w-full"
            >
              {testFAQMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing FAQ...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Test FAQ Integration
                </>
              )}
            </Button>
          </div>
          
          {/* Test Result Display */}
          {lastTestResult && (
            <div className={`p-4 rounded-lg border ${
              lastTestResult.responseSent 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {lastTestResult.responseSent ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h4 className="font-medium">
                  {lastTestResult.responseSent ? 'Test Successful!' : 'Test Failed'}
                </h4>
              </div>
              {lastTestResult.responseSent && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Response:</strong> {lastTestResult.response}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Confidence:</strong> {(lastTestResult.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              )}
              {!lastTestResult.responseSent && (
                <p className="text-sm text-gray-700">
                  <strong>Reason:</strong> {lastTestResult.reason}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              SMS Auto-Respond Statistics
            </CardTitle>
            <CardDescription>
              Performance metrics for the SMS auto-respond system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalProcessed}</div>
                <div className="text-sm text-gray-600">Total Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.responsesSent}</div>
                <div className="text-sm text-gray-600">Responses Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.responsesBlocked}</div>
                <div className="text-sm text-gray-600">Responses Blocked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(stats.averageConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 