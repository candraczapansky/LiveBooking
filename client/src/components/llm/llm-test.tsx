import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Send, 
  RefreshCw, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Clock,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
}

export default function LLMTest() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch business knowledge for context
  const { data: businessKnowledge = [], refetch: refetchBusinessKnowledge, isRefetching } = useQuery({
    queryKey: ['faq-entries'],
    queryFn: async () => {
      const response = await fetch("/api/business-knowledge");
      if (!response.ok) throw new Error("Failed to fetch business knowledge");
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000 // Refetch every 30 seconds if data is stale
  });

  // Test LLM response mutation
  const testLLMMutation = useMutation({
    mutationFn: async (message: string) => {
      const requestBody = {
        message,
        businessKnowledge: businessKnowledge.map((item: any) => ({
          question: item.title,
          answer: item.content,
          category: item.category
        }))
      };
      
      console.log('Sending request to LLM test:', requestBody);
      console.log('Business Knowledge details:', businessKnowledge);
      
      const response = await fetch("/api/llm/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('LLM Test Response:', data);
      const newMessage: TestMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        confidence: data.confidence
      };
      setMessages(prev => [...prev, newMessage]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: TestMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    testLLMMutation.mutate(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Response copied to clipboard",
    });
  };

  const clearConversation = () => {
    setMessages([]);
    toast({
      title: "Cleared",
      description: "Conversation history cleared",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Response Tester
          </CardTitle>
          <CardDescription>
            Test how the AI responds to questions using your business knowledge and FAQ entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Test Conversation</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchBusinessKnowledge()}
                    disabled={isRefetching}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    {isRefetching ? 'Refreshing...' : 'Refresh Knowledge'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearConversation}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="h-96 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Bot className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">
                      Start a conversation to test the AI's responses.<br />
                      The AI will use your business knowledge to answer questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white dark:bg-gray-700 border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                            {message.role === 'assistant' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(message.content)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          {message.role === 'assistant' && message.confidence && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {Math.round(message.confidence * 100)}% confidence
                              </Badge>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>

                        {message.role === 'user' && (
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-white dark:bg-gray-700 border rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin">
                              <RefreshCw className="h-4 w-4" />
                            </div>
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask the AI a question about your business..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Business Knowledge Context */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Available Knowledge
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  The AI will use this information to answer questions:
                </div>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {businessKnowledge.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No business knowledge available</p>
                      <p className="text-xs">Add FAQ entries to improve AI responses</p>
                    </div>
                  ) : (
                    businessKnowledge.map((item: any) => (
                      <Card key={item.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {item.title}
                            </h4>
                            {item.category && (
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                            {item.content}
                          </p>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="text-xs text-gray-500 text-center">
                {businessKnowledge.length} knowledge entries available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 