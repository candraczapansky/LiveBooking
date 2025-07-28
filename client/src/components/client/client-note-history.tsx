import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Calendar, Clock, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface NoteHistoryEntry {
  id: number;
  clientId: number;
  appointmentId?: number;
  noteContent: string;
  noteType: string;
  createdBy: number;
  createdByRole: string;
  createdAt: string;
  createdByUser?: {
    firstName: string;
    lastName: string;
  };
  appointment?: {
    id: number;
    startTime: string;
    service: {
      name: string;
    };
  };
}

interface ClientNoteHistoryProps {
  clientId: number;
  clientName: string;
}

export default function ClientNoteHistory({ clientId, clientName }: ClientNoteHistoryProps) {
  const [selectedNote, setSelectedNote] = useState<NoteHistoryEntry | null>(null);

  // Fetch client note history
  const { data: noteHistory = [], isLoading, error } = useQuery({
    queryKey: [`/api/note-history/client/${clientId}`],
    queryFn: async () => {
      const response = await fetch(`/api/note-history/client/${clientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch note history');
      }
      return response.json() as Promise<NoteHistoryEntry[]>;
    },
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'Appointment Note';
      case 'general':
        return 'General Note';
      case 'follow_up':
        return 'Follow-up Note';
      case 'treatment':
        return 'Treatment Note';
      case 'consultation':
        return 'Consultation Note';
      default:
        return 'Note';
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'general':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'follow_up':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'treatment':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'consultation':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Note History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Note History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            Error loading note history. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Note History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {noteHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No notes found for this client.
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {noteHistory.map((note) => (
                  <div
                    key={note.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getNoteTypeColor(note.noteType)}>
                            {getNoteTypeLabel(note.noteType)}
                          </Badge>
                          {note.appointment && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {note.appointment.service.name}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {note.noteContent}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(note.createdAt)} at {formatTime(note.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {note.createdByRole}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNote(note);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Note Details
            </DialogTitle>
            <DialogDescription>
              Note details for {clientName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNote && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Badge className={getNoteTypeColor(selectedNote.noteType)}>
                  {getNoteTypeLabel(selectedNote.noteType)}
                </Badge>
                {selectedNote.appointment && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {selectedNote.appointment.service.name}
                  </Badge>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Note Content</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedNote.noteContent}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatDate(selectedNote.createdAt)} at {formatTime(selectedNote.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Created By:</span>
                    <p className="text-gray-600 dark:text-gray-400 capitalize">
                      {selectedNote.createdByRole}
                    </p>
                  </div>
                  {selectedNote.appointment && (
                    <>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Appointment:</span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedNote.appointment.service.name}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Appointment Date:</span>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formatDate(selectedNote.appointment.startTime)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 