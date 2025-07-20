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
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';
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

  // Extract form ID from URL
  const formId = location.split('/forms/')[1]?.split('?')[0];

  useDocumentTitle(`Form | Glo Head Spa`);



  // Fetch form data
  const { data: form, isLoading, error } = useQuery({
    queryKey: [`/api/forms/${formId}`],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}`);
      if (!response.ok) {
        throw new Error('Form not found');
      }
      return response.json() as Promise<Form>;
    },
    enabled: !!formId,
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
    if (!form?.fields) return false;
    
    for (const field of form.fields) {
      const isRequired = field.required || field.config?.required;
      const fieldLabel = field.label || field.config?.label || field.id;
      
      if (isRequired && (!formData[field.id] || formData[field.id] === '')) {
        toast();
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
      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setIsSubmitted(true);
      toast();
    } catch (error) {
      toast();
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
              {(field.options || field.config?.options)?.map((option) => (
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
            {(field.options || field.config?.options)?.map((option) => (
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

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Form Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The form you're looking for doesn't exist or has been removed.
          </p>
          {error && (
            <p className="text-red-500 mt-2">
              Error: {error.message}
            </p>
          )}
          <div className="mt-4">
            <p className="text-sm text-gray-500">Form ID: {formId}</p>
            <p className="text-sm text-gray-500">Location: {location}</p>
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
            <FileText className="h-12 w-12" />
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
              <FileText className="h-5 w-5" />
              Form Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields?.map((field) => {
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
              })}

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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FormDisplay; 