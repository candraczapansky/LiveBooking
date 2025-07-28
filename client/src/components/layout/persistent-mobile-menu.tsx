import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Menu, LayoutDashboard, Calendar, CalendarDays, Users, UserCircle, Scissors, Package, DollarSign, MapPin, Monitor, CreditCard, BarChart3, Megaphone, Zap, Settings, LogOut, Gift, Phone, FileText, Bot, StickyNote } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BusinessBrand } from "@/components/BusinessBrand";

const PersistentMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { logout } = useContext(AuthContext);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);
  const isNavigatingRef = useRef<boolean>(false);
  
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
    { icon: StickyNote, label: "Note Templates", href: "/note-templates" },
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

  // Don't close menu on navigation - keep it open
  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    // Don't close if we're navigating
    if (isNavigatingRef.current) {
      return;
    }
    // Only close if clicking on the backdrop, not on menu content
    if (e.target === e.currentTarget) {
      closeMenu();
    }
  }, [closeMenu]);

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      savedScrollPosition.current = scrollTop;
      localStorage.setItem('persistentMenuScroll', scrollTop.toString());
    }
  }, []);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (scrollRef.current) {
      const position = savedScrollPosition.current || parseInt(localStorage.getItem('persistentMenuScroll') || '0', 10);
      if (position > 0) {
        scrollRef.current.scrollTop = position;
        // Also update the ref to ensure consistency
        savedScrollPosition.current = position;
      }
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      savedScrollPosition.current = scrollTop;
      localStorage.setItem('persistentMenuScroll', scrollTop.toString());
    }
  }, []);

  // Restore scroll position when menu opens or location changes
  useEffect(() => {
    if (isOpen) {
      // Use a more robust approach to restore scroll position
      const restoreWithDelay = (delay: number) => {
        setTimeout(() => {
          if (scrollRef.current) {
            const position = savedScrollPosition.current || parseInt(localStorage.getItem('persistentMenuScroll') || '0', 10);
            if (position > 0) {
              scrollRef.current.scrollTop = position;
              // Also update the ref to ensure consistency
              savedScrollPosition.current = position;
            }
          }
        }, delay);
      };

      // Try multiple timing strategies to ensure restoration
      restoreScrollPosition();
      requestAnimationFrame(restoreScrollPosition);
      restoreWithDelay(10);
      restoreWithDelay(50);
      restoreWithDelay(100);
      restoreWithDelay(200);
      restoreWithDelay(500);
    }
  }, [isOpen, location, restoreScrollPosition]);

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    // Save scroll position before navigation
    saveScrollPosition();
    // Set navigating flag to prevent menu from closing
    isNavigatingRef.current = true;
    // Let the navigation happen naturally
    // The menu will stay open and scroll position will be restored
    e.stopPropagation();
    
    // Reset navigating flag after a longer delay to ensure navigation completes
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
  }, [saveScrollPosition]);

  return (
    <>
      {/* Menu Button */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <button 
          onClick={toggleMenu}
          className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-shadow"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Menu Overlay - Always rendered but controlled by visibility */}
      {createPortal(
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={handleMenuClick}
        >
          {/* Menu Panel */}
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
                onClick={() => {
                  if (!isNavigatingRef.current) {
                    closeMenu();
                  }
                }}
                className="flex items-center justify-center w-10 h-10 bg-transparent border-none rounded-md cursor-pointer p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close mobile menu"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Navigation List - with persistent scroll */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              onScroll={handleScroll}
              style={{
                scrollBehavior: 'auto',
                WebkitOverflowScrolling: 'touch',
                position: 'relative',
                height: '100%',
                width: '100%',
                isolation: 'isolate',
                contain: 'layout style paint'
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
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

export default PersistentMobileMenu; 