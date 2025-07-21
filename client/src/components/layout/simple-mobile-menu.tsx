import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Menu, LayoutDashboard, Calendar, CalendarDays, Users, UserCircle, Scissors, Package, DollarSign, MapPin, Monitor, CreditCard, BarChart3, Megaphone, Zap, Settings, LogOut, Gift, Phone, FileText, Bot } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BusinessBrand } from "@/components/BusinessBrand";

const SimpleMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { logout } = useContext(AuthContext);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  
  // Use context user or fallback to localStorage user
  const user = useContext(AuthContext).user;
  const currentUser = user || localUser;

  useEffect(() => {
    // Load profile picture
    if (user && user.profilePicture) {
      setProfilePicture(user.profilePicture);
      localStorage.setItem('profilePicture', user.profilePicture);
    } else {
      const savedProfilePicture = localStorage.getItem('profilePicture');
      setProfilePicture(savedProfilePicture);
    }
    
    // Load user from localStorage if context isn't ready
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setLocalUser(userData);
        } catch (e) {
          // ignore
        }
      }
    } else {
      setLocalUser(user);
    }
    
    // Listen for user data updates
    const handleUserDataUpdate = (event: CustomEvent) => {
      setLocalUser(event.detail);
      if (event.detail && event.detail.profilePicture) {
        setProfilePicture(event.detail.profilePicture);
        localStorage.setItem('profilePicture', event.detail.profilePicture);
      }
    };
    
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [user]);

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Calendar, label: "Client Appointments", href: "/appointments" },
    { icon: CalendarDays, label: "Staff Working Hours", href: "/schedule" },
    { icon: Users, label: "Clients", href: "/clients" },
    { icon: UserCircle, label: "Staff", href: "/staff" },
    { icon: Scissors, label: "Services", href: "/services" },
    { icon: Package, label: "Products", href: "/products" },
    { icon: DollarSign, label: "Point of Sale", href: "/pos" },
    { icon: Gift, label: "Gift Certificates", href: "/gift-certificates" },
    { icon: MapPin, label: "Rooms", href: "/rooms" },
    { icon: Monitor, label: "Devices", href: "/devices" },
    { icon: CreditCard, label: "Memberships", href: "/memberships" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Megaphone, label: "Marketing", href: "/marketing" },
    { icon: Zap, label: "Automations", href: "/automations" },
    { icon: FileText, label: "Forms", href: "/forms" },
    { icon: Phone, label: "Phone", href: "/phone" },
    { icon: Bot, label: "AI Messaging", href: "/ai-messaging" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const toggleMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  }, [isOpen]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Save scroll position to both ref and localStorage
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      scrollPositionRef.current = scrollTop;
      localStorage.setItem('mobileMenuScroll', scrollTop.toString());
    }
  }, []);

  // Restore scroll position from ref first, then localStorage
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      // Try ref first (most recent)
      if (scrollPositionRef.current > 0) {
        scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        return;
      }
      
      // Fallback to localStorage
      const savedScrollTop = localStorage.getItem('mobileMenuScroll');
      if (savedScrollTop) {
        const scrollTop = parseInt(savedScrollTop, 10);
        scrollPositionRef.current = scrollTop;
        scrollContainerRef.current.scrollTop = scrollTop;
      }
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    saveScrollPosition();
  }, [saveScrollPosition]);

  // Restore scroll position when menu opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      // Use multiple timing strategies to ensure restoration
      const restoreStrategies = [
        () => restoreScrollPosition(),
        () => requestAnimationFrame(restoreScrollPosition),
        () => setTimeout(restoreScrollPosition, 10),
        () => setTimeout(restoreScrollPosition, 50),
        () => setTimeout(restoreScrollPosition, 100),
        () => setTimeout(restoreScrollPosition, 200)
      ];
      
      restoreStrategies.forEach(strategy => strategy());
    }
  }, [isOpen, restoreScrollPosition]);

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    // Save current scroll position before navigation
    saveScrollPosition();
    // Don't close menu, just prevent default behavior
    e.stopPropagation();
  }, [saveScrollPosition]);

  return (
    <>
      {/* Menu Button - positioned absolutely in top-left corner */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <button 
          onClick={toggleMenu}
          className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-shadow"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Always render the menu container, but control visibility with CSS */}
      {createPortal(
        <div
          ref={menuContainerRef}
          className={`fixed inset-0 z-50 transition-all duration-300 ${
            isOpen 
              ? 'opacity-100 pointer-events-auto' 
              : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeMenu();
            }
          }}
        >
          {/* Menu Panel - always rendered but controlled by parent visibility */}
          <div
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl flex flex-col transform transition-transform duration-300"
            style={{
              transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
              willChange: 'transform'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info */}
            <div className="flex flex-col items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Avatar className="h-16 w-16 mb-2">
                <AvatarImage src={profilePicture || currentUser?.profilePicture || "/placeholder-avatar.svg"} />
                <AvatarFallback>
                  {currentUser?.firstName?.[0] || ''}{currentUser?.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  {currentUser?.firstName || ''} {currentUser?.lastName || ''}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser?.email || ''}
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-1 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <BusinessBrand size="xl" className="text-gray-900 dark:text-gray-100 justify-center ml-2" showName={false} />
              <button
                onClick={closeMenu}
                className="flex items-center justify-center w-10 h-10 bg-transparent border-none rounded-md cursor-pointer p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close mobile menu"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Scrollable Navigation Container - with complete isolation */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              onScroll={handleScroll}
              style={{
                // Complete scroll isolation
                scrollBehavior: 'auto',
                WebkitOverflowScrolling: 'touch',
                // Prevent any external interference
                position: 'relative',
                height: '100%',
                width: '100%',
                // Force isolation
                isolation: 'isolate',
                contain: 'layout style paint',
                // Prevent any global CSS interference
                maxWidth: 'none',
                minWidth: 'auto',
                boxSizing: 'border-box'
              }}
            >
              <div className="p-4 space-y-1">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`w-full flex items-center px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors text-left ${
                        isActive 
                          ? "bg-primary text-primary-foreground border-l-4 border-l-primary shadow-sm" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-4 border-l-transparent"
                      }`}
                      style={{
                        color: isActive ? 'hsl(0 0% 100%)' : 'hsl(0 0% 0%)'
                      }}
                    >
                      <IconComponent 
                        className="w-4 h-4 mr-3 flex-shrink-0" 
                        style={{ color: isActive ? 'hsl(0 0% 100%)' : 'hsl(330 81% 60%)' }}
                      />
                      <span 
                        className="truncate flex-1" 
                        style={{ color: isActive ? 'hsl(0 0% 100%)' : 'hsl(0 0% 0%)' }}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full ml-2 flex-shrink-0"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="flex items-center w-full px-3 py-2.5 border border-red-500 bg-transparent text-red-600 dark:text-red-400 text-sm font-medium rounded-lg cursor-pointer transition-colors hover:border-2 hover:border-red-600 hover:text-red-700 focus:border-2 focus:border-red-600 focus:text-red-700"
                style={{ color: 'hsl(0 84% 60%)', background: 'transparent' }}
              >
                <LogOut className="w-4 h-4 mr-3" style={{ color: 'hsl(0 84% 60%)' }} />
                <span style={{ color: 'hsl(0 84% 60%)' }}>Sign Out</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SimpleMobileMenu;