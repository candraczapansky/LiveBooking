import { useState, useRef } from "react";
import { Image, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ImageUploadFieldProps {
  label: string;
  required?: boolean;
  multiple?: boolean;
  maxSize?: number; // in MB
  accept?: string;
  showPreview?: boolean;
  aspectRatio?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
}

export function ImageUploadField({
  label,
  required = false,
  multiple = false,
  maxSize = 5,
  accept = "image/*",
  showPreview = true,
  aspectRatio = "auto",
  value = [],
  onChange,
  disabled = false
}: ImageUploadFieldProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    fileArray.forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type. Only images are allowed.');
        return;
      }

      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        console.error(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`);
        return;
      }

      validFiles.push(file);

      // Create preview URL
      if (showPreview) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      }
    });

    if (multiple) {
      const allFiles = [...value, ...validFiles];
      onChange?.(allFiles);
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    } else {
      onChange?.(validFiles);
      setPreviewUrls(newPreviewUrls);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    onChange?.(newFiles);
    setPreviewUrls(newPreviewUrls);
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "1:1": return "aspect-square";
      case "4:3": return "aspect-[4/3]";
      case "16:9": return "aspect-video";
      case "3:4": return "aspect-[3/4]";
      default: return "aspect-auto";
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {dragActive ? "Drop images here" : "Click to upload images"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {multiple ? "Multiple images allowed" : "Single image only"} • Max {maxSize}MB
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Supported formats: JPG, PNG, GIF, WebP
        </p>
      </div>

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Preview Section */}
      {showPreview && previewUrls.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <div className={`${getAspectRatioClass()} bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden`}>
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="mt-1 text-xs text-gray-500 truncate">
                  {value[index]?.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List (when preview is disabled) */}
      {!showPreview && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="text-sm font-medium">Uploaded Files</span>
          </div>
          <div className="space-y-1">
            {value.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 