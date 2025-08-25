import { useState, useContext, useEffect, useCallback, useRef } from "react";

import { X, Menu, LayoutDashboard, Calendar, CalendarDays, Users, UserCircle, Scissors, Package, DollarSign, MapPin, Monitor, CreditCard, BarChart3, Megaphone, Zap, Settings, LogOut, Gift, Phone, FileText, Bot, StickyNote, Shield, ChevronDown, ShoppingBag, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BusinessBrand } from "@/components/BusinessBrand";


const PersistentMobileMenu = () => {
  const [location] = useLocation();
  const { logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);
  
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

  const isRetailRoute = ["/pos", "/products", "/gift-certificates"].includes(location);
  const [isRetailOpen, setIsRetailOpen] = useState<boolean>(isRetailRoute);

  // Insights group (no persisted open state needed here)

  const baseNavigationItems: any[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Calendar, label: "Client Appointments", href: "/appointments" },
    { icon: CalendarDays, label: "Staff Working Hours", href: "/schedule" },
    { icon: Users, label: "clients", href: "#", children: [
      { icon: Users, label: "Client Profiles", href: "/clients" },
      { icon: FileText, label: "Forms", href: "/forms" },
      { icon: StickyNote, label: "Note Templates", href: "/note-templates" },
      { icon: CreditCard, label: "Memberships", href: "/memberships" },
    ]},
    { icon: UserCircle, label: "Staff", href: "/staff" },
    { icon: Scissors, label: "Services", href: "/services" },
    {
      icon: ShoppingBag,
      label: "Retail",
      href: "#",
      children: [
        { icon: DollarSign, label: "POS", href: "/pos" },
        { icon: Gift, label: "Gift Certificates", href: "/gift-certificates" },
        { icon: Package, label: "Products", href: "/products" },
      ],
    },
    { icon: MapPin, label: "Rooms", href: "/rooms" },
    { icon: Monitor, label: "Devices", href: "/devices" },
    
    { icon: BarChart3, label: "insights", href: "#", children: [
      { icon: BarChart3, label: "Reports", href: "/reports" },
      { icon: DollarSign, label: "Payroll", href: "/payroll" },
    ]},
    { icon: Building2, label: "business", href: "#", children: [
      { icon: MapPin, label: "Locations", href: "/locations" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ]},
    { icon: Megaphone, label: "Marketing", href: "/marketing" },
    { icon: Zap, label: "Automations", href: "/automations" },
    { icon: FileText, label: "Forms", href: "/forms" },
    { icon: Phone, label: "Phone", href: "/phone" },
    { icon: Bot, label: "AI Messaging", href: "/ai-messaging" },
    { icon: StickyNote, label: "Note Templates", href: "/note-templates" },
    
  ];

  // Add admin-only menu items
  const navigationItems = [...baseNavigationItems];
  const normalizeLabel = (label: string) => {
    if (!label) return label;
    return label.replace(/\bisights\b/gi, 'insights');
  };
  const formatDisplayLabel = (label: string) => {
    const normalized = normalizeLabel(label || "");
    return normalized.replace(/\b([a-z])(\w*)/g, (_: any, first: string, rest: string) => first.toUpperCase() + rest);
  };
  if (currentUser?.role === 'admin') {
    navigationItems.splice(-1, 0, { icon: Shield, label: "Permissions", href: "/permissions" });
  }

  const toggleMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }, []);

  // Handle backdrop click to close menu


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

  const handleLinkClick = useCallback(() => {
    saveScrollPosition();
    setIsOpen(false);
  }, [saveScrollPosition]);

  return (
    <>
      {/* Menu Button */}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <Button 
          onClick={toggleMenu}
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-lg shadow-md hover:shadow-lg"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-6 h-6" strokeWidth={2} />
        </Button>
      </div>

      {/* Menu Overlay */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-300 lg:hidden ${
          isOpen ? 'visible bg-black/50 backdrop-blur-[4px] pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      >
        {/* Menu Panel */}
        <div
          className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
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
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-10 h-10 bg-transparent border-none rounded-md cursor-pointer p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Close mobile menu"
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                </button>
              </div>

              {/* Navigation List - with persistent scroll */}
              <div
                ref={scrollRef}
                className="mobile-menu-scroll-container flex-1 overflow-y-auto overflow-x-hidden"
                onScroll={handleScroll}
                style={{
                  scrollBehavior: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  position: 'relative',
                  height: 'calc(100vh - 180px)', // Account for header and footer
                  width: '100%',
                  isolation: 'isolate',
                  contain: 'layout style paint',
                  touchAction: 'pan-y',
                  overscrollBehavior: 'contain',
                  minHeight: '0'
                }}
              >
                <div className="p-4 space-y-1">
                  {navigationItems.map((item: any) => {
                    const IconComponent = item.icon;
                    const isActive = location === item.href || (item.href === "/dashboard" && location === "/");

                    if (item.children) {
                      const isGroupActive = item.children.some((c: any) => c.href === location);
                      const open = item.label === 'Retail' ? isRetailOpen : false;
                      return (
                        <div key={item.label} className="w-full">
                          <button
                            onClick={() => item.label === 'Retail' ? setIsRetailOpen(prev => !prev) : undefined}
                            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              isGroupActive ? "bg-primary text-primary-foreground border-l-4 border-l-primary shadow-sm" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-4 border-l-transparent"
                            }`}
                          >
                            <IconComponent className="w-5 h-5 mr-3 flex-shrink-0" strokeWidth={1.75} />
                            <span className="truncate flex-1">{formatDisplayLabel(item.label)}</span>
                            <ChevronDown className={`w-5 h-5 ml-2 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`} strokeWidth={1.75} />
                            <ChevronDown className={`w-5 h-5 ml-2 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`} strokeWidth={1.75} />
                          </button>
                          {open && (
                            <div className="pl-8 mt-1 space-y-1">
                              {item.children.map((child: any) => {
                                const ChildIcon = child.icon;
                                const childActive = location === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={handleLinkClick}
                                    className={`w-full flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                      childActive ? "bg-primary text-primary-foreground" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    <ChildIcon className="w-5 h-5 mr-3 flex-shrink-0" strokeWidth={1.75} />
                                    <span className="truncate flex-1">{formatDisplayLabel(child.label)}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

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
                      >
                        <IconComponent 
                          className="w-5 h-5 mr-3 flex-shrink-0" 
                          strokeWidth={1.75}
                        />
                        <span className="truncate flex-1">{formatDisplayLabel(item.label)}</span>
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
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2.5 border border-red-500 bg-transparent text-red-600 dark:text-red-400 text-sm font-medium rounded-lg cursor-pointer transition-colors hover:border-2 hover:border-red-600 hover:text-red-700 focus:border-2 focus:border-red-600 focus:text-red-700"
                >
                  <LogOut className="w-5 h-5 mr-3" strokeWidth={1.75} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

    </>
  );
};

export default PersistentMobileMenu; 