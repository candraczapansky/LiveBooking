import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Eye, Download, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientFormSubmission {
  id: string;
  formId: number;
  formTitle: string;
  formType: string;
  formData: Record<string, any>;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ClientFormSubmissionsProps {
  clientId: number;
  clientName: string;
}

export default function ClientFormSubmissions({ clientId, clientName }: ClientFormSubmissionsProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<ClientFormSubmission | null>(null);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());
  const [fileToPreview, setFileToPreview] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch client form submissions
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: [`/api/clients/${clientId}/form-submissions`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/form-submissions`);
      if (!response.ok) {
        throw new Error('Failed to fetch form submissions');
      }
      return response.json() as Promise<ClientFormSubmission[]>;
    },
  });

  // When viewing a specific submission, fetch its form to map field IDs to labels
  const { data: selectedForm } = useQuery({
    queryKey: selectedSubmission?.formId ? [`/api/forms/${selectedSubmission.formId}`] : ["/api/forms/none"],
    queryFn: async () => {
      if (!selectedSubmission?.formId) return null as any;
      const res = await fetch(`/api/forms/${selectedSubmission.formId}`);
      if (!res.ok) return null as any;
      const data = await res.json();
      // Ensure fields is an array
      let fields = [] as any[];
      try {
        if (Array.isArray(data.fields)) fields = data.fields;
        else if (typeof data.fields === 'string') {
          const parsed = JSON.parse(data.fields);
          if (Array.isArray(parsed)) fields = parsed;
        }
      } catch {}
      return { ...data, fields } as any;
    },
    enabled: !!selectedSubmission?.formId,
    staleTime: 60 * 1000,
  });

  const fieldLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const list: any[] = Array.isArray((selectedForm as any)?.fields) ? (selectedForm as any).fields : [];
    for (const f of list) {
      const id = String(f?.id ?? '').trim();
      const raw = String((f?.config?.label ?? f?.label ?? id) || '').trim();
      const cleaned = raw
        .replace(/\bfield_\d+_/gi, '')
        .replace(/\bfield_\d+\b/gi, '')
        .replace(/^field_/i, '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
      const finalLabel = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Field';
      if (id) map[id] = finalLabel;
      const cleanId = id.replace(/^field_\d+_/i, '').replace(/^field_/i, '');
      if (cleanId && !map[cleanId]) map[cleanId] = finalLabel;
    }
    return map;
  }, [selectedForm]);

  const getCleanLabel = (key: string) => {
    // Prefer mapping from selected form
    if (fieldLabelMap && fieldLabelMap[key]) return fieldLabelMap[key];
    const stripped = key
      .replace(/^field_\d+_/i, '')
      .replace(/^field_\d+$/i, '')
      .replace(/^field_/i, '')
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
    if (!stripped) return 'Field';
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  };

  // Unclaimed submissions (not attached to any client)
  interface UnclaimedSubmission {
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    submittedAt: string;
    submitterName?: string;
  }

  const { data: unclaimed = [], isLoading: isLoadingUnclaimed } = useQuery({
    queryKey: ["/api/form-submissions/unclaimed"],
    queryFn: async () => {
      const res = await fetch("/api/form-submissions/unclaimed");
      if (!res.ok) throw new Error("Failed to fetch unclaimed submissions");
      return res.json() as Promise<UnclaimedSubmission[]>;
    },
  });

  const attachMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await fetch(`/api/form-submissions/${submissionId}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to attach form");
      }
      return res.json();
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/form-submissions`] });
        await queryClient.invalidateQueries({ queryKey: ["/api/form-submissions/unclaimed"] });
        await queryClient.invalidateQueries({ queryKey: [`/api/note-history/client/${clientId}`] });
      } catch {}
      toast({ title: "Form Attached", description: "The form has been added to the client's profile." });
    },
    onError: (error: any) => {
      toast({ title: "Attach Failed", description: error?.message || "Unable to attach form", variant: "destructive" });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFormTypeLabel = (type: string) => {
    switch (type) {
      case 'intake':
        return 'Intake Form';
      case 'feedback':
        return 'Feedback Survey';
      case 'booking':
        return 'Booking Form';
      default:
        return 'Form';
    }
  };

  const getFormTypeColor = (type: string) => {
    switch (type) {
      case 'intake':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'feedback':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'booking':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const toggleSubmissionExpansion = (submissionId: string) => {
    const newExpanded = new Set(expandedSubmissions);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedSubmissions(newExpanded);
  };

  const exportSubmissions = () => {
    if (submissions.length === 0) return;

    // Get all unique field names from all submissions
    const allFields = new Set<string>();
    submissions.forEach(sub => {
      Object.keys(sub.formData).forEach(key => allFields.add(key));
    });

    const csvContent = [
      ['Form Title', 'Form Type', 'Submission Date', 'IP Address', ...Array.from(allFields)].join(','),
      ...submissions.map(sub => [
        `"${sub.formTitle}"`,
        `"${getFormTypeLabel(sub.formType)}"`,
        `"${formatDate(sub.submittedAt)}"`,
        `"${sub.ipAddress || ''}"`,
        ...Array.from(allFields).map(field => `"${sub.formData[field] || ''}"`)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientName}-form-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Form Submissions
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
            <FileText className="h-5 w-5" />
            Form Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p>Failed to load form submissions</p>
            <p className="text-sm text-gray-500 mt-1">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Form Submissions
            </CardTitle>
            <div className="flex items-center gap-2">
              {submissions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSubmissions}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              )}
              <Select
                onValueChange={(val) => {
                  if (!val) return;
                  attachMutation.mutate(val);
                }}
                disabled={attachMutation.isPending || isLoadingUnclaimed || (unclaimed.length === 0)}
              >
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder={isLoadingUnclaimed ? "Loading…" : (unclaimed.length > 0 ? "Attach unclaimed form" : "No unclaimed forms") } />
                </SelectTrigger>
                <SelectContent>
                  {unclaimed.map((u) => {
                    const name = ((u as any).submitterName as string | undefined) ||
                      // Fallback: try to infer name from title when builder includes the client name
                      (u.formTitle && /\bby\s+([A-Za-z][A-Za-z\s'-]+)/i.test(u.formTitle) ? (u.formTitle.match(/\bby\s+([A-Za-z][A-Za-z\s'-]+)/i) as RegExpMatchArray)[1] : undefined);
                    const when = new Date(u.submittedAt).toLocaleString();
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        {name ? `${name} — ` : ''}{u.formTitle} — {when}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No form submissions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                When {clientName} submits forms, they will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {submission.formTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getFormTypeColor(submission.formType)}>
                            {getFormTypeLabel(submission.formType)}
                          </Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(submission.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSubmissionExpansion(submission.id)}
                      >
                        {expandedSubmissions.has(submission.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {expandedSubmissions.has(submission.id) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(submission.formData).map(([key, value]) => {
                          const val = value as any;
                          const isImage = typeof val === 'string' ? val.startsWith('data:image/') || /^https?:\/\//.test(val) : false;
                          const isObjWithData = val && typeof val === 'object' && typeof val.data === 'string' && val.data.startsWith('data:image/');
                          const isFileArray = Array.isArray(val);
                          return (
                            <div key={key} className="space-y-1">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                {getCleanLabel(key)}
                              </label>
                              {isFileArray ? (
                                <div className="space-y-2">
                                  {(val as any[]).map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFileToPreview(file)}
                                      >
                                        View Image
                                      </Button>
                                      <span className="text-xs text-gray-500 truncate max-w-[200px]">{file?.name || `Image ${idx + 1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : isObjWithData || isImage ? (
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFileToPreview(val)}
                                  >
                                    View Image
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                  {typeof val === 'string' ? val : JSON.stringify(val)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {submission.ipAddress && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-gray-500">
                            IP: {submission.ipAddress}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.formTitle}</DialogTitle>
            <DialogDescription>
              Form submission details for {clientName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Badge className={getFormTypeColor(selectedSubmission.formType)}>
                  {getFormTypeLabel(selectedSubmission.formType)}
                </Badge>
                <span className="text-sm text-gray-500">
                  Submitted on {formatDate(selectedSubmission.submittedAt)}
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Form Responses</h4>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(selectedSubmission.formData).map(([key, value]) => {
                    const val = value as any;
                    const isImage = typeof val === 'string' ? val.startsWith('data:image/') || /^https?:\/\//.test(val) : false;
                    const isObjWithData = val && typeof val === 'object' && typeof val.data === 'string' && val.data.startsWith('data:image/');
                    const isFileArray = Array.isArray(val);
                    return (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {getCleanLabel(key)}
                        </label>
                        {isFileArray ? (
                          <div className="space-y-2">
                            {(val as any[]).map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setFileToPreview(file)}
                                >
                                  View Image
                                </Button>
                                <span className="text-xs text-gray-500 truncate max-w-[200px]">{file?.name || `Image ${idx + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        ) : isObjWithData || isImage ? (
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFileToPreview(val)}
                            >
                              View Image
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {typeof val === 'string' ? val : JSON.stringify(val)}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {selectedSubmission.ipAddress && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Technical Details</h4>
                    <p className="text-sm text-gray-500">
                      IP Address: {selectedSubmission.ipAddress}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* File Preview */}
      <Dialog open={!!fileToPreview} onOpenChange={() => setFileToPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription>Preview of the uploaded file</DialogDescription>
          </DialogHeader>
          {fileToPreview && (
            <ScrollArea className="h-[70vh]">
              {typeof fileToPreview === 'string' ? (
                fileToPreview.startsWith('data:') || /^https?:\/\//.test(fileToPreview) ? (
                  <img src={fileToPreview} alt="Uploaded" className="max-w-full max-h-[70vh] object-contain rounded border" />
                ) : (
                  <pre className="text-xs p-2 bg-gray-50 rounded border">{fileToPreview}</pre>
                )
              ) : (
                typeof fileToPreview?.data === 'string' && fileToPreview.data.startsWith('data:') ? (
                  <img src={fileToPreview.data} alt={fileToPreview?.name || 'Uploaded'} className="max-w-full max-h-[70vh] object-contain rounded border" />
                ) : (
                  <pre className="text-xs p-2 bg-gray-50 rounded border">{JSON.stringify(fileToPreview, null, 2)}</pre>
                )
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 