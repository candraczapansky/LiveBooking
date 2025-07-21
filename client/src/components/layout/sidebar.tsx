import { useContext, useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { useSidebar } from "@/contexts/SidebarContext";
import { BusinessBrand } from "@/components/BusinessBrand";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCircle, 
  Scissors, 
  Package,
  CreditCard, 
  BarChart3, 
  Megaphone, 
  Settings, 
  LogOut, 
  X, 
  Menu,
  MapPin,
  Monitor,
  DollarSign,
  Zap,
  CalendarDays,
  Gift,
  Phone,
  FileText
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, getFullName } from "@/lib/utils";

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  isCollapsed: boolean;
};

const SidebarItem = ({ icon, label, href, isActive, isCollapsed }: SidebarItemProps) => {
  return (
    <Link 
      href={href} 
      className={`sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`} 
      style={{ color: 'hsl(0 0% 0%)' }}
      title={isCollapsed ? label : undefined}
    >
      <span className={`w-5 h-5 text-primary ${isCollapsed ? 'mx-auto' : 'mr-3'}`} style={{ color: 'hsl(330 81% 60%)' }}>
        {icon}
      </span>
      {!isCollapsed && <span style={{ color: 'hsl(0 0% 0%)' }}>{label}</span>}
    </Link>
  );
};

const Sidebar = () => {
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
  const [location, setLocation] = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [primaryColor, setPrimaryColor] = useState('#d38301');
  const hamburgerRef = useRef<SVGSVGElement>(null);
  const [localUser, setLocalUser] = useState<any>(null);

  // Use context user or fallback to localStorage user
  const currentUser = user || localUser;

  useEffect(() => {
    // Load user from localStorage if context isn't ready
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setLocalUser(userData);
        } catch (e) {
          console.error('Error parsing stored user data:', e);
        }
      }
    } else {
      setLocalUser(user);
    }

    // Listen for user data updates (includes profile picture updates)
    const handleUserDataUpdate = (event: CustomEvent) => {
      setLocalUser(event.detail);
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [user]);

  useEffect(() => {
    // Load user's color preferences
    const loadUserColor = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/${user.id}/color-preferences`);
          if (response.ok) {
            const colorPrefs = await response.json();
            if (colorPrefs && colorPrefs.primaryColor) {
              setPrimaryColor(colorPrefs.primaryColor);
              
              // Force color update via DOM manipulation
              if (hamburgerRef.current) {
                hamburgerRef.current.style.color = colorPrefs.primaryColor;
                hamburgerRef.current.style.fill = colorPrefs.primaryColor;
                hamburgerRef.current.style.setProperty('color', colorPrefs.primaryColor, 'important');
                hamburgerRef.current.style.setProperty('fill', colorPrefs.primaryColor, 'important');
              }
            }
          }
        } catch (error) {
          console.error('Failed to load color preferences:', error);
        }
      }
    };
    
    loadUserColor();
    
    // Listen for color preference updates
    const handleColorUpdate = () => {
      loadUserColor();
    };
    
    window.addEventListener('colorPreferencesUpdated', handleColorUpdate);
    
    return () => {
      window.removeEventListener('colorPreferencesUpdated', handleColorUpdate);
    };
  }, [user?.id]);

  // Also update color when primaryColor state changes
  useEffect(() => {
    if (hamburgerRef.current && primaryColor) {
      hamburgerRef.current.style.color = primaryColor;
      hamburgerRef.current.style.fill = primaryColor;
      hamburgerRef.current.style.setProperty('color', primaryColor, 'important');
      hamburgerRef.current.style.setProperty('fill', primaryColor, 'important');
    }
  }, [primaryColor]);

  // Don't render original sidebar on mobile - SimpleMobileMenu handles mobile navigation
  if (isMobile) {
    return null;
  }

  // For both mobile and desktop, show collapsed or expanded based on isOpen state
  const sidebarClass = `sidebar fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ${
    isOpen ? "w-64" : "w-16"
  }`;

  const navigationItems = [
    { icon: <LayoutDashboard />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar />, label: "Client Appointments", href: "/appointments" },
    { icon: <CalendarDays />, label: "Staff Working Hours", href: "/staff-schedule" },
    { icon: <Users />, label: "Clients", href: "/clients" },
    { icon: <UserCircle />, label: "Staff", href: "/staff" },
    { icon: <Scissors />, label: "Services", href: "/services" },
    { icon: <Package />, label: "Products", href: "/products" },
    { icon: <DollarSign />, label: "Point of Sale", href: "/pos" },
    { icon: <Gift />, label: "Gift Certificates", href: "/gift-certificates" },
    { icon: <MapPin />, label: "Rooms", href: "/rooms" },
    { icon: <Monitor />, label: "Devices", href: "/devices" },
    { icon: <CreditCard />, label: "Memberships", href: "/memberships" },
    { icon: <BarChart3 />, label: "Reports", href: "/reports" },
    { icon: <Megaphone />, label: "Marketing", href: "/marketing" },
    { icon: <Zap />, label: "Automations", href: "/automations" },
    { icon: <FileText />, label: "Forms", href: "/forms" },
    { icon: <Phone />, label: "Phone", href: "/phone" },
    { icon: <Settings />, label: "Settings", href: "/settings" },
  ];



  return (
    <div 
      className={sidebarClass}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col h-full">
        <div className="p-1 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-10 w-10 ${isOpen ? 'mr-3' : 'mx-auto'}`}
                onClick={toggleSidebar}
              >
                <Menu 
                  ref={hamburgerRef}
                  data-hamburger="true"
                  className="h-10 w-10" 
                  style={{ color: primaryColor }}
                />
              </Button>
              {isOpen && <BusinessBrand size="2xl" className="text-primary justify-center ml-4" showName={true} />}
            </div>
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={closeSidebar} className="md:hidden">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <SidebarItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isActive={location === item.href || (item.href === "/dashboard" && location === "/")}
                isCollapsed={!isOpen}
              />
            ))}
          </div>
        </nav>
        {/* User info and sign out */}
        <div className="p-4 border-t border-sidebar-border">
          {/* User avatar and name */}
          <div className="flex items-center mb-4">
            <Avatar className="h-9 w-9 mr-3">
              <AvatarImage 
                src={currentUser?.profilePicture || "/placeholder-avatar.svg"} 
                alt="User profile"
              />
              <AvatarFallback>
                {getInitials(currentUser?.firstName, currentUser?.lastName) || (currentUser?.username ? currentUser.username[0].toUpperCase() : '?')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-gray-100 text-base truncate">
                {getFullName(currentUser?.firstName, currentUser?.lastName) || currentUser?.username || 'User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentUser?.email || ''}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full mt-4 border border-red-500 bg-transparent text-red-600 dark:text-red-400 text-sm font-medium rounded-lg cursor-pointer transition-colors hover:border-2 hover:border-red-600 hover:text-red-700 focus:border-2 focus:border-red-600 focus:text-red-700"
            style={{ color: 'hsl(0 84% 60%)', background: 'transparent' }}
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-2" style={{ color: 'hsl(0 84% 60%)' }} />
            <span style={{ color: 'hsl(0 84% 60%)' }}>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export const SidebarController = () => {
  return <Sidebar />;
};

export default Sidebar;
