import { useState, useEffect, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthProvider";
import { SidebarController } from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone as PhoneIcon, PhoneCall, PhoneIncoming, PhoneOutgoing, Download, Clock, User, FileText, Play } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";

interface PhoneCallData {
  id: number;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration?: number;
  purpose?: string;
  notes?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  recordings?: {
    id: number;
    recordingUrl: string;
    duration?: number;
    transcription?: string;
  };
}

interface CallAnalytics {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  completedCalls: number;
  failedCalls: number;
  totalDuration: number;
  averageDuration: number;
  callsByPurpose: Record<string, number>;
}

export default function PhonePage() {
  useDocumentTitle("Phone System | Glo Head Spa");
  const { user } = useContext(AuthContext);
  const { isOpen: sidebarOpen } = useSidebar();
  
  const [selectedCall, setSelectedCall] = useState<PhoneCallData | null>(null);
  const [outboundForm, setOutboundForm] = useState({
    toNumber: '',
    staffId: '',
    userId: '',
    purpose: 'outbound'
  });
  const [callNotes, setCallNotes] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch recent calls
  const { data: recentCalls = [], isLoading: callsLoading } = useQuery<PhoneCallData[]>({
    queryKey: ['/api/phone/recent'],
  });

  // Fetch call analytics
  const { data: analytics } = useQuery<CallAnalytics>({
    queryKey: ['/api/phone/analytics'],
  });

  // Fetch staff for outbound calls
  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Fetch clients for outbound calls
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Make outbound call mutation
  const makeCallMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/phone/outbound', data),
    onSuccess: () => {
      toast();
      queryClient.invalidateQueries({ queryKey: ['/api/phone/recent'] });
      setOutboundForm({ toNumber: '', staffId: '', userId: '', purpose: 'outbound' });
    },
    onError: (error: any) => {
      toast();
    },
  });

  // Add call notes mutation
  const addNotesMutation = useMutation({
    mutationFn: ({ callId, notes, staffId }: { callId: number; notes: string; staffId: number }) =>
      apiRequest('PUT', `/api/phone/notes/${callId}`, { notes, staffId }),
    onSuccess: () => {
      toast();
      queryClient.invalidateQueries({ queryKey: ['/api/phone/recent'] });
      setCallNotes('');
      setSelectedCall(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save notes",
        description: error.message || "Could not save call notes.",
        variant: "destructive",
      });
    },
  });

  const handleMakeCall = () => {
    if (!outboundForm.toNumber || !outboundForm.staffId) {
      toast({
        title: "Missing information",
        description: "Phone number and staff member are required.",
        variant: "destructive",
      });
      return;
    }

    makeCallMutation.mutate({
      toNumber: outboundForm.toNumber,
      staffId: parseInt(outboundForm.staffId),
      userId: outboundForm.userId ? parseInt(outboundForm.userId) : undefined,
      purpose: outboundForm.purpose,
    });
  };

  const handleAddNotes = () => {
    if (!selectedCall || !callNotes) {
      toast({
        title: "Missing information",
        description: "Please enter call notes.",
        variant: "destructive",
      });
      return;
    }

    addNotesMutation.mutate({
      callId: selectedCall.id,
      notes: callNotes,
      staffId: 1, // Default to first staff member - would get from auth context
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'failed': case 'busy': case 'no-answer': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-x-hidden">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
            <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone System</h1>
          <p className="text-muted-foreground">Manage calls, recordings, and phone communications</p>
        </div>
        
        {/* Make Outbound Call */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PhoneCall className="h-4 w-4" />
              Make Call
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Make Outbound Call</DialogTitle>
              <DialogDescription>
                Initiate a new outbound call with automatic recording
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  value={outboundForm.toNumber}
                  onChange={(e) => setOutboundForm(prev => ({ ...prev, toNumber: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="staff">Staff Member</Label>
                <Select value={outboundForm.staffId} onValueChange={(value) => setOutboundForm(prev => ({ ...prev, staffId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member: any) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.user?.firstName} {member.user?.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="client">Client (Optional)</Label>
                <Select value={outboundForm.userId} onValueChange={(value) => setOutboundForm(prev => ({ ...prev, userId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="purpose">Call Purpose</Label>
                <Select value={outboundForm.purpose} onValueChange={(value) => setOutboundForm(prev => ({ ...prev, purpose: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment_booking">Appointment Booking</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="outbound">General Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleMakeCall} 
                disabled={makeCallMutation.isPending}
                className="w-full"
              >
                {makeCallMutation.isPending ? "Initiating..." : "Start Call"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCalls}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inbound Calls</CardTitle>
              <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.inboundCalls}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outbound Calls</CardTitle>
              <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.outboundCalls}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(Math.round(analytics.averageDuration))}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            All incoming and outgoing calls with recordings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {callsLoading ? (
            <div className="text-center py-8">Loading calls...</div>
          ) : recentCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No calls found. Make your first call to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {call.direction === 'inbound' ? (
                      <PhoneIncoming className="h-5 w-5 text-blue-500" />
                    ) : (
                      <PhoneOutgoing className="h-5 w-5 text-green-500" />
                    )}
                    
                    <div>
                      <div className="font-medium">
                        {call.direction === 'inbound' ? call.fromNumber : call.toNumber}
                      </div>
                      {call.user && (
                        <div className="text-sm text-muted-foreground">
                          {call.user.firstName} {call.user.lastName}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(call.createdAt), 'PPp')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(call.status)}>
                      {call.status}
                    </Badge>
                    
                    {call.duration && (
                      <Badge variant="outline">
                        {formatDuration(call.duration)}
                      </Badge>
                    )}

                    {call.recordings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/phone/recording/${call.recordings.id}`, '_blank')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCall(call)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Call Details & Notes</DialogTitle>
                          <DialogDescription>
                            Add notes for this call
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Direction:</strong> {call.direction}
                            </div>
                            <div>
                              <strong>Status:</strong> {call.status}
                            </div>
                            <div>
                              <strong>Duration:</strong> {formatDuration(call.duration)}
                            </div>
                            <div>
                              <strong>Purpose:</strong> {call.purpose || 'N/A'}
                            </div>
                          </div>
                          
                          {call.notes && (
                            <div>
                              <Label>Existing Notes</Label>
                              <div className="p-3 bg-muted rounded-md text-sm">
                                {call.notes}
                              </div>
                            </div>
                          )}

                          <div>
                            <Label htmlFor="notes">Add Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add call notes..."
                              value={callNotes}
                              onChange={(e) => setCallNotes(e.target.value)}
                            />
                          </div>

                          <Button 
                            onClick={handleAddNotes}
                            disabled={addNotesMutation.isPending}
                            className="w-full"
                          >
                            {addNotesMutation.isPending ? "Saving..." : "Save Notes"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}