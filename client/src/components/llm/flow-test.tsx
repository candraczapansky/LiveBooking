import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MessageSquare } from "lucide-react";

interface FlowTestState {
  step: number;
  hasDate: boolean;
  hasService: boolean;
  hasTime: boolean;
  selectedDate?: string;
  selectedService?: string;
  selectedTime?: string;
}

export default function FlowTest() {
  const [state, setState] = useState<FlowTestState>({
    step: 1,
    hasDate: false,
    hasService: false,
    hasTime: false
  });

  const [userInput, setUserInput] = useState("");
  const [conversation, setConversation] = useState<string[]>([]);

  const simulateFlow = (input: string) => {
    const newConversation = [...conversation];
    newConversation.push(`User: ${input}`);
    
    // Simulate the correct flow order: Service first, then Date
    if (state.step === 1) {
      // Initial booking request
      newConversation.push(`Bot: Great! I'd be happy to help you book an appointment. What type of service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you'd like to book! 💆‍♀️✨`);
      setState(prev => ({ ...prev, step: 2 }));
    } else if (state.step === 2 && !state.hasService) {
      // User provides a service
      if (input.toLowerCase().includes('signature') || input.toLowerCase().includes('deluxe') || input.toLowerCase().includes('platinum') || input.toLowerCase().includes('head spa')) {
        newConversation.push(`Bot: Perfect! What day would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅`);
        setState(prev => ({ 
          ...prev, 
          step: 3, 
          hasService: true, 
          selectedService: input 
        }));
      } else {
        newConversation.push(`Bot: I didn't catch that. Could you please choose from our services:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)`);
      }
    } else if (state.step === 3 && state.hasService && !state.hasDate) {
      // User provides a date
      if (input.toLowerCase().includes('tomorrow') || input.toLowerCase().includes('friday') || input.toLowerCase().includes('monday') || input.toLowerCase().includes('tuesday') || input.toLowerCase().includes('wednesday') || input.toLowerCase().includes('thursday') || input.toLowerCase().includes('saturday') || input.toLowerCase().includes('sunday')) {
        newConversation.push(`Bot: Excellent choice! Now let me show you the available times for ${input}...`);
        setState(prev => ({ 
          ...prev, 
          step: 4, 
          hasDate: true, 
          selectedDate: input 
        }));
      } else {
        newConversation.push(`Bot: I didn't catch that. Could you please tell me what day you'd like to come in? You can say "tomorrow", "Friday", or any specific day. 📅`);
      }
    } else if (state.step === 4 && state.hasService && state.hasDate) {
      // Show available times
      newConversation.push(`Bot: Here are the available times for ${state.selectedDate}:\n\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM\n\nWhich time works best for you? ⏰`);
      setState(prev => ({ ...prev, step: 5 }));
    } else if (state.step === 5) {
      // User selects time
      newConversation.push(`Bot: Perfect! I've booked your ${state.selectedService} appointment for ${state.selectedDate} at ${input}. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`);
      setState(prev => ({ 
        ...prev, 
        step: 6, 
        hasTime: true, 
        selectedTime: input 
      }));
    }
    
    setConversation(newConversation);
    setUserInput("");
  };

  const resetFlow = () => {
    setState({
      step: 1,
      hasDate: false,
      hasService: false,
      hasTime: false
    });
    setConversation([]);
    setUserInput("");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            LLM Flow Test - Service First
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={state.hasDate ? "default" : "secondary"}>
              <Calendar className="h-3 w-3 mr-1" />
              Date: {state.hasDate ? "✓" : "?"}
            </Badge>
            <Badge variant={state.hasService ? "default" : "secondary"}>
              <User className="h-3 w-3 mr-1" />
              Service: {state.hasService ? "✓" : "?"}
            </Badge>
            <Badge variant={state.hasTime ? "default" : "secondary"}>
              <Clock className="h-3 w-3 mr-1" />
              Time: {state.hasTime ? "✓" : "?"}
            </Badge>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-64 overflow-y-auto">
            {conversation.length === 0 ? (
              <p className="text-gray-500 text-center">Start the conversation by typing "book appointment"</p>
            ) : (
              <div className="space-y-3">
                {conversation.map((message, index) => (
                  <div key={index} className={`p-2 rounded ${
                    message.startsWith('User:') 
                      ? 'bg-blue-100 dark:bg-blue-900 ml-8' 
                      : 'bg-green-100 dark:bg-green-900 mr-8'
                  }`}>
                    <pre className="whitespace-pre-wrap text-sm">{message}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && userInput.trim()) {
                  simulateFlow(userInput.trim());
                }
              }}
            />
            <Button 
              onClick={() => simulateFlow(userInput.trim())}
              disabled={!userInput.trim()}
            >
              Send
            </Button>
            <Button variant="outline" onClick={resetFlow}>
              Reset
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            <p><strong>Correct Flow Order:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Ask for service first</li>
              <li>Then ask for date</li>
              <li>Finally show available times</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 