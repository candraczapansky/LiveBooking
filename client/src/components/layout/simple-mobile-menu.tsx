import { useState, useContext, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Menu, LayoutDashboard, Calendar, CalendarDays, Users, UserCircle, Scissors, Package, DollarSign, MapPin, Monitor, CreditCard, BarChart3, Megaphone, Zap, Settings, LogOut, Gift, Phone, FileText, Bot } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BusinessBrand } from "@/components/BusinessBrand";


const SimpleMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [location] = useLocation();
  const { logout } = useContext(AuthContext);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  // Use context user or fallback to localStorage user
  const user = useContext(AuthContext).user;
  const currentUser = user || localUser;

  useEffect(() => {
    // Prioritize database profile picture from user context
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
    
    // Listen for user data updates (includes profile picture updates)
    const handleUserDataUpdate = (event: CustomEvent) => {
      console.log('Mobile menu received user data update:', event.detail);
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
    
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsOpen(prev => !prev);
    
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating]);

  const closeMenu = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsOpen(false);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating]);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);



  return (
    <>
      {/* Menu Button */}
      <button 
        onClick={toggleMenu}
        disabled={isAnimating}
        className="flex items-center justify-center w-12 h-12 bg-transparent border-none rounded-lg cursor-pointer p-0 touch-manipulation tap-highlight-transparent disabled:opacity-50"
        style={{
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation"
        }}
        aria-label="Toggle mobile menu"
      >
        <Menu className="w-12 h-12 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={closeMenu}
          style={{ touchAction: "none" }}
        >
          {/* Menu Panel */}
          <div
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl flex flex-col transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              touchAction: "auto",
              maxHeight: "100vh",
              minHeight: "100vh"
            }}
          >
            {/* User Info */}
            <div className="flex flex-col items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700">
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
            <div className="flex items-center justify-between p-1 border-b border-gray-200 dark:border-gray-700">
              <BusinessBrand size="xl" className="text-gray-900 dark:text-gray-100 justify-center ml-2" showName={false} />
              <button
                onClick={closeMenu}
                disabled={isAnimating}
                className="flex items-center justify-center w-10 h-10 bg-transparent border-none rounded-md cursor-pointer p-0 touch-manipulation tap-highlight-transparent disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation"
                }}
                aria-label="Close mobile menu"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Navigation */}
            <div 
              className="flex-1 p-4 overflow-y-auto overscroll-contain"
              style={{
                minHeight: 0,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "thin"
              }}
            >
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center px-3 py-2.5 mb-1 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      style={{
                        color: isActive ? 'hsl(0 0% 100%)' : 'hsl(0 0% 0%)'
                      }}
                      onClick={() => closeMenu()}
                    >
                      <IconComponent 
                        className="w-4 h-4 mr-3 flex-shrink-0" 
                        style={{ color: isActive ? 'hsl(0 0% 100%)' : 'hsl(330 81% 60%)' }}
                      />
                      <span 
                        className="truncate" 
                        style={{ color: isActive ? 'hsl(0 0% 100%)' : 'hsl(0 0% 0%)' }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {/* Add some bottom padding to ensure last item is accessible */}
              <div className="h-4"></div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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