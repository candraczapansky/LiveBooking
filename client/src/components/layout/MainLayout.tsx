import Header from './header';
import { Sidebar } from './sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthProvider';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isOpen, isMobile } = useSidebar();
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const hideChrome = (!isAuthenticated && (location === '/login' || location === '/')) || location.startsWith('/reset-password');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        {!hideChrome && <Sidebar isOpen={isOpen} isMobile={isMobile} />}

        {/* Main Content */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${!hideChrome && isOpen ? 'md:ml-64' : 'ml-0'}`}>
          {!hideChrome && <Header />}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}