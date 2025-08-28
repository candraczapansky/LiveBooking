import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import ServiceDropdownView from "@/components/services/service-dropdown-view";
import { useDocumentTitle } from "@/hooks/use-document-title";

const ServicesPage = () => {
  useDocumentTitle("Services | Glo Head Spa");
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Services & Categories</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage your salon services and categories
                </p>
              </div>
            </div>
            
            {/* Services Management - Dropdown View Only */}
            <ServiceDropdownView />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServicesPage;
