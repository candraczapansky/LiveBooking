import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Package, BarChart3, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
// Removed service category imports; products use their own categories

type Product = {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  category: string;
  brand?: string;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  isTaxable: boolean;
  weight?: number;
  dimensions?: string;
  imageUrl?: string;
  createdAt: string;
};

type ProductFormData = {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  category: string;
  brand: string;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  isTaxable: boolean;
  weight: number;
  dimensions: string;
  imageUrl: string;
};

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    price: 0,
    costPrice: 0,
    category: "",
    brand: "",
    stockQuantity: 0,
    minStockLevel: 5,
    isActive: true,
    isTaxable: true,
    weight: 0,
    dimensions: "",
    imageUrl: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch service categories only to exclude them from product category UI
  const { data: serviceCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/service-categories"],
  });

  // Product categories are independent: derive from products and exclude service categories (normalized)
  const excludedCategoryNames = new Set(
    (serviceCategories as any[]).map((c: any) => (c.name || "").trim().toLowerCase())
  );
  const productCategories = Array.from(
    new Set(
      (products || [])
        .map((p: Product) => (p.category || "").trim())
        .filter((c) => !!c && !excludedCategoryNames.has((c as string).toLowerCase()))
    )
  ).sort();

  const allCategories = Array.from(new Set([...(productCategories as string[]), ...extraCategories])).sort();

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const response = await apiRequest("POST", "/api/products", productData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "Product has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProductFormData> }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "Product has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "Product has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      barcode: "",
      price: 0,
      costPrice: 0,
      category: "",
      brand: "",
      stockQuantity: 0,
      minStockLevel: 5,
      isActive: true,
      isTaxable: true,
      weight: 0,
      dimensions: "",
      imageUrl: "",
    });
    setSelectedFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setFormData({ ...formData, imageUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let productData = { ...formData };
    
    // Require category selection
    if (!productData.category || productData.category.trim() === "") {
      toast({
        title: "Category required",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    // If a file is selected, convert it to base64
    if (selectedFile) {
      try {
        const base64Image = await convertFileToBase64(selectedFile);
        productData.imageUrl = base64Image;
      } catch (error) {
        console.error('Error converting file to base64:', error);
        alert('Error processing image file');
        return;
      }
    }
    
    // Sanitize payload: trim strings and remove empty optional fields to avoid unique("") conflicts
    const payload: any = {
      ...productData,
      name: productData.name.trim(),
      category: productData.category.trim(),
    };

    if (!productData.description || productData.description.trim() === "") delete payload.description; else payload.description = productData.description.trim();
    if (!productData.sku || productData.sku.trim() === "") delete payload.sku; else payload.sku = productData.sku.trim();
    if (!productData.barcode || productData.barcode.trim() === "") delete payload.barcode; else payload.barcode = productData.barcode.trim();
    if (!productData.brand || productData.brand.trim() === "") delete payload.brand; else payload.brand = productData.brand.trim();
    if (!productData.dimensions || productData.dimensions.trim() === "") delete payload.dimensions; else payload.dimensions = productData.dimensions.trim();
    if (!productData.imageUrl || productData.imageUrl.trim() === "") delete payload.imageUrl;

    // Client-side duplicate SKU check
    if (payload.sku && Array.isArray(products)) {
      const skuExists = (products as any[]).some((p: any) => (p.sku || '').toLowerCase() === payload.sku.toLowerCase());
      if (!editingProduct && skuExists) {
        toast({
          title: "Duplicate SKU",
          description: "That SKU already exists. Use a different SKU or leave it blank.",
          variant: "destructive",
        });
        return;
      }
    }

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createProductMutation.mutate(payload);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      price: product.price,
      costPrice: product.costPrice || 0,
      category: product.category,
      brand: product.brand || "",
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      isActive: product.isActive,
      isTaxable: product.isTaxable,
      weight: product.weight || 0,
      dimensions: product.dimensions || "",
      imageUrl: product.imageUrl || "",
    });
    // Show existing image preview if available
    if (product.imageUrl) {
      setImagePreview(product.imageUrl);
    } else {
      setImagePreview("");
    }
    setSelectedFile(null);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };



  const filteredProducts = (products as Product[])?.filter((product: Product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory 
      ? (product.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase() 
      : true;
    return matchesSearch && matchesCategory;
  }) || [];

  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter((p: Product) => p.isActive).length || 0;
  const lowStockProducts = products?.filter((p: Product) => p.stockQuantity <= p.minStockLevel).length || 0;
  const totalValue = products?.reduce((sum: number, p: Product) => sum + (p.price * p.stockQuantity), 0) || 0;

  return (
    <div className="flex min-h-screen lg:h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Product Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Manage your salon's product inventory and pricing
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <Card className="min-h-[120px] sm:min-h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Total Products</CardTitle>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">{totalProducts}</div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {activeProducts} active
                  </p>
                </CardContent>
              </Card>

              <Card className="min-h-[120px] sm:min-h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Low Stock Alert</CardTitle>
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">{lowStockProducts}</div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Products below minimum stock
                  </p>
                </CardContent>
              </Card>

              <Card className="min-h-[120px] sm:min-h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Inventory Value</CardTitle>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">${totalValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Total retail value
                  </p>
                </CardContent>
              </Card>

              <Card className="min-h-[120px] sm:min-h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Categories</CardTitle>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">
                    {allCategories.length}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Product categories
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Categories + Products Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Categories Sidebar (Product categories only) */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Product Categories</CardTitle>
                    <CardDescription>Filter products by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedCategory === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(null)}
                      >
                        All
                      </Button>
                      {allCategories.map((cat) => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button onClick={() => setIsAddCategoryOpen(true)} className="min-h-[36px]">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search, Add Product, and Products List */}
              <div className="lg:col-span-3">
                {/* Search and Add Product */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center mb-4 sm:mb-6">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                      placeholder="Search products..."
                      className="pl-8 w-full sm:w-80"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetForm()} className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                        <DialogDescription>
                          Enter the details for the new product below.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="category">Category *</Label>
                            {allCategories.length > 0 ? (
                              <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g., Hair Care, Skincare"
                                required
                              />
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="sku">SKU</Label>
                            <Input
                              id="sku"
                              value={formData.sku}
                              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="barcode">Barcode</Label>
                            <Input
                              id="barcode"
                              value={formData.barcode}
                              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="brand">Brand</Label>
                            <Input
                              id="brand"
                              value={formData.brand}
                              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="price">Retail Price *</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="costPrice">Cost Price</Label>
                            <Input
                              id="costPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.costPrice}
                              onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                            <Input
                              id="stockQuantity"
                              type="number"
                              min="0"
                              value={formData.stockQuantity}
                              onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
                            <Input
                              id="minStockLevel"
                              type="number"
                              min="0"
                              value={formData.minStockLevel}
                              onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="weight">Weight (grams)</Label>
                            <Input
                              id="weight"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.weight}
                              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="dimensions">Dimensions (L x W x H)</Label>
                            <Input
                              id="dimensions"
                              value={formData.dimensions}
                              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                              placeholder="e.g., 10 x 5 x 3 cm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="productImage">Product Image</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                id="productImage"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2"
                              >
                                <Upload className="h-4 w-4" />
                                {selectedFile ? 'Change Image' : 'Upload Image'}
                              </Button>
                              {selectedFile && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeImage}
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {imagePreview && (
                              <div className="mt-2">
                                <img
                                  src={imagePreview}
                                  alt="Product preview"
                                  className="h-20 w-20 object-cover rounded-md border"
                                />
                              </div>
                            )}
                            {selectedFile && (
                              <p className="text-sm text-muted-foreground">
                                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isActive"
                              checked={formData.isActive}
                              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                            <Label htmlFor="isActive">Active</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isTaxable"
                              checked={formData.isTaxable}
                              onCheckedChange={(checked) => setFormData({ ...formData, isTaxable: checked })}
                            />
                            <Label htmlFor="isTaxable">Taxable</Label>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="submit" disabled={createProductMutation.isPending}>
                            {createProductMutation.isPending ? "Creating..." : "Create Product"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Add Category Dialog */}
                  <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                    <DialogContent className="w-[95vw] sm:w-full max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Product Category</DialogTitle>
                        <DialogDescription>Enter a new product category name.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="new-category">Category Name</Label>
                          <Input
                            id="new-category"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Hair Care"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                          <Button
                            onClick={() => {
                              const name = newCategoryName.trim();
                              if (!name) return;
                              // Avoid duplicates (case-insensitive)
                              const exists = allCategories.some((c) => c.toLowerCase() === name.toLowerCase());
                              if (!exists) {
                                setExtraCategories((prev) => [...prev, name]);
                              }
                              setSelectedCategory(name);
                              setNewCategoryName("");
                              setIsAddCategoryOpen(false);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Products */}
                <Card>
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-lg sm:text-xl">Products ({filteredProducts.length})</CardTitle>
                    <CardDescription className="text-sm">
                      Manage your product inventory and details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6">
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card Layout */}
                        <div className="block md:hidden space-y-3">
                          {filteredProducts.map((product: Product) => (
                            <Card key={product.id} className="border border-gray-200 dark:border-gray-700">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base truncate">{product.name}</h3>
                                    {product.brand && (
                                      <p className="text-sm text-gray-500 truncate">{product.brand}</p>
                                    )}
                                    {product.sku && (
                                      <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(product)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(product.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="default" className="text-xs">{product.category}</Badge>
                                    <span className="font-semibold text-lg">${product.price.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">Stock: {product.stockQuantity}</span>
                                    {product.stockQuantity <= product.minStockLevel && (
                                      <Badge variant="destructive" className="text-xs">Low</Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-3 flex justify-between items-center">
                                  <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                                    {product.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Desktop Table Layout */}
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredProducts.map((product: Product) => (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                      {product.brand && (
                                        <div className="text-sm text-gray-500">{product.brand}</div>
                                      )}
                                      {product.sku && (
                                        <div className="text-xs text-gray-400">SKU: {product.sku}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="default">{product.category}</Badge>
                                  </TableCell>
                                  <TableCell>${product.price.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span>{product.stockQuantity}</span>
                                      {product.stockQuantity <= product.minStockLevel && (
                                        <Badge variant="destructive" className="text-xs">Low</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={product.isActive ? "default" : "secondary"}>
                                      {product.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(product)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(product.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}

                    {!isLoading && filteredProducts.length === 0 && (
                      <div className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No products found
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Get started by adding your first product to the inventory.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
                <DialogHeader>
                  <DialogTitle>Edit Product</DialogTitle>
                  <DialogDescription>
                    Update the product details below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Product Name *</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Category *</Label>
                      {allCategories.length > 0 ? (
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {allCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="edit-category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="e.g., Hair Care, Skincare"
                          required
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-sku">SKU</Label>
                      <Input
                        id="edit-sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-barcode">Barcode</Label>
                      <Input
                        id="edit-barcode"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-brand">Brand</Label>
                      <Input
                        id="edit-brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-price">Retail Price *</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-costPrice">Cost Price</Label>
                      <Input
                        id="edit-costPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-stockQuantity">Stock Quantity *</Label>
                      <Input
                        id="edit-stockQuantity"
                        type="number"
                        min="0"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-minStockLevel">Minimum Stock Level</Label>
                      <Input
                        id="edit-minStockLevel"
                        type="number"
                        min="0"
                        value={formData.minStockLevel}
                        onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-weight">Weight (grams)</Label>
                      <Input
                        id="edit-weight"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-dimensions">Dimensions (L x W x H)</Label>
                      <Input
                        id="edit-dimensions"
                        value={formData.dimensions}
                        onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                        placeholder="e.g., 10 x 5 x 3 cm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-productImage">Product Image</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="edit-productImage"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {selectedFile ? 'Change Image' : 'Upload Image'}
                        </Button>
                        {(selectedFile || imagePreview) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeImage}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Product preview"
                            className="h-20 w-20 object-cover rounded-md border"
                          />
                        </div>
                      )}
                      {selectedFile && (
                        <p className="text-sm text-muted-foreground">
                          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="edit-isActive">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-isTaxable"
                        checked={formData.isTaxable}
                        onCheckedChange={(checked) => setFormData({ ...formData, isTaxable: checked })}
                      />
                      <Label htmlFor="edit-isTaxable">Taxable</Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={updateProductMutation.isPending}>
                      {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
