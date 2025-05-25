import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type CategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: number;
};

const CategoryForm = ({ open, onOpenChange, categoryId }: CategoryFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch category data if editing
  useEffect(() => {
    if (categoryId && open) {
      setIsLoading(true);
      fetch(`/api/service-categories/${categoryId}`)
        .then(res => res.json())
        .then(data => {
          form.reset({
            name: data.name,
            description: data.description || "",
          });
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching category:", err);
          toast({
            title: "Error",
            description: "Failed to load category data",
            variant: "destructive",
          });
          setIsLoading(false);
          onOpenChange(false);
        });
    } else if (open && !categoryId) {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [categoryId, open, form, toast, onOpenChange]);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest("POST", "/api/service-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create category: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest("PUT", `/api/service-categories/${categoryId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-categories'] });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update category: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: CategoryFormValues) => {
    if (categoryId) {
      updateCategoryMutation.mutate(values);
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{categoryId ? "Edit Category" : "Add New Category"}</DialogTitle>
          <DialogDescription>
            {categoryId
              ? "Update the category details below."
              : "Create a new service category by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Hair Services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the category..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {isLoading || createCategoryMutation.isPending || updateCategoryMutation.isPending
                  ? "Saving..."
                  : categoryId
                  ? "Update Category"
                  : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryForm;