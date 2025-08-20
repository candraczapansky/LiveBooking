import { SidebarController } from "./sidebar";
import Header from "./header";
import { useSidebar } from "@/contexts/SidebarContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, isMobile } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController isOpen={isOpen} isMobile={isMobile} />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isOpen && !isMobile ? 'md:ml-64 ml-0' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}