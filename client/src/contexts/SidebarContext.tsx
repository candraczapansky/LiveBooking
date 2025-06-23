import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(!isMobile);

  useEffect(() => {
    console.log('SidebarProvider state:', { isMobile, isOpen });
  }, [isMobile, isOpen]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isToggling, setIsToggling] = useState(false);

  const toggleSidebar = () => {
    console.log('toggleSidebar called, current isOpen:', isOpen, 'isToggling:', isToggling);
    
    // Prevent rapid toggling
    if (isToggling) {
      console.log('Ignoring toggle - already in progress');
      return;
    }
    
    setIsToggling(true);
    setIsOpen(!isOpen);
    
    // Reset toggle flag after a short delay
    setTimeout(() => {
      setIsToggling(false);
    }, 300);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};