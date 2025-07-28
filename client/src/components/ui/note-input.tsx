import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  showTemplateSelector?: boolean;
  category?: string; // Filter templates by category
}

type NoteTemplate = {
  id: number;
  name: string;
  description?: string;
  content: string;
  category: string;
  isActive: boolean;
};

export function NoteInput({
  value,
  onChange,
  placeholder = "Add notes...",
  disabled = false,
  rows = 3,
  className = "",
  showTemplateSelector = true,
  category
}: NoteInputProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isTemplateApplied, setIsTemplateApplied] = useState(false);

  // Fetch note templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/note-templates'],
    queryFn: async () => {
      const response = await fetch('/api/note-templates');
      if (!response.ok) throw new Error('Failed to fetch note templates');
      return response.json();
    },
    enabled: showTemplateSelector
  });

  // Filter templates by category if specified
  const filteredTemplates = templates?.filter((template: NoteTemplate) => {
    if (!template.isActive) return false;
    
    // If no category is specified, show all templates
    if (!category) return true;
    
    // For appointments, show templates from multiple relevant categories
    if (category === "appointment") {
      return ["appointment", "general", "consultation", "treatment", "follow_up"].includes(template.category);
    }
    
    // For other categories, use exact match
    return template.category === category;
  }) || [];

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) return;
    
    const selectedTemplate = filteredTemplates.find((t: NoteTemplate) => t.id.toString() === templateId);
    if (selectedTemplate) {
      // If there's already content, append the template content
      const newContent = value ? `${value}\n\n${selectedTemplate.content}` : selectedTemplate.content;
      onChange(newContent);
      setSelectedTemplateId(templateId);
      setIsTemplateApplied(true);
    }
  };

  const clearTemplate = () => {
    setSelectedTemplateId("");
    setIsTemplateApplied(false);
  };

  const selectedTemplate = filteredTemplates.find((t: NoteTemplate) => t.id.toString() === selectedTemplateId);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Template Selector */}
      {showTemplateSelector && filteredTemplates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Note Templates</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={selectedTemplateId}
              onValueChange={handleTemplateSelect}
              disabled={disabled || templatesLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((template: NoteTemplate) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isTemplateApplied && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearTemplate}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {selectedTemplate && (
            <div className="text-xs text-muted-foreground">
              Template: <span className="font-medium">{selectedTemplate.name}</span>
              {selectedTemplate.description && (
                <span className="ml-2">- {selectedTemplate.description}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Note Textarea */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );
} 