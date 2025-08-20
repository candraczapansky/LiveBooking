import React from 'react';
import { SidebarController } from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import PermissionManager from '@/components/permissions/PermissionManager';
import { useDocumentTitle } from "@/hooks/use-document-title";

const PermissionsPage: React.FC = () => {
  useDocumentTitle("Permissions | Glo Head Spa");
  const { isOpen: sidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className="min-h-screen lg:h-screen flex flex-col transition-all duration-300">
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-auto lg:overflow-auto">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
            <PermissionManager />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PermissionsPage; 