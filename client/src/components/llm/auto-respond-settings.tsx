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
  Mail, 
  Clock, 
  Shield, 
  TestTube, 
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoRespondConfig {
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
  excludedDomains: string[];
  autoRespondEmails: string[];
}

interface AutoRespondStats {
  totalProcessed: number;
  responsesSent: number;
  responsesBlocked: number;
  averageConfidence: number;
  topReasons: string[];
}

export default function AutoRespondSettings() {
  const [testEmail, setTestEmail] = useState({
    from: "",
    subject: "",
    body: ""
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch auto-respond configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["auto-respond-config"],
    queryFn: async () => {
      const response = await fetch("/api/auto-respond/config");
      if (!response.ok) throw new Error("Failed to fetch configuration");
      const data = await response.json();
      return data as AutoRespondConfig;
    }
  });

  // Fetch auto-respond statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["auto-respond-stats"],
    queryFn: async () => {
      const response = await fetch("/api/auto-respond/stats");
      if (!response.ok) throw new Error("Failed to fetch statistics");
      const data = await response.json();
      return data as AutoRespondStats;
    }
  });



  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<AutoRespondConfig>) => {
      const response = await fetch("/api/auto-respond/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-respond-config"] });
      toast({
        title: "Configuration Updated",
        description: "Auto-respond settings have been saved successfully.",
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

  // Test auto-respond mutation
  const testMutation = useMutation({
    mutationFn: async (testData: { from: string; subject: string; body: string }) => {
      const response = await fetch("/api/auto-respond/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      });
      if (!response.ok) throw new Error("Failed to test auto-respond");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Completed",
        description: data.responseSent 
          ? "Auto-response was sent successfully!" 
          : `Test completed. Reason: ${data.reason}`,
        variant: data.responseSent ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test auto-respond",
        variant: "destructive",
      });
    },
  });



  const handleConfigChange = (key: keyof AutoRespondConfig, value: any) => {
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

  const handleAddDomain = () => {
    if (!newDomain.trim() || !config) return;
    
    const updatedDomains = [...(config.excludedDomains || []), newDomain.trim()];
    handleConfigChange("excludedDomains", updatedDomains);
    setNewDomain("");
  };

  const handleRemoveDomain = (domain: string) => {
    if (!config) return;
    
    const updatedDomains = (config.excludedDomains || []).filter(d => d !== domain);
    handleConfigChange("excludedDomains", updatedDomains);
  };

  const handleAddEmail = () => {
    if (!newEmail.trim() || !config) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedEmails = [...(config.autoRespondEmails || []), newEmail.trim()];
    handleConfigChange("autoRespondEmails", updatedEmails);
    setNewEmail("");
  };

  const handleRemoveEmail = (email: string) => {
    if (!config) return;
    
    const updatedEmails = (config.autoRespondEmails || []).filter(e => e !== email);
    handleConfigChange("autoRespondEmails", updatedEmails);
  };

  const handleTest = () => {
    if (!testEmail.from || !testEmail.subject || !testEmail.body) {
      toast({
        title: "Test Data Required",
        description: "Please fill in all test email fields.",
        variant: "destructive",
      });
      return;
    }
    
    testMutation.mutate(testEmail);
  };



  if (configLoading || statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading auto-respond settings...</span>
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
            Failed to load auto-respond configuration
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
            Auto-Respond Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic email responses using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">


          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Auto-Respond</Label>
              <p className="text-sm text-gray-600">
                Automatically respond to incoming emails using AI
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
              Maximum characters allowed in auto-responses
            </p>
            <Input
              type="number"
              value={config.maxResponseLength}
              onChange={(e) => handleConfigChange("maxResponseLength", parseInt(e.target.value))}
              min="100"
              max="2000"
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
            Emails containing these keywords will not trigger auto-responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword (e.g., urgent, complaint)"
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

      {/* Excluded Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Excluded Domains
          </CardTitle>
          <CardDescription>
            Emails from these domains will not trigger auto-responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add domain (e.g., noreply.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} disabled={!newDomain.trim()}>
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(config.excludedDomains || []).map((domain) => (
              <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                {domain}
                <XCircle
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveDomain(domain)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Respond Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Auto-Respond Email Addresses
          </CardTitle>
          <CardDescription>
            Only emails sent to these addresses will trigger auto-responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add email (e.g., info@yourbusiness.com)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
            />
            <Button onClick={handleAddEmail} disabled={!newEmail.trim()}>
              Add
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(config.autoRespondEmails || []).map((email) => (
              <Badge key={email} variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
                {email}
                <XCircle
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveEmail(email)}
                />
              </Badge>
            ))}
          </div>
          

        </CardContent>
      </Card>

      {/* Test Auto-Respond */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Auto-Respond
          </CardTitle>
          <CardDescription>
            Test the auto-respond system with a sample email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Email</Label>
              <Input
                placeholder="test@example.com"
                value={testEmail.from}
                onChange={(e) => setTestEmail({ ...testEmail, from: e.target.value })}
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                placeholder="Test email subject"
                value={testEmail.subject}
                onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label>Email Body</Label>
            <Textarea
              placeholder="Enter test email content..."
              value={testEmail.body}
              onChange={(e) => setTestEmail({ ...testEmail, body: e.target.value })}
              rows={4}
            />
          </div>
          
          <Button 
            onClick={handleTest} 
            disabled={testMutation.isPending || !testEmail.from || !testEmail.subject || !testEmail.body}
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
                Test Auto-Respond
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Auto-Respond Statistics
            </CardTitle>
            <CardDescription>
              Performance metrics for the auto-respond system
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