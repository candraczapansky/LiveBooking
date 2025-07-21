import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, Calendar, Users, Star, CheckSquare, List, Image, Upload } from "lucide-react";

interface FormField {
  id: string;
  type: string;
  config?: {
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: string[];
    includeFirstLast?: boolean;
    includeStreet?: boolean;
    includeCity?: boolean;
    includeState?: boolean;
    includeZip?: boolean;
    maxStars?: number;
    maxSize?: number;
    accept?: string;
    multiple?: boolean;
    showPreview?: boolean;
    aspectRatio?: string;
    rows?: number;
    min?: string;
    max?: string;
  };
  // Old field structure properties
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  includeFirstLast?: boolean;
  includeStreet?: boolean;
  includeCity?: boolean;
  includeState?: boolean;
  includeZip?: boolean;
  maxStars?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  showPreview?: boolean;
  aspectRatio?: string;
  rows?: number;
  min?: string;
  max?: string;
}

interface Form {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  fields: FormField[];
  submissions: number;
  createdAt: string;
  lastSubmission?: string;
}

interface FormViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: number;
}

export function FormViewer({ open, onOpenChange, formId }: FormViewerProps) {
  // Fetch form data
  const { data: form, isLoading, error } = useQuery({
    queryKey: [`/api/forms/${formId}`],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}`);
      
      if (!response.ok) {
        throw new Error('Form not found');
      }
      
      const formData = await response.json();
      console.log('Raw form data:', formData);
      
      // Parse fields from JSON string to array with robust error handling
      let parsedFields = [];
      try {
        if (formData.fields) {
          console.log('Fields data type:', typeof formData.fields);
          console.log('Fields data:', formData.fields);
          
          // If fields is already an array, use it directly
          if (Array.isArray(formData.fields)) {
            parsedFields = formData.fields;
            console.log('Fields is already an array:', parsedFields);
          } else if (typeof formData.fields === 'string') {
            // Try to parse the string
            const parsed = JSON.parse(formData.fields);
            if (Array.isArray(parsed)) {
              parsedFields = parsed;
              console.log('Successfully parsed fields from JSON:', parsedFields);
            } else {
              console.error('Parsed fields is not an array:', parsed);
              parsedFields = [];
            }
          } else {
            console.error('Fields is not a string or array:', typeof formData.fields);
            parsedFields = [];
          }
        } else {
          console.log('No fields data found');
          parsedFields = [];
        }
      } catch (error) {
        console.error('Error parsing form fields:', error);
        console.error('Raw fields data that caused error:', formData.fields);
        parsedFields = [];
      }
      
      const result = {
        ...formData,
        fields: parsedFields,
      } as Form;
      
      console.log('Final form data:', result);
      return result;
    },
    enabled: open && !!formId,
    retry: 1,
    retryDelay: 1000,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "intake":
        return <FileText className="h-5 w-5" />;
      case "survey":
        return <Users className="h-5 w-5" />;
      case "appointment":
        return <Calendar className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "intake":
        return "Intake Form";
      case "survey":
        return "Survey";
      case "appointment":
        return "Appointment";
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "archived":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Render field preview
  const renderFieldPreview = (field: FormField) => {
    // Handle both old and new field structures
    const config = field.config || {
      label: field.label || `Field ${field.id}`,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
      includeFirstLast: field.includeFirstLast,
      includeStreet: field.includeStreet,
      includeCity: field.includeCity,
      includeState: field.includeState,
      includeZip: field.includeZip,
      maxStars: field.maxStars,
      maxSize: field.maxSize,
      accept: field.accept,
      multiple: field.multiple,
      showPreview: field.showPreview,
      aspectRatio: field.aspectRatio,
      rows: field.rows,
      min: field.min,
      max: field.max,
    };
    
    // Safety check for missing config
    if (!config) {
      return (
        <div className="space-y-2">
          <Label>Field {field.id}</Label>
          <Input placeholder="Field configuration missing" disabled />
        </div>
      );
    }
    
    switch (field.type) {
      case "name":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            {config.includeFirstLast ? (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First Name" disabled />
                <Input placeholder="Last Name" disabled />
              </div>
            ) : (
              <Input placeholder={config.placeholder} disabled />
            )}
          </div>
        );
      
      case "text":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Input placeholder={config.placeholder} disabled />
          </div>
        );
      
      case "textarea":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Textarea 
              placeholder={config.placeholder} 
              rows={config.rows || 3} 
              disabled 
            />
          </div>
        );
      
      case "email":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Input type="email" placeholder={config.placeholder} disabled />
          </div>
        );
      
      case "phone":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Input type="tel" placeholder={config.placeholder} disabled />
          </div>
        );
      
      case "date":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Input type="date" disabled />
          </div>
        );
      
      case "address":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="space-y-2">
              {config.includeStreet && (
                <Input placeholder="Street Address" disabled />
              )}
              <div className="grid grid-cols-2 gap-2">
                {config.includeCity && (
                  <Input placeholder="City" disabled />
                )}
                {config.includeState && (
                  <Input placeholder="State" disabled />
                )}
              </div>
              {config.includeZip && (
                <Input placeholder="ZIP Code" disabled />
              )}
            </div>
          </div>
        );
      
      case "number":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Input type="number" placeholder={config.placeholder} disabled />
          </div>
        );
      
      case "rating":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="flex space-x-1">
              {Array.from({ length: config.maxStars || 5 }, (_, i) => (
                <Star key={i} className="h-5 w-5 text-gray-300" />
              ))}
            </div>
          </div>
        );
      
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled />
            <Label>{config.label}</Label>
          </div>
        );
      
      case "radio":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="space-y-2">
              {config.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input type="radio" disabled />
                  <Label>{option}</Label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "select":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {config.options?.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "image":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <Image className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click to upload image
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {config.multiple ? "Multiple images allowed" : "Single image only"} • Max {config.maxSize || 5}MB
              </p>
            </div>
          </div>
        );
      
      case "file":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click to upload file
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {config.multiple ? "Multiple files allowed" : "Single file only"} • Max {config.maxSize || 10}MB
              </p>
            </div>
          </div>
        );
      
      case "divider":
        return (
          <div className="my-4">
            {config.label && (
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {config.label}
                </span>
              </div>
            )}
            <hr className="border-gray-300 dark:border-gray-600" />
          </div>
        );
      
      default:
        return <div>Unknown field type: {field.type}</div>;
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Form...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !form) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Loading Form</DialogTitle>
            <DialogDescription>
              Unable to load the form. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              {error instanceof Error ? error.message : "Form not found"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            View Form: {form?.title || 'Loading...'}
          </DialogTitle>
          <DialogDescription>
            Preview of the form as it appears to clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {getTypeIcon(form?.type || 'intake')}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{form?.title || 'Loading...'}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {getTypeLabel(form?.type || 'intake')}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {form?.submissions || 0} submissions
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(form?.status || 'draft')}>
                  {form?.status || 'draft'}
                </Badge>
              </div>
              {form?.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {form.description}
                </p>
              )}
            </CardHeader>
          </Card>

          {/* Form Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Form Preview</CardTitle>
              <p className="text-sm text-gray-500">
                This is how the form appears to clients when they fill it out
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {form?.fields && Array.isArray(form.fields) && form.fields.length > 0 ? (
                  form.fields.map((field) => (
                    <div key={field.id} className="p-4 border rounded-lg">
                      {renderFieldPreview(field)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fields defined in this form</p>
                    {form?.fields && !Array.isArray(form.fields) && (
                      <p className="text-xs text-red-500 mt-2">
                        Error: Fields data is not in the expected format
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Details */}
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="ml-2 font-medium">{form?.createdAt || 'N/A'}</span>
                </div>
                {form?.lastSubmission && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Last Submission:</span>
                    <span className="ml-2 font-medium">{form.lastSubmission}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Submissions:</span>
                  <span className="ml-2 font-medium">{form?.submissions || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Form ID:</span>
                  <span className="ml-2 font-medium">{form?.id || formId}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 