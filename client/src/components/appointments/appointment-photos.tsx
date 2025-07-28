import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Upload, 
  X, 
  Download, 
  Trash2, 
  Calendar,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AppointmentPhoto {
  id: number;
  appointmentId: number;
  photoData: string;
  photoType: 'before' | 'during' | 'after' | 'progress';
  description?: string;
  uploadedBy?: number;
  uploadedByRole?: string;
  createdAt: string;
}

interface AppointmentPhotosProps {
  appointmentId: number;
  onPhotosUpdated?: () => void;
}

const photoTypeLabels = {
  before: 'Before',
  during: 'During',
  after: 'After',
  progress: 'Progress'
};

const photoTypeColors = {
  before: 'bg-blue-100 text-blue-800',
  during: 'bg-yellow-100 text-yellow-800',
  after: 'bg-green-100 text-green-800',
  progress: 'bg-purple-100 text-purple-800'
};

export default function AppointmentPhotos({ appointmentId, onPhotosUpdated }: AppointmentPhotosProps) {
  const [photos, setPhotos] = useState<AppointmentPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<AppointmentPhoto | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<AppointmentPhoto | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state for upload
  const [uploadForm, setUploadForm] = useState({
    photoType: 'progress' as const,
    description: '',
    photoData: ''
  });

  // Load photos
  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/appointments/${appointmentId}/photos`);
      const photos = await response.json();
      setPhotos(photos);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment photos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [appointmentId]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadForm(prev => ({ ...prev, photoData: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Handle photo upload
  const handleUpload = async () => {
    if (!uploadForm.photoData) {
      toast({
        title: "No photo selected",
        description: "Please select a photo to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await apiRequest('POST', `/api/appointments/${appointmentId}/photos`, uploadForm);

      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });

      // Reset form and close dialog
      setUploadForm({
        photoType: 'progress',
        description: '',
        photoData: ''
      });
      setUploadDialogOpen(false);
      
      // Reload photos
      await loadPhotos();
      onPhotosUpdated?.();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      await apiRequest('DELETE', `/api/appointment-photos/${photoToDelete.id}`);

      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });

      await loadPhotos();
      onPhotosUpdated?.();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPhotoToDelete(null);
    }
  };

  // Open photo viewer
  const openPhotoViewer = (photo: AppointmentPhoto) => {
    setSelectedPhoto(photo);
    setPhotoViewerOpen(true);
  };

  // Download photo
  const downloadPhoto = (photo: AppointmentPhoto) => {
    const link = document.createElement('a');
    link.href = photo.photoData;
    link.download = `appointment-${appointmentId}-${photo.photoType}-${new Date(photo.createdAt).toISOString().split('T')[0]}.jpg`;
    link.click();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Progress Photos</h3>
          <p className="text-sm text-gray-500">
            Track service progress with photos over time
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Camera className="h-4 w-4 mr-2" />
          Add Photo
        </Button>
      </div>

      {/* Photos Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading photos...</p>
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No photos uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload photos to track service progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative group">
                <img
                  src={photo.photoData}
                  alt={`${photo.photoType} photo`}
                  className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openPhotoViewer(photo)}
                />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadPhoto(photo)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setPhotoToDelete(photo);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Photo type badge */}
                <div className="absolute top-2 left-2">
                  <Badge className={photoTypeColors[photo.photoType]}>
                    {photoTypeLabels[photo.photoType]}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                {photo.description && (
                  <p className="text-sm text-gray-600 mb-2">{photo.description}</p>
                )}
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(photo.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Progress Photo</DialogTitle>
            <DialogDescription>
              Add a photo to track the service progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo Type */}
            <div>
              <label className="text-sm font-medium">Photo Type</label>
              <Select
                value={uploadForm.photoType}
                onValueChange={(value: any) => setUploadForm(prev => ({ ...prev, photoType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="during">During</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                placeholder="Describe what this photo shows..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="text-sm font-medium">Photo</label>
              <div className="mt-1">
                {uploadForm.photoData ? (
                  <div className="relative">
                    <img
                      src={uploadForm.photoData}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1"
                      onClick={() => setUploadForm(prev => ({ ...prev, photoData: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadForm.photoData || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo Details</DialogTitle>
            <DialogDescription>
              View photo details and manage the photo
            </DialogDescription>
          </DialogHeader>

          {selectedPhoto && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={photoTypeColors[selectedPhoto.photoType]}>
                  {photoTypeLabels[selectedPhoto.photoType]}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(selectedPhoto.createdAt)}
                </div>
              </div>

              <img
                src={selectedPhoto.photoData}
                alt={`${selectedPhoto.photoType} photo`}
                className="w-full max-h-96 object-contain rounded-md"
              />

              {selectedPhoto.description && (
                <p className="text-sm text-gray-600">{selectedPhoto.description}</p>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => downloadPhoto(selectedPhoto)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setPhotoToDelete(selectedPhoto);
                    setDeleteDialogOpen(true);
                    setPhotoViewerOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhoto}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 