import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle, AlertCircle } from "lucide-react";

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number' | 'name' | 'address' | 'rating' | 'image' | 'file';
  label?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
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
  };
}

interface Form {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  fields: FormField[];
  submissions?: number;
  lastSubmission?: string;
}

const FormDisplay = () => {
  const [location] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Extract form ID and client ID from URL
  const formId = location.split('/forms/')[1]?.split('?')[0];
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const clientId = urlParams.get('clientId');

  // Clear any stored user data to prevent authentication attempts on public forms
  useEffect(() => {
    // Clear user data from localStorage to prevent AuthProvider from trying to authenticate
    localStorage.removeItem('user');
    localStorage.removeItem('profilePicture');
    // Also clear any other auth-related data
    sessionStorage.removeItem('user');
  }, []);

  useDocumentTitle(`Form | Glo Head Spa`);



  // Fetch form data
  const { data: form, isLoading, error } = useQuery({
    queryKey: [`/api/forms/${formId}`],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}`);
      
      if (!response.ok) {
        throw new Error('Form not found');
      }
      
      const formData = await response.json();
      
      // Parse fields from JSON string to array
      let parsedFields = [];
      try {
        if (formData.fields) {
          const parsed = JSON.parse(formData.fields);
          // Ensure fields is always an array
          if (Array.isArray(parsed)) {
            parsedFields = parsed;
          } else {
            console.error('Fields is not an array:', parsed);
            parsedFields = [];
          }
        }
      } catch (error) {
        parsedFields = [];
      }
      
      return {
        ...formData,
        fields: parsedFields,
      } as Form;
    },
    enabled: !!formId,
    retry: 1,
    retryDelay: 1000,
  });

  // Update document title when form loads
  useEffect(() => {
    if (form) {
      document.title = `${form.title} | Glo Head Spa`;
    }
  }, [form]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateForm = () => {
    if (!form?.fields || !Array.isArray(form.fields)) return false;
    
    for (const field of form.fields) {
      const isRequired = field.required || field.config?.required;
      const fieldLabel = field.label || field.config?.label || field.id;
      
      if (isRequired && (!formData[field.id] || formData[field.id] === '')) {
        toast({
          title: "Validation Error",
          description: `Please fill in the required field: ${fieldLabel}`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Convert file uploads to base64 before submission
      const processedFormData = { ...formData };
      
      // Process each field to convert File objects to base64
      for (const [fieldId, value] of Object.entries(processedFormData)) {
        if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
          // Convert File array to base64 array
          const base64Files = await Promise.all(
            value.map(async (file: File) => {
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            })
          );
          
          // Store as array of base64 strings with metadata
          processedFormData[fieldId] = base64Files.map((base64, index) => ({
            name: value[index].name,
            type: value[index].type,
            size: value[index].size,
            data: base64
          }));
        } else if (value instanceof File) {
          // Convert single File to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(value);
          });
          
          processedFormData[fieldId] = {
            name: value.name,
            type: value.type,
            size: value.size,
            data: base64
          };
        }
      }

      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: processedFormData,
          submittedAt: new Date().toISOString(),
          clientId: clientId ? parseInt(clientId) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setIsSubmitted(true);
      toast({
        title: "Success",
        description: "Form submitted successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';
    const fieldLabel = field.label || field.config?.label || field.id;
    const fieldPlaceholder = field.placeholder || field.config?.placeholder;
    const fieldRequired = field.required || field.config?.required;
    
    switch (field.type) {
      case 'name':
        if (field.config?.includeFirstLast) {
          return (
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="First Name"
                value={formData[`${field.id}_first`] || ''}
                onChange={(e) => handleFieldChange(`${field.id}_first`, e.target.value)}
                required={fieldRequired}
              />
              <Input
                placeholder="Last Name"
                value={formData[`${field.id}_last`] || ''}
                onChange={(e) => handleFieldChange(`${field.id}_last`, e.target.value)}
                required={fieldRequired}
              />
            </div>
          );
        } else {
          return (
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={fieldPlaceholder}
              required={fieldRequired}
            />
          );
        }
      
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={fieldPlaceholder}
            required={fieldRequired}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={fieldPlaceholder}
            required={fieldRequired}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={fieldPlaceholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.options || field.config?.options) && (field.options || field.config?.options)?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={field.id}>{fieldLabel}</Label>
          </div>
        );
      
      case 'radio':
        return (
          <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            {Array.isArray(field.options || field.config?.options) && (field.options || field.config?.options)?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={fieldRequired}
          />
        );
      
      case 'address':
        return (
          <div className="space-y-2">
            {field.config?.includeStreet && (
              <Input
                placeholder="Street Address"
                value={formData[`${field.id}_street`] || ''}
                onChange={(e) => handleFieldChange(`${field.id}_street`, e.target.value)}
                required={fieldRequired}
              />
            )}
            <div className="grid grid-cols-3 gap-2">
              {field.config?.includeCity && (
                <Input
                  placeholder="City"
                  value={formData[`${field.id}_city`] || ''}
                  onChange={(e) => handleFieldChange(`${field.id}_city`, e.target.value)}
                  required={fieldRequired}
                />
              )}
              {field.config?.includeState && (
                <Input
                  placeholder="State"
                  value={formData[`${field.id}_state`] || ''}
                  onChange={(e) => handleFieldChange(`${field.id}_state`, e.target.value)}
                  required={fieldRequired}
                />
              )}
              {field.config?.includeZip && (
                <Input
                  placeholder="ZIP Code"
                  value={formData[`${field.id}_zip`] || ''}
                  onChange={(e) => handleFieldChange(`${field.id}_zip`, e.target.value)}
                  required={fieldRequired}
                />
              )}
            </div>
          </div>
        );
      
      case 'rating':
        const maxStars = field.config?.maxStars || 5;
        return (
          <div className="flex items-center space-x-1">
            {Array.from({ length: maxStars }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleFieldChange(field.id, i + 1)}
                className={`text-2xl ${
                  (value || 0) > i ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500">
              {value ? `${value} of ${maxStars}` : `Rate 1-${maxStars}`}
            </span>
          </div>
        );
      
      case 'image':
      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept={field.config?.accept || (field.type === 'image' ? 'image/*' : '*')}
              multiple={field.config?.multiple}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFieldChange(field.id, Array.from(files));
                }
              }}
              required={fieldRequired}
            />
            {field.config?.showPreview && value && Array.isArray(value) && value.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Array.from(value).map((file: any, index: number) => (
                  <div key={index} className="text-sm text-gray-500">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={fieldPlaceholder}
            required={fieldRequired}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading form...</p>
          <p className="text-sm text-gray-500 mt-2">Form ID: {formId}</p>
        </div>
      </div>
    );
  }



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading form...</p>
          <p className="text-xs text-gray-500 mt-2">Form ID: {formId}</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Form Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The form you're looking for doesn't exist or has been removed.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              What to do:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Check if you have the correct link from your SMS</li>
              <li>• Try refreshing the page</li>
              <li>• Contact the form sender for a new link</li>
            </ul>
          </div>
          
          {error && (
            <p className="text-red-500 mt-2 text-sm">
              Error: {(error as Error).message}
            </p>
          )}
          
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>Form ID: {formId}</p>
            <p>Location: {location}</p>
            <p>Current URL: {window.location.href}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Thank You!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your form has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">


        
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 text-primary mb-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400">
              {form.description}
            </p>
          )}
        </div>



        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Form Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {Array.isArray(form.fields) && form.fields.length > 0 ? (
                form.fields.map((field) => {
                  const fieldLabel = field.label || field.config?.label || field.id;
                  const fieldRequired = field.required || field.config?.required;
                  
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id} className="text-sm font-medium">
                        {fieldLabel}
                        {fieldRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No form fields defined</p>
                  <p className="text-sm text-gray-400 mt-1">
                    This form doesn't have any fields configured yet.
                  </p>
                </div>
              )}

              {Array.isArray(form.fields) && form.fields.length > 0 && (
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Form
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FormDisplay; 