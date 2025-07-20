import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, User, Download, Eye } from "lucide-react";

interface FormSubmission {
  id: string;
  formId: number;
  formData: Record<string, any>;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface FormSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: number;
  formTitle: string;
}

export function FormSubmissionsDialog({
  open,
  onOpenChange,
  formId,
  formTitle,
}: FormSubmissionsDialogProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  // Fetch form submissions
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: [`/api/forms/${formId}/submissions`],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}/submissions`);
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      return response.json() as Promise<FormSubmission[]>;
    },
    enabled: open,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportSubmissions = () => {
    const csvContent = [
      ['Submission Date', 'IP Address', 'User Agent', ...Object.keys(submissions[0]?.formData || {})].join(','),
      ...submissions.map(sub => [
        formatDate(sub.submittedAt),
        sub.ipAddress || '',
        sub.userAgent || '',
        ...Object.values(sub.formData).map(value => `"${value}"`)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle}-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Form Submissions
          </DialogTitle>
          <DialogDescription>
            View submissions for "{formTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {submissions.length > 0 && (
            <Button onClick={exportSubmissions} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading submissions...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load submissions</p>
          </div>
        )}

        {!isLoading && !error && submissions.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No submissions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              When clients submit this form, their responses will appear here.
            </p>
          </div>
        )}

        {!isLoading && !error && submissions.length > 0 && (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">
                            Submission #{submissions.length - index}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(submission.submittedAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {Object.entries(submission.formData).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            {key}:
                          </span>
                          <span className="text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                      {Object.keys(submission.formData).length > 4 && (
                        <div className="col-span-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            View all {Object.keys(submission.formData).length} fields
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Submission Details Dialog */}
        {selectedSubmission && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Submission Details</DialogTitle>
                <DialogDescription>
                  Submitted on {formatDate(selectedSubmission.submittedAt)}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(selectedSubmission.formData).map(([key, value]) => (
                      <div key={key} className="p-3 border rounded-lg">
                        <div className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {key}
                        </div>
                        <div className="text-gray-900 dark:text-gray-100">
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Submission Metadata</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">IP Address:</span>
                        <span>{selectedSubmission.ipAddress || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">User Agent:</span>
                        <span className="text-xs truncate max-w-[300px]">
                          {selectedSubmission.userAgent || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
} 