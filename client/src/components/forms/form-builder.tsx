import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from "@hello-pangea/dnd";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Settings, 
  Eye,
  Type,
  Calendar,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Hash,
  Star,
  CheckSquare,
  List,
  Image,
  FileText
} from "lucide-react";
import { ImageUploadField } from "./image-upload-field";
import { createForm } from "@/api/forms";

// Field types and their configurations
const FIELD_TYPES = [
  {
    id: "text",
    label: "Text Input",
    icon: Type,
    description: "Single line text input",
    defaultConfig: {
      label: "Text Field",
      placeholder: "Enter text...",
      required: false,
      validation: "none"
    }
  },
  {
    id: "textarea",
    label: "Text Area",
    icon: MessageSquare,
    description: "Multi-line text input",
    defaultConfig: {
      label: "Text Area",
      placeholder: "Enter your message...",
      required: false,
      rows: 3
    }
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    description: "Email address input",
    defaultConfig: {
      label: "Email Address",
      placeholder: "Enter your email...",
      required: false
    }
  },
  {
    id: "phone",
    label: "Phone Number",
    icon: Phone,
    description: "Phone number input",
    defaultConfig: {
      label: "Phone Number",
      placeholder: "Enter your phone number...",
      required: false
    }
  },
  {
    id: "date",
    label: "Date",
    icon: Calendar,
    description: "Date picker",
    defaultConfig: {
      label: "Date",
      required: false,
      minDate: "",
      maxDate: ""
    }
  },
  {
    id: "address",
    label: "Address",
    icon: MapPin,
    description: "Address input fields",
    defaultConfig: {
      label: "Address",
      required: false,
      includeStreet: true,
      includeCity: true,
      includeState: true,
      includeZip: true
    }
  },
  {
    id: "number",
    label: "Number",
    icon: Hash,
    description: "Numeric input",
    defaultConfig: {
      label: "Number",
      placeholder: "Enter a number...",
      required: false,
      min: "",
      max: ""
    }
  },
  {
    id: "rating",
    label: "Rating",
    icon: Star,
    description: "Star rating",
    defaultConfig: {
      label: "Rating",
      required: false,
      maxStars: 5
    }
  },
  {
    id: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    description: "Single checkbox",
    defaultConfig: {
      label: "Checkbox",
      required: false,
      description: ""
    }
  },
  {
    id: "radio",
    label: "Radio Buttons",
    icon: List,
    description: "Multiple choice (single selection)",
    defaultConfig: {
      label: "Radio Group",
      required: false,
      options: ["Option 1", "Option 2", "Option 3"]
    }
  },
  {
    id: "select",
    label: "Dropdown",
    icon: List,
    description: "Dropdown selection",
    defaultConfig: {
      label: "Select Option",
      required: false,
      options: ["Option 1", "Option 2", "Option 3"]
    }
  },
  {
    id: "image",
    label: "Image Upload",
    icon: Image,
    description: "Image upload with preview",
    defaultConfig: {
      label: "Upload Image",
      required: false,
      accept: "image/*",
      maxSize: 5, // MB
      multiple: false,
      showPreview: true,
      aspectRatio: "auto"
    }
  },
  {
    id: "file",
    label: "File Upload",
    icon: FileText,
    description: "General file upload field",
    defaultConfig: {
      label: "Upload File",
      required: false,
      accept: "image/*,.pdf,.doc,.docx,.txt,.csv",
      maxSize: 10, // MB
      multiple: false
    }
  },
  {
    id: "signature",
    label: "Signature",
    icon: FileText,
    description: "Digital signature pad",
    defaultConfig: {
      label: "Signature",
      required: false,
      penColor: "#000000",
      backgroundColor: "#ffffff"
    }
  },
  {
    id: "divider",
    label: "Section Divider",
    icon: FileText,
    description: "Visual separator between sections",
    defaultConfig: {
      label: "Section Break",
      style: "line",
      text: ""
    }
  }
];

