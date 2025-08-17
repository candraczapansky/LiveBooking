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

  // Initialize global state
  useEffect(() => {
    (window as any).sidebarIsOpen = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
        (window as any).sidebarIsOpen = false;
      } else {
        setIsOpen(true);
        (window as any).sidebarIsOpen = true;
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for global state changes (for compatibility with other pages)
  useEffect(() => {
    const checkGlobalState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined && globalSidebarState !== isOpen) {
        setIsOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkGlobalState, 100);
    return () => clearInterval(interval);
  }, [isOpen]);

  const [isToggling, setIsToggling] = useState(false);

  const toggleSidebar = () => {
    // Prevent rapid toggling
    if (isToggling) {
      return;
    }
    
    setIsToggling(true);
    const newState = !isOpen;
    setIsOpen(newState);
    
    // Update global state for compatibility with other pages
    (window as any).sidebarIsOpen = newState;
    
    // Reset toggle flag after a short delay
    setTimeout(() => {
      setIsToggling(false);
    }, 300);
  };

  const closeSidebar = () => {
    setIsOpen(false);
    // Update global state for compatibility with other pages
    (window as any).sidebarIsOpen = false;
  };

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};