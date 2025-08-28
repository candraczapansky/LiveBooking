import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, User, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormSubmission {
  id: string;
  formId: number;
  clientId?: number | null;
  formData: Record<string, any>;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

interface FormField {
  id: string;
  type: string;
  config: {
    label: string;
    [key: string]: any;
  };
}

interface Form {
  id: number;
  title: string;
  fields: FormField[];
}

interface FormSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: number;
  formTitle: string;
}

// File preview dialog component
interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: any;
}

function FilePreviewDialog({ open, onOpenChange, file }: FilePreviewDialogProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  React.useEffect(() => {
    if (open && file) {
      console.log('FilePreviewDialog - File data:', file);
      console.log('FilePreviewDialog - File type:', typeof file);
      console.log('FilePreviewDialog - File name:', file?.name || file?.filename);
      console.log('FilePreviewDialog - File URL:', file?.url || file?.src);
      console.log('FilePreviewDialog - File MIME type:', file?.type);
      console.log('FilePreviewDialog - File data field:', file?.data);
      console.log('FilePreviewDialog - File data type:', typeof file?.data);
      console.log('FilePreviewDialog - File data starts with:', file?.data?.substring(0, 50));
    }
  }, [open, file]);

  // Enhanced file type detection
  const getFileExtension = (filename: string) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const fileName = file?.name || file?.filename || '';
  const fileUrl = typeof file === 'string' ? file : (file?.data || file?.url || file?.src || null);
  const fileExtension = getFileExtension(fileName);
  const mimeType = file?.type || '';

  // Validate base64 data
  const isValidBase64 = (str: string) => {
    if (!str || typeof str !== 'string') return false;
    if (!str.startsWith('data:')) return false;
    try {
      // Check if it's a valid data URL format
      const parts = str.split(',');
      if (parts.length !== 2) return false;
      const header = parts[0];
      const data = parts[1];
      return header.includes(';base64,') && data.length > 0;
    } catch (error) {
      return false;
    }
  };

  console.log('FilePreviewDialog - File extension:', fileExtension);
  console.log('FilePreviewDialog - MIME type:', mimeType);
  console.log('FilePreviewDialog - Final fileUrl:', fileUrl);
  console.log('FilePreviewDialog - FileUrl type:', typeof fileUrl);
  console.log('FilePreviewDialog - Is valid base64:', fileUrl ? isValidBase64(fileUrl) : 'no URL');

  // Enhanced file type detection
  const isImage = mimeType.startsWith('image/') || 
                  fileExtension.match(/^(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i) ||
                  (typeof file === 'string' && file.startsWith('data:image/')) ||
                  (file?.data && typeof file.data === 'string' && file.data.startsWith('data:image/'));

  const isPDF = mimeType === 'application/pdf' || 
                fileExtension === 'pdf' ||
                (typeof file === 'string' && file.includes('pdf')) ||
                (file?.data && typeof file.data === 'string' && file.data.includes('pdf'));

  const isText = mimeType.startsWith('text/') || 
                 fileExtension.match(/^(txt|md|json|xml|html|css|js|ts|jsx|tsx|py|java|c|cpp|h|sql|log|csv)$/i);

  const isVideo = mimeType.startsWith('video/') || 
                  fileExtension.match(/^(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i);

  const isAudio = mimeType.startsWith('audio/') || 
                  fileExtension.match(/^(mp3|wav|ogg|flac|aac|m4a)$/i);

  console.log('FilePreviewDialog - Detection results:', {
    isImage,
    isPDF,
    isText,
    isVideo,
    isAudio,
    fileName,
    fileUrl,
    mimeType,
    fileExtension
  });



  const getFileName = () => {
    if (typeof file === 'string') {
      return 'Uploaded file';
    }
    return file?.name || file?.filename || 'Uploaded file';
  };

  const getFileSize = () => {
    if (file?.size) {
      return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    }
    return null;
  };

  const getFileType = () => {
    if (isImage) return 'Image';
    if (isPDF) return 'PDF Document';
    if (isText) return 'Text File';
    if (isVideo) return 'Video';
    if (isAudio) return 'Audio';
    return `File (${fileExtension || 'unknown'})`;
  };

  // Load text file content
  const loadTextContent = async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
      } else {
        setFileContent('Unable to load file content');
      }
    } catch (error) {
      console.error('Error loading text file:', error);
      setFileContent('Error loading file content');
    } finally {
      setIsLoading(false);
    }
  };

  // Load file content when dialog opens
  React.useEffect(() => {
    if (open && fileUrl && isText) {
      loadTextContent(fileUrl);
    } else {
      setFileContent(null);
    }
  }, [open, fileUrl, isText]);

  const renderPreview = () => {
    console.log('FilePreviewDialog - renderPreview called with:', {
      isImage,
      isPDF,
      isText,
      isVideo,
      isAudio,
      fileUrl,
      fileContent
    });

    // If no file URL is available, show error
    if (!fileUrl) {
      return (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No file URL available for preview
          </p>
          <p className="text-sm text-gray-500 mb-4">
            File type: {getFileType()}
          </p>
          <p className="text-xs text-gray-400 mb-2">
            File name: {getFileName()}
          </p>
          <p className="text-xs text-gray-400 mb-2">
            File URL: {fileUrl ? 'Available' : 'Not available'}
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Has data field: {file?.data ? 'Yes' : 'No'}
          </p>
          <div className="text-xs text-gray-400 mt-2">
            <p>File data: {JSON.stringify(file, null, 2)}</p>
          </div>
        </div>
      );
    }

    if (isImage && fileUrl) {
      console.log('FilePreviewDialog - Rendering image with URL:', fileUrl);
      return (
        <div className="flex justify-center">
          <img 
            src={fileUrl} 
            alt={getFileName()}
            className="max-w-full max-h-[500px] object-contain rounded-lg border"
            onLoad={() => {
              console.log('FilePreviewDialog - Image loaded successfully:', fileUrl);
            }}
            onError={(e) => {
              console.error('FilePreviewDialog - Failed to load image:', fileUrl);
              console.error('FilePreviewDialog - Error details:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (isPDF && fileUrl) {
      return (
        <div className="w-full h-[500px] border rounded-lg">
          <iframe
            src={fileUrl}
            className="w-full h-full rounded-lg"
            title={getFileName()}
          />
        </div>
      );
    }

    if (isVideo && fileUrl) {
      return (
        <div className="flex justify-center">
          <video 
            controls 
            className="max-w-full max-h-[500px] rounded-lg border"
            src={fileUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isAudio && fileUrl) {
      return (
        <div className="flex justify-center">
          <audio 
            controls 
            className="w-full max-w-md"
            src={fileUrl}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    if (isText && fileContent !== null) {
      return (
        <div className="w-full h-[500px] border rounded-lg bg-gray-50 dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading file content...</span>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                {fileContent}
              </pre>
            </ScrollArea>
          )}
        </div>
      );
    }

    // Fallback for other file types
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Preview not available for this file type
        </p>
        <p className="text-sm text-gray-500 mb-4">
          File type: {getFileType()}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          File name: {getFileName()}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          File URL: {fileUrl ? 'Available' : 'Not available'}
        </p>
        {fileUrl && (
          <Button 
            onClick={() => window.open(fileUrl, '_blank')}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Preview: {getFileName()}
          </DialogTitle>
          <DialogDescription>
            {getFileType()} {getFileSize() && `• ${getFileSize()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {renderPreview()}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {getFileName()}
              {getFileSize() && ` • ${getFileSize()}`}
            </div>
            {fileUrl && (
              <Button 
                onClick={() => window.open(fileUrl, '_blank')}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FormSubmissionsDialog error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Error Loading Submissions</DialogTitle>
              <DialogDescription>
                Something went wrong while loading the form submissions.
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <Button 
                onClick={() => this.setState({ hasError: false })} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return this.props.children;
  }
}

export function FormSubmissionsDialog({
  open,
  onOpenChange,
  formId,
  formTitle,
}: FormSubmissionsDialogProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [fileToPreview, setFileToPreview] = useState<any>(null);
  const [attachSubmission, setAttachSubmission] = useState<FormSubmission | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  console.log('FormSubmissionsDialog render:', { open, formId, formTitle });

  // Fetch form configuration to get field labels
  const { data: form, isLoading: formLoading, error: formError } = useQuery({
    queryKey: [`/api/forms/${formId}`],
    queryFn: async () => {
      console.log('Fetching form data for ID:', formId);
      try {
        const response = await fetch(`/api/forms/${formId}`);
        console.log('Form response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Form fetch error:', errorText);
          throw new Error(`Failed to fetch form: ${response.status} ${response.statusText}`);
        }
        const formData = await response.json();
        console.log('Form data received:', formData);
        console.log('Form fields in response:', formData.fields);
        console.log('Form fields type:', typeof formData.fields);
        return formData as Promise<Form>;
      } catch (error) {
        console.error('Error in form fetch:', error);
        throw error;
      }
    },
    enabled: open && !!formId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch form submissions
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: [`/api/forms/${formId}/submissions`],
    queryFn: async () => {
      console.log('Fetching submissions for form ID:', formId);
      try {
        const response = await fetch(`/api/forms/${formId}/submissions`);
        console.log('Submissions response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Submissions fetch error:', errorText);
          throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
        }
        const submissionsData = await response.json();
        console.log('Submissions data received:', submissionsData);
        return submissionsData as Promise<FormSubmission[]>;
      } catch (error) {
        console.error('Error in submissions fetch:', error);
        throw error;
      }
    },
    enabled: open && !!formId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Clients list for attaching
  interface ClientOption { id: number; firstName?: string; lastName?: string; username?: string; email?: string; }
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/users", "clients"],
    queryFn: async () => {
      const res = await fetch('/api/users?role=client');
      if (!res.ok) throw new Error('Failed to load clients');
      return res.json() as Promise<ClientOption[]>;
    },
    enabled: open,
    staleTime: 60 * 1000,
  });

  const attachMutation = useMutation({
    mutationFn: async (vars: { submissionId: string; clientId: number }) => {
      const res = await fetch(`/api/form-submissions/${vars.submissionId}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: vars.clientId })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || 'Failed to attach');
      }
      return res.json();
    },
    onSuccess: async (_data, vars) => {
      try {
        await queryClient.invalidateQueries({ queryKey: [`/api/forms/${formId}/submissions`] });
        await queryClient.invalidateQueries({ queryKey: ["/api/form-submissions/unclaimed"] });
        await queryClient.invalidateQueries({ queryKey: [`/api/clients/${vars.clientId}/form-submissions`] });
        await queryClient.invalidateQueries({ queryKey: [`/api/note-history/client/${vars.clientId}`] });
      } catch {}
      setAttachSubmission(null);
      setSelectedClientId("");
      toast({ title: 'Form Attached', description: 'Submission attached to client profile.' });
    },
    onError: (err: any) => {
      toast({ title: 'Attach Failed', description: err?.message || 'Unable to attach submission', variant: 'destructive' });
    }
  });

  console.log('Query states:', { 
    formLoading, 
    formError, 
    form: !!form, 
    formFieldsType: typeof form?.fields,
    formFields: form?.fields,
    formFieldsLength: Array.isArray(form?.fields) ? form.fields.length : 'not array',
    formFieldsString: typeof form?.fields === 'string' ? (form.fields as string).substring(0, 100) + '...' : 'not string',
    isLoading, 
    error, 
    submissionsCount: submissions.length,
    sampleSubmissionData: submissions[0]?.formData
  });

  // Create a mapping from field IDs to field labels
  const fieldLabelMap = useMemo(() => {
    console.log('fieldLabelMap useMemo triggered with form?.fields:', form?.fields);
    console.log('Form loading state:', formLoading);
    console.log('Form error state:', formError);
    
    if (!form?.fields) {
      console.log('No form fields available for fieldLabelMap');
      console.log('Form object:', form);
      console.log('Form fields property:', form?.fields);
      return {};
    }
    
    // Parse fields if it's a JSON string, or use as-is if it's already an array
    let parsedFields: FormField[] = [];
    try {
      if (typeof form.fields === 'string') {
        console.log('Form fields is a string, parsing JSON...');
        const parsed = JSON.parse(form.fields);
        console.log('Parsed result:', parsed);
        if (Array.isArray(parsed)) {
          parsedFields = parsed;
          console.log('Successfully parsed fields array with', parsedFields.length, 'fields');
        } else {
          console.error('Parsed fields is not an array:', parsed);
          return {};
        }
      } else if (Array.isArray(form.fields)) {
        console.log('Form fields is already an array with', form.fields.length, 'fields');
        parsedFields = form.fields;
      } else {
        console.error('Form fields is not a string or array:', typeof form.fields, form.fields);
        return {};
      }
    } catch (error) {
      console.error('Error parsing form fields:', error);
      return {};
    }
    
    console.log('Creating fieldLabelMap from parsed fields:', parsedFields);
    
    const map: Record<string, string> = {};
    parsedFields.forEach((field) => {
      const label = field.config?.label || field.id;
      
      // Map the original field ID
      map[field.id] = label;
      
      // Also map the cleaned field ID (without timestamp) for better matching
      // This helps when form data uses field IDs like "field_1753634868182_street"
      const cleanFieldId = field.id.replace(/^field_\d+_/, '');
      if (cleanFieldId !== field.id) {
        map[cleanFieldId] = label;
      }

      // Special handling for Name field with first/last subfields
      if (field.type === 'name' && (field as any)?.config?.includeFirstLast) {
        map[`${field.id}_first`] = 'First Name';
        map[`${field.id}_last`] = 'Last Name';
        if (cleanFieldId !== field.id) {
          map[`${cleanFieldId}_first`] = 'First Name';
          map[`${cleanFieldId}_last`] = 'Last Name';
        }
      }
      
      console.log('Mapping field', field.id, 'to label:', label);
      if (cleanFieldId !== field.id) {
        console.log('Also mapping cleaned field', cleanFieldId, 'to label:', label);
      }
    });
    
    console.log('Final fieldLabelMap:', map);
    return map;
  }, [form?.fields, formLoading, formError]);

  // Function to get field label from field ID
  const getFieldLabel = (fieldId: string) => {
    // First try to get the label from the fieldLabelMap
    let label = fieldLabelMap?.[fieldId];
    
    // If not found, try to clean the field ID and look again
    if (!label) {
      // Remove "field_" prefix and timestamp if present
      // Pattern: field_1753634868182_street -> street
      const cleanFieldId = fieldId.replace(/^field_\d+_/, '');
      label = fieldLabelMap?.[cleanFieldId];
    }
    
    // If still not found, try to extract a readable name from the field ID
    if (!label) {
      // Remove "field_" prefix and timestamp, then convert to readable format
      const cleanFieldId = fieldId.replace(/^field_\d+_/, '').replace(/^field_\d+$/, '').replace(/^field_/, '');
      // Convert camelCase or snake_case to readable format
      label = cleanFieldId
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
        .trim();
    }
    
    // Fallback to the original field ID if all else fails
    if (!label) {
      label = fieldId;
    }
    
    console.log('getFieldLabel called for', fieldId, 'returning:', label);
    return label;
  };

  // Parse fields once for name extraction logic
  const parsedFieldsForName = useMemo(() => {
    try {
      if (!form?.fields) return [] as FormField[];
      if (typeof form.fields === 'string') {
        const parsed = JSON.parse(form.fields);
        return Array.isArray(parsed) ? (parsed as FormField[]) : [];
      }
      return Array.isArray(form.fields) ? (form.fields as FormField[]) : [];
    } catch {
      return [] as FormField[];
    }
  }, [form?.fields]);

  // Function to extract person's name from form data
  const getPersonName = (formData: Record<string, any>) => {
    console.log('getPersonName called with formData:', formData);
    
    // 1) Prefer explicit Name fields defined in the form schema
    if (parsedFieldsForName && parsedFieldsForName.length > 0) {
      for (const field of parsedFieldsForName) {
        if (field.type === 'name') {
          const first = formData[`${field.id}_first`];
          const last = formData[`${field.id}_last`];
          const single = formData[field.id];
          if (first || last) {
            const full = `${first || ''} ${last || ''}`.trim();
            if (full) {
              console.log('Using name from name field (first/last):', full);
              return full;
            }
          }
          if (typeof single === 'string' && single.trim()) {
            console.log('Using name from single name field:', single.trim());
            return single.trim();
          }
        }
      }

      // 2) Any text field whose label includes "name"
      for (const field of parsedFieldsForName) {
        const label = (field.config?.label || '').toLowerCase();
        if (label.includes('name')) {
          const value = formData[field.id];
          if (typeof value === 'string' && value.trim()) {
            console.log('Using name from label-matched field:', label, value.trim());
            return value.trim();
          }
        }
      }
    }
    
    // 3) Heuristic: Look for common name fields directly in submitted data
    const nameFields = [
      'name', 'fullName', 'full_name', 'fullname',
      'firstName', 'first_name', 'firstname',
      'lastName', 'last_name', 'lastname',
      'clientName', 'client_name', 'clientname',
      'customerName', 'customer_name', 'customername'
    ];

    // First, try to find a single name field
    for (const field of nameFields) {
      if (formData[field] && typeof formData[field] === 'string' && formData[field].trim()) {
        console.log('Found name in field:', field, formData[field]);
        return formData[field].trim();
      }
    }

    // If no single name field, try to combine first and last name
    const firstName = formData.firstName || formData.first_name || formData.firstname || '';
    const lastName = formData.lastName || formData.last_name || formData.lastname || '';
    
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim();
      console.log('Combined first/last name:', fullName);
      return fullName;
    }

    // Look for any field that might contain a name (including field IDs)
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.trim()) {
        // Check if the value looks like a name (contains letters and possibly spaces)
        const trimmedValue = value.trim();
        if (trimmedValue.length > 0 && 
            /^[a-zA-Z\s]+$/.test(trimmedValue) && 
            trimmedValue.length <= 50 && // Reasonable name length
            !trimmedValue.includes('@') && // Not an email
            !trimmedValue.includes('.') && // Not a file extension
            !/^\d+$/.test(trimmedValue)) { // Not just numbers
          
          console.log('Found potential name in field:', key, trimmedValue);
          return trimmedValue;
        }
      }
    }

    // If still no name found, look for any string value that might be a name
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.trim() && 
          (key.toLowerCase().includes('name') || 
           key.toLowerCase().includes('person') ||
           key.toLowerCase().includes('client'))) {
        console.log('Found name-like field:', key, value);
        return value.trim();
      }
    }

    console.log('No name found, returning Anonymous');
    // Fallback to "Anonymous" if no name found
    return "Anonymous";
  };

  // Function to render file upload values
  const renderFileValue = (value: any) => {
    console.log('renderFileValue called with:', value);
    console.log('renderFileValue type:', typeof value);
    console.log('renderFileValue isArray:', Array.isArray(value));
    
    // Handle different file data structures
    if (Array.isArray(value)) {
      console.log('Processing array of files:', value);
      // Multiple files
      return (
        <div className="space-y-2">
          {value.map((file: any, index: number) => {
            console.log(`File ${index}:`, file);
            
            // Handle new file structure with base64 data
            // const fileData = file.data || file;
            const fileName = file.name || file.filename || `File ${index + 1}`;
            const fileSize = file.size;
            // const fileType = file.type;
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  console.log('Setting file to preview (array):', file);
                  console.log('File data structure:', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: file.data ? file.data.substring(0, 100) + '...' : 'no data',
                    hasData: !!file.data
                  });
                  setFileToPreview(file);
                }}
              >
                <FileText className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {fileName}
                  </div>
                  {fileSize && (
                    <div className="text-xs text-gray-500">
                      {(fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Setting file to preview (button):', file);
                    setFileToPreview(file);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      );
    } else if (value && typeof value === 'object') {
      console.log('Processing single file object:', value);
      
      // Handle new file structure with base64 data
      // const fileData = value.data || value;
      const fileName = value.name || value.filename || 'Uploaded file';
      const fileSize = value.size;
      // const fileType = value.type;
      
      // Single file object
      return (
        <div 
          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => {
            console.log('Setting file to preview (object):', value);
            console.log('File data structure:', {
              name: value.name,
              type: value.type,
              size: value.size,
              data: value.data ? value.data.substring(0, 100) + '...' : 'no data',
              hasData: !!value.data
            });
            setFileToPreview(value);
          }}
        >
          <FileText className="h-4 w-4 text-gray-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {fileName}
            </div>
            {fileSize && (
              <div className="text-xs text-gray-500">
                {(fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Setting file to preview (button):', value);
              setFileToPreview(value);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      );
    } else if (typeof value === 'string') {
      console.log('Processing string value:', value);
      // String value (could be URL or filename)
      if (value.startsWith('http') || value.startsWith('data:')) {
        // URL or data URL
        return (
          <div 
            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => {
              console.log('Setting file to preview (string):', value);
              setFileToPreview(value);
            }}
          >
            <FileText className="h-4 w-4 text-gray-500" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                Uploaded file
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(value, '_blank');
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );
      } else {
        // Just a filename or description
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <FileText className="h-4 w-4 text-gray-500" />
            <div className="text-sm font-medium">
              {value}
            </div>
          </div>
        );
      }
    } else {
      console.log('Processing fallback value:', value);
      // Fallback for other types
      return <span className="text-gray-900 dark:text-gray-100">{String(value)}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportSubmissions = () => {
    if (submissions.length === 0) return;
    
    const fieldKeys = Object.keys(submissions[0]?.formData || {});
    const fieldLabels = fieldKeys.map(key => getFieldLabel(key));
    
    const csvContent = [
      ['Submission Date', 'IP Address', 'User Agent', ...fieldLabels].join(','),
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

  console.log('About to render dialog with states:', { 
    open, 
    isLoading, 
    error, 
    submissions: submissions.length,
    formLoading,
    formError
  });

  // Fallback UI if something goes wrong
  if (!open) {
    return null;
  }

  // Show loading state immediately when dialog opens
  if (isLoading || formLoading) {
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
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading submissions...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ErrorBoundary>
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

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">Failed to load submissions</p>
              <p className="text-sm text-gray-500 mt-2">
                {error instanceof Error ? error.message : "Unknown error occurred"}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm" 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          )}

          {!error && submissions.length === 0 && (
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

          {!error && submissions.length > 0 && (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {submissions.map((submission, index) => {
                  console.log(`Submission ${index} data:`, submission);
                  console.log(`Submission ${index} formData:`, submission.formData);
                  
                  return (
                    <Card key={submission.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <CardTitle className="text-sm">
                                {getPersonName(submission.formData)}
                              </CardTitle>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(submission.submittedAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {(!('clientId' in submission) || !submission.clientId) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAttachSubmission(submission)}
                              >
                                Attach
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Submission Details Dialog */}
          {selectedSubmission && (
            <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    {getPersonName(selectedSubmission.formData)} - Submission Details
                  </DialogTitle>
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
                            {getFieldLabel(key)}
                          </div>
                          <div className="text-gray-900 dark:text-gray-100">
                            {renderFileValue(value)}
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

          {/* File Preview Dialog */}
          {fileToPreview && (
            <FilePreviewDialog
              open={!!fileToPreview}
              onOpenChange={() => setFileToPreview(null)}
              file={fileToPreview}
            />
          )}
          {attachSubmission && (
            <Dialog open={!!attachSubmission} onOpenChange={() => setAttachSubmission(null)}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Attach Submission to Client</DialogTitle>
                  <DialogDescription>
                    Select a client profile to attach this submission.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {(c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : (c.username || c.email || `Client ${c.id}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAttachSubmission(null)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!selectedClientId) return;
                        attachMutation.mutate({ submissionId: attachSubmission.id, clientId: parseInt(selectedClientId) });
                      }}
                      disabled={!selectedClientId || attachMutation.isPending}
                    >
                      {attachMutation.isPending ? 'Attaching...' : 'Attach'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
} 