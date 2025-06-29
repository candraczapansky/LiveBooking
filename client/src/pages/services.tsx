import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CategoryList from "@/components/services/category-list";
import ServiceList from "@/components/services/service-list";
import ServiceForm from "@/components/services/service-form";
import CategoryForm from "@/components/services/category-form";
import { Button } from "@/components/ui/button";
import { PlusCircle, FolderPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";

const ServicesPage = () => {
  useDocumentTitle("Services | BeautyBook");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  // Fetch categories to get the first one by default
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Select the first category if none is selected yet
  if (!selectedCategoryId && categories && categories.length > 0) {
    setSelectedCategoryId(categories[0].id);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Services & Categories</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage your salon services and categories
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-2">
                <Button variant="outline" onClick={() => setIsCategoryFormOpen(true)} className="flex items-center justify-center">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
                <Button variant="default" onClick={() => setIsServiceFormOpen(true)} className="flex items-center justify-center">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>
            
            {/* Services Management */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-primary rounded-full" role="status" aria-label="loading"></div>
                  <div className="mt-4 text-gray-600 dark:text-gray-400">Loading services...</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Categories Sidebar */}
                <div className="lg:col-span-1">
                  <CategoryList 
                    selectedCategoryId={selectedCategoryId || 0} 
                    onCategorySelect={setSelectedCategoryId} 
                  />
                </div>
                
                {/* Services List */}
                <div className="lg:col-span-3">
                  {selectedCategoryId ? (
                    <ServiceList categoryId={selectedCategoryId} />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Please select a category or create one to manage services.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Service Form Modal */}
      <ServiceForm 
        open={isServiceFormOpen} 
        onOpenChange={setIsServiceFormOpen}
        onServiceCreated={(categoryId) => setSelectedCategoryId(categoryId)}
      />
      
      {/* Category Form Modal */}
      <CategoryForm 
        open={isCategoryFormOpen} 
        onOpenChange={setIsCategoryFormOpen} 
      />
    </div>
  );
};

export default ServicesPage;
