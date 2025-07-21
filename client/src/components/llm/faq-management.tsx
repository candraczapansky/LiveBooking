import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FAQEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  priority: number;
}

const FAQManagement: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQEntry | null>(null);
  const [formData, setFormData] = useState<FAQFormData>({
    question: '',
    answer: '',
    category: '',
    priority: 1
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch FAQ entries
  const { data: faqEntries = [], isLoading, error } = useQuery({
    queryKey: ['faq-entries'],
    queryFn: async () => {
      const response = await fetch('/api/business-knowledge');
      if (!response.ok) throw new Error('Failed to fetch FAQ entries');
      return response.json();
    }
  });

  // Fetch categories
  const { data: categoryList = [] } = useQuery({
    queryKey: ['faq-categories'],
    queryFn: async () => {
      const response = await fetch('/api/business-knowledge/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Add new FAQ entry
  const addFAQMutation = useMutation({
    mutationFn: async (data: FAQFormData) => {
      const response = await fetch('/api/business-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add FAQ entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-entries'] });
      setIsAddDialogOpen(false);
      setFormData({ question: '', answer: '', category: '', priority: 1 });
      toast({
        title: "FAQ Entry Added",
        description: "FAQ entry has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Add Failed",
        description: "Failed to add FAQ entry",
        variant: "destructive",
      });
      console.error('Add FAQ error:', error);
    }
  });

  // Update FAQ entry
  const updateFAQMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FAQFormData }) => {
      const response = await fetch(`/api/business-knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update FAQ entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-entries'] });
      setEditingFAQ(null);
      setFormData({ question: '', answer: '', category: '', priority: 1 });
      toast({
        title: "FAQ Entry Updated",
        description: "FAQ entry has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update FAQ entry",
        variant: "destructive",
      });
      console.error('Update FAQ error:', error);
    }
  });

  // Delete FAQ entry
  const deleteFAQMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/business-knowledge/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete FAQ entry');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-entries'] });
      toast({
        title: "FAQ Entry Deleted",
        description: "FAQ entry has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete FAQ entry",
        variant: "destructive",
      });
      console.error('Delete FAQ error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFAQ) {
      updateFAQMutation.mutate({ id: editingFAQ.id.toString(), data: formData });
    } else {
      addFAQMutation.mutate(formData);
    }
  };

  const handleEdit = (faq: FAQEntry) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.title,
      answer: faq.content,
      category: faq.category,
      priority: faq.priority
    });
  };

  const handleCancel = () => {
    setIsAddDialogOpen(false);
    setEditingFAQ(null);
    setFormData({ question: '', answer: '', category: '', priority: 1 });
  };

  const existingCategories = Array.from(new Set(faqEntries.map((faq: FAQEntry) => faq.category).filter(Boolean))) as string[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mb-6">
        <AlertDescription>
          Failed to load FAQ entries. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Knowledge & FAQ</h2>
          <p className="text-gray-600 mt-1">
            Manage business information that helps the AI provide accurate responses to clients
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New FAQ Entry</DialogTitle>
              <p className="text-sm text-gray-600">
                Add a new question and answer to help the AI provide better responses to clients.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question/Topic
                </label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g., What are your pricing plans?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer/Information
                </label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide detailed information about this topic..."
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-5)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addFAQMutation.isPending}>
                  {addFAQMutation.isPending ? 'Adding...' : 'Add Entry'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{faqEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold">{existingCategories.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold">
                {faqEntries.filter((faq: FAQEntry) => faq.priority >= 4).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Recently Added</p>
              <p className="text-2xl font-bold">
                {faqEntries.filter((faq: FAQEntry) => {
                  const createdAt = new Date(faq.createdAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return createdAt > weekAgo;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryList.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCategory !== 'all' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* FAQ Entries */}
      <div className="space-y-4">
        {existingCategories
          .filter(category => selectedCategory === 'all' || category === selectedCategory)
          .map((category) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">{category}</Badge>
                <span className="text-lg">
                  {faqEntries.filter((faq: FAQEntry) => faq.category === category).length} entries
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {faqEntries
                  .filter((faq: FAQEntry) => faq.category === category)
                  .sort((a: FAQEntry, b: FAQEntry) => b.priority - a.priority)
                  .map((faq: FAQEntry) => (
                    <div key={faq.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{faq.title}</h4>
                            <Badge variant={faq.priority >= 4 ? 'destructive' : 'secondary'}>
                              Priority {faq.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm">{faq.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Added: {new Date(faq.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(faq)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteFAQMutation.mutate(faq.id.toString())}
                            disabled={deleteFAQMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingFAQ && (
        <Dialog open={!!editingFAQ} onOpenChange={() => setEditingFAQ(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit FAQ Entry</DialogTitle>
              <p className="text-sm text-gray-600">
                Update the question, answer, category, or priority of this FAQ entry.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question/Topic
                </label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g., What are your pricing plans?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer/Information
                </label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide detailed information about this topic..."
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-5)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateFAQMutation.isPending}>
                  {updateFAQMutation.isPending ? 'Updating...' : 'Update Entry'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FAQManagement; 