// Form schema
const formBuilderSchema = z.object({
  title: z.string().min(1, "Form title is required"),
  description: z.string().optional(),
  type: z.enum(["intake", "feedback", "booking"]),
  status: z.enum(["active", "draft", "inactive"]),
});

type FormBuilderValues = z.infer<typeof formBuilderSchema>;

interface FormField {
  id: string;
  type: string;
  config: any;
}

interface FormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId?: number;
}

export function FormBuilder({ open, onOpenChange, formId }: FormBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  const form = useForm<FormBuilderValues>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "intake",
      status: "draft",
    },
  });

  // Reset form and fields when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        type: "intake",
        status: "draft",
      });
      setFields([]);
      setSelectedField(null);
      setShowFieldConfig(false);
      setActiveTab("builder");
    }
  }, [open, form]);

  // Add field to form
  const addField = (fieldType: string) => {
    const fieldTypeConfig = FIELD_TYPES.find(ft => ft.id === fieldType);
    if (!fieldTypeConfig) return;

    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      config: { ...fieldTypeConfig.defaultConfig }
    };

    setFields([...fields, newField]);
    setSelectedField(newField);
    setShowFieldConfig(true);
  };

  // Remove field from form
  const removeField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
      setShowFieldConfig(false);
    }
  };

  // Update field configuration
  const updateFieldConfig = (fieldId: string, config: any) => {
    setFields(fields.map(f => 
      f.id === fieldId ? { ...f, config } : f
    ));
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, config });
    }
  };

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFields(items);
  };

  // Render field preview
  const renderFieldPreview = (field: FormField) => {
    const { config } = field;
    
    switch (field.type) {
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
              rows={config.rows} 
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
              {Array.from({ length: config.maxStars }, (_, i) => (
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
              {config.options.map((option: string, index: number) => (
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
            </Select>
          </div>
        );
      
      case "image":
        return (
          <ImageUploadField
            label={config.label}
            required={config.required}
            multiple={config.multiple}
            maxSize={config.maxSize}
            showPreview={config.showPreview}
            aspectRatio={config.aspectRatio}
            disabled={true}
          />
        );
      
      case "file":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click to upload file
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {config.multiple ? "Multiple files allowed" : "Single file only"} • Max {config.maxSize}MB
              </p>
            </div>
          </div>
        );
      
      case "signature":
        return (
          <div className="space-y-2">
            <Label>{config.label}</Label>
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center min-h-[120px] flex items-center justify-center">
              <div className="text-gray-500 dark:text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Click to sign</p>
              </div>
            </div>
          </div>
        );
      
      case "divider":
        return (
          <div className="my-4">
            {config.text && (
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {config.text}
                </span>
              </div>
            )}
            <hr className="border-gray-300 dark:border-gray-600" />
          </div>
        );
      
      default:
        return <div>Unknown field type</div>;
    }
  };

  // Field configuration component
  const FieldConfig = ({ field }: { field: FormField }) => {
    const [config, setConfig] = useState(field.config);

    const updateConfig = (updates: any) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      updateFieldConfig(field.id, newConfig);
    };

    return (
      <div className="space-y-4">
        <div>
          <Label>Field Label</Label>
          <Input
            value={config.label}
            onChange={(e) => updateConfig({ label: e.target.value })}
            placeholder="Enter field label"
          />
        </div>

        {field.type === "text" && (
          <div>
            <Label>Placeholder</Label>
            <Input
              value={config.placeholder}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              placeholder="Enter placeholder text"
            />
          </div>
        )}

        {field.type === "textarea" && (
          <>
            <div>
              <Label>Placeholder</Label>
              <Input
                value={config.placeholder}
                onChange={(e) => updateConfig({ placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Rows</Label>
              <Input
                type="number"
                value={config.rows}
                onChange={(e) => updateConfig({ rows: parseInt(e.target.value) })}
                min="1"
                max="10"
              />
            </div>
          </>
        )}

        {(field.type === "email" || field.type === "phone") && (
          <div>
            <Label>Placeholder</Label>
            <Input
              value={config.placeholder}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              placeholder="Enter placeholder text"
            />
          </div>
        )}

        {field.type === "address" && (
          <div className="space-y-2">
            <Label>Address Components</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeStreet}
                  onCheckedChange={(checked) => 
                    updateConfig({ includeStreet: checked })
                  }
                />
                <Label>Include Street Address</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeCity}
                  onCheckedChange={(checked) => 
                    updateConfig({ includeCity: checked })
                  }
                />
                <Label>Include City</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeState}
                  onCheckedChange={(checked) => 
                    updateConfig({ includeState: checked })
                  }
                />
                <Label>Include State</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeZip}
                  onCheckedChange={(checked) => 
                    updateConfig({ includeZip: checked })
                  }
                />
                <Label>Include ZIP Code</Label>
              </div>
            </div>
          </div>
        )}

        {field.type === "number" && (
          <>
            <div>
              <Label>Placeholder</Label>
              <Input
                value={config.placeholder}
                onChange={(e) => updateConfig({ placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Minimum Value</Label>
                <Input
                  type="number"
                  value={config.min}
                  onChange={(e) => updateConfig({ min: e.target.value })}
                  placeholder="Min"
                />
              </div>
              <div>
                <Label>Maximum Value</Label>
                <Input
                  type="number"
                  value={config.max}
                  onChange={(e) => updateConfig({ max: e.target.value })}
                  placeholder="Max"
                />
              </div>
            </div>
          </>
        )}

        {field.type === "rating" && (
          <div>
            <Label>Maximum Stars</Label>
            <Input
              type="number"
              value={config.maxStars}
              onChange={(e) => updateConfig({ maxStars: parseInt(e.target.value) })}
              min="1"
              max="10"
            />
          </div>
        )}

        {(field.type === "radio" || field.type === "select") && (
          <div>
            <Label>Options (one per line)</Label>
            <Textarea
              value={config.options.join('\n')}
              onChange={(e) => updateConfig({ 
                options: e.target.value.split('\n').filter(opt => opt.trim()) 
              })}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              rows={4}
            />
          </div>
        )}

        {(field.type === "image" || field.type === "file") && (
          <>
            <div>
              <Label>Maximum File Size (MB)</Label>
              <Input
                type="number"
                value={config.maxSize}
                onChange={(e) => updateConfig({ maxSize: parseInt(e.target.value) })}
                min="1"
                max="50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={config.multiple}
                onCheckedChange={(checked) => updateConfig({ multiple: checked })}
              />
              <Label>Allow multiple files</Label>
            </div>
          </>
        )}

        {field.type === "image" && (
          <>
            <div>
              <Label>Aspect Ratio</Label>
              <Select 
                value={config.aspectRatio} 
                onValueChange={(value) => updateConfig({ aspectRatio: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Original)</SelectItem>
                  <SelectItem value="1:1">Square (1:1)</SelectItem>
                  <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                  <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                  <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={config.showPreview}
                onCheckedChange={(checked) => updateConfig({ showPreview: checked })}
              />
              <Label>Show image preview</Label>
            </div>
          </>
        )}

        {field.type === "signature" && (
          <>
            <div>
              <Label>Pen Color</Label>
              <Input
                type="color"
                value={config.penColor}
                onChange={(e) => updateConfig({ penColor: e.target.value })}
                className="h-10 w-20"
              />
            </div>
            <div>
              <Label>Background Color</Label>
              <Input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                className="h-10 w-20"
              />
            </div>
          </>
        )}

        {field.type === "divider" && (
          <div>
            <Label>Section Text (Optional)</Label>
            <Input
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter section title..."
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={config.required}
            onCheckedChange={(checked) => updateConfig({ required: checked })}
          />
          <Label>Required field</Label>
        </div>
      </div>
    );
  };

  const createFormMutation = useMutation({
    mutationFn: async (data: FormBuilderValues) => {
      // Call the real API to save the form to the database
      const savedForm = await createForm({
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
      });
      return savedForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Success",
        description: "Form created successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create form",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormBuilderValues) => {
    console.log("Form submitted with data:", data);
    console.log("Fields:", fields);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Form errors:", form.formState.errors);
    createFormMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{formId ? "Edit Form" : "Form Builder"}</DialogTitle>
          <DialogDescription>
            {formId
              ? "Update your form below."
              : "Build your form by adding fields and configuring them."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 gap-4">
          {/* Left Sidebar - Field Types */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-semibold">Form Fields</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {FIELD_TYPES.map((fieldType) => {
                  const Icon = fieldType.icon;
                  return (
                    <button
                      key={fieldType.id}
                      onClick={() => addField(fieldType.id)}
                      className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium text-sm">{fieldType.label}</div>
                          <div className="text-xs text-gray-500">{fieldType.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center - Form Builder */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("builder")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "builder"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Form Builder
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "preview"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {activeTab === "builder" ? (
                    <>
                      {/* Form Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Form Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Form Title</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Client Intake Form" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Form Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select form type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="intake">Intake Form</SelectItem>
                                        <SelectItem value="feedback">Feedback Survey</SelectItem>
                                        <SelectItem value="booking">Booking Form</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Describe the purpose of this form..."
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Form Fields */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Form Fields</CardTitle>
                          <p className="text-sm text-gray-500">
                            Drag and drop to reorder fields
                          </p>
                        </CardHeader>
                        <CardContent>
                          {fields.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No fields added yet. Add fields from the sidebar.</p>
                            </div>
                          ) : (
                            <DragDropContext onDragEnd={handleDragEnd}>
                              <Droppable droppableId="fields">
                                {(provided) => (
                                  <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-3"
                                  >
                                    {fields.map((field, index) => (
                                      <Draggable
                                        key={field.id}
                                        draggableId={field.id}
                                        index={index}
                                      >
                                        {(provided) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`border rounded-lg p-3 ${
                                              selectedField?.id === field.id
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                : "border-gray-200 dark:border-gray-700"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div
                                                {...provided.dragHandleProps}
                                                className="flex items-center space-x-2 cursor-move"
                                              >
                                                <GripVertical className="h-4 w-4 text-gray-400" />
                                                <Badge variant="outline">
                                                  {FIELD_TYPES.find(ft => ft.id === field.type)?.label}
                                                </Badge>
                                                <span className="font-medium">
                                                  {field.config.label}
                                                </span>
                                                {field.config.required && (
                                                  <span className="text-red-500">*</span>
                                                )}
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setSelectedField(field);
                                                    setShowFieldConfig(true);
                                                  }}
                                                >
                                                  <Settings className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeField(field.id)}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </DragDropContext>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    /* Preview Tab */
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Form Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div>
                              <h2 className="text-2xl font-bold mb-2">
                                {form.getValues("title") || "Untitled Form"}
                              </h2>
                              {form.getValues("description") && (
                                <p className="text-gray-600 dark:text-gray-400">
                                  {form.getValues("description")}
                                </p>
                              )}
                            </div>
                            
                            {fields.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <p>No fields to preview. Add some fields first.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {fields.map((field) => (
                                  <div key={field.id} className="p-4 border rounded-lg">
                                    {renderFieldPreview(field)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Form Submit Button */}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createFormMutation.isPending || form.formState.isSubmitting}
                    >
                      {createFormMutation.isPending ? "Creating..." : "Create Form"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Right Sidebar - Field Configuration */}
          {showFieldConfig && selectedField && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Field Configuration</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFieldConfig(false)}
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <FieldConfig field={selectedField} />
              </div>
            </div>
          )}
                </div>
      </DialogContent>
    </Dialog>
  );
} 