import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Settings, 
  MessageSquare, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ConversationFlowStep {
  id: string;
  type: 'trigger' | 'response' | 'question' | 'condition' | 'action';
  name: string;
  content: string;
  order: number;
  conditions?: {
    hasService?: boolean;
    hasDate?: boolean;
    hasTime?: boolean;
    conversationStep?: string;
  };
}

interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  steps: ConversationFlowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  flowId: string;
  message: string;
  phoneNumber: string;
  client: any;
  executedStep: string;
  response: string;
  confidence: number;
  nextStep: string;
  conversationState: any;
}

export default function ConversationFlowTester() {
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<ConversationFlow | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("+1234567890");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load flows on component mount
  React.useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      const response = await fetch('/api/conversation-flows');
      if (response.ok) {
        const flowsData = await response.json();
        setFlows(flowsData);
        if (flowsData.length > 0) {
          setSelectedFlow(flowsData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const testFlow = async () => {
    if (!selectedFlow || !testMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversation-flows/${selectedFlow.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          phoneNumber: testPhoneNumber,
          client: {
            id: 1,
            firstName: 'Test',
            lastName: 'Client',
            phone: testPhoneNumber
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      }
    } catch (error) {
      console.error('Error testing flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: ConversationFlowStep) => {
    switch (step.type) {
      case 'trigger':
        return <MessageSquare className="h-4 w-4" />;
      case 'response':
        return <MessageSquare className="h-4 w-4" />;
      case 'question':
        return <MessageSquare className="h-4 w-4" />;
      case 'condition':
        return <CheckCircle className="h-4 w-4" />;
      case 'action':
        return <Play className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getStepColor = (step: ConversationFlowStep) => {
    switch (step.type) {
      case 'trigger':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'response':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'question':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'condition':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'action':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversation Flow Tester</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test and debug programmable LLM conversation flows
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flow Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Select Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="flow-select">Choose a conversation flow:</Label>
              <select
                id="flow-select"
                className="w-full mt-2 p-2 border rounded-md"
                value={selectedFlow?.id || ''}
                onChange={(e) => {
                  const flow = flows.find(f => f.id === e.target.value);
                  setSelectedFlow(flow || null);
                }}
              >
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedFlow && (
              <div className="space-y-3">
                <h3 className="font-semibold">{selectedFlow.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFlow.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Flow Steps:</h4>
                  {selectedFlow.steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <Badge className={getStepColor(step)}>
                        {getStepIcon(step)}
                        <span className="ml-1">{step.type}</span>
                      </Badge>
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number:</Label>
              <Input
                id="phone"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+1234567890"
              />
            </div>

            <div>
              <Label htmlFor="message">Test Message:</Label>
              <Textarea
                id="message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message like 'I want to book an appointment' or 'tomorrow'"
                rows={3}
              />
            </div>

            <Button 
              onClick={testFlow} 
              disabled={!selectedFlow || !testMessage.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Flow
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Input:</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <p><strong>Message:</strong> {testResult.message}</p>
                  <p><strong>Phone:</strong> {testResult.phoneNumber}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Output:</h4>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <p><strong>Executed Step:</strong> {testResult.executedStep}</p>
                  <p><strong>Confidence:</strong> {testResult.confidence}</p>
                  <p><strong>Next Step:</strong> {testResult.nextStep}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Response:</h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded whitespace-pre-wrap">
                {testResult.response}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Conversation State:</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(testResult.conversationState, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Example Test Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Booking Requests:</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("I want to book an appointment")}
                  className="w-full justify-start"
                >
                  "I want to book an appointment"
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("Can I schedule a signature head spa?")}
                  className="w-full justify-start"
                >
                  "Can I schedule a signature head spa?"
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("tomorrow")}
                  className="w-full justify-start"
                >
                  "tomorrow"
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("Friday at 2pm")}
                  className="w-full justify-start"
                >
                  "Friday at 2pm"
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Other Messages:</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("Hi")}
                  className="w-full justify-start"
                >
                  "Hi"
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("What services do you offer?")}
                  className="w-full justify-start"
                >
                  "What services do you offer?"
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTestMessage("How much does it cost?")}
                  className="w-full justify-start"
                >
                  "How much does it cost?"
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 