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
  Menu,
  MapPin,
  Monitor,
  DollarSign,
  Zap,
  CalendarDays,
  Gift,
  Phone,
  FileText,
  Bot,
  StickyNote,
  Building2,
  Shield
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
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800`}>
        <div className="flex-shrink-0">
          {icon}
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-sm font-medium">{label}</span>
        )}
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
  const [location] = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [primaryColor, setPrimaryColor] = useState('#d38301');
  const hamburgerRef = useRef<SVGSVGElement>(null);

  // Load user color preferences
  useEffect(() => {
    const loadColorPreferences = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/${user.id}/color-preferences`);
          if (response.ok) {
            const prefs = await response.json();
            if (prefs.primaryColor) {
              setPrimaryColor(prefs.primaryColor);
            }
          }
        } catch (error) {
          console.error('Failed to load color preferences:', error);
        }
      }
    };
    
    loadColorPreferences();
  }, [user?.id]);

  // Global click handler to close sidebar when clicking outside
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Don't handle if mobile (PersistentMobileMenu handles mobile)
      if (isMobile) return;
      
      // Don't close if clicking on the hamburger button itself
      const target = event.target as Element;
      if (target?.closest('[data-hamburger="true"]')) {
        return;
      }
      
      // Don't close if clicking inside the sidebar
      if (target?.closest('.sidebar')) {
        return;
      }
      
      // Don't close if clicking on the overlay itself (let overlay handle it)
      if (target?.closest('[data-sidebar-overlay="true"]')) {
        return;
      }
      
      // Close sidebar
      closeSidebar();
    };

    if (isOpen && !isMobile) {
      // Use capture phase to ensure we get the click before other handlers
      document.addEventListener('click', handleGlobalClick, true);
      return () => document.removeEventListener('click', handleGlobalClick, true);
    }
  }, [isOpen, isMobile, closeSidebar]);

  // Don't render original sidebar on mobile - SimpleMobileMenu handles mobile navigation
  if (isMobile) {
    return null;
  }

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar size={20} />, label: "Appointments", href: "/appointments" },
    { icon: <CalendarDays size={20} />, label: "Schedule", href: "/schedule" },
    { icon: <Users size={20} />, label: "Clients", href: "/clients" },
    { icon: <UserCircle size={20} />, label: "Staff", href: "/staff" },
    { icon: <Scissors size={20} />, label: "Services", href: "/services" },
    { icon: <Package size={20} />, label: "Products", href: "/products" },
    { icon: <CreditCard size={20} />, label: "POS", href: "/pos" },
    { icon: <DollarSign size={20} />, label: "Payroll", href: "/payroll" },
    { icon: <MapPin size={20} />, label: "Locations", href: "/locations" },
    { icon: <Monitor size={20} />, label: "Devices", href: "/devices" },
    { icon: <BarChart3 size={20} />, label: "Reports", href: "/reports" },
    { icon: <Zap size={20} />, label: "Automations", href: "/automations" },
    { icon: <Megaphone size={20} />, label: "Marketing", href: "/marketing" },
    { icon: <Gift size={20} />, label: "Gift Certificates", href: "/gift-certificates" },
    { icon: <Phone size={20} />, label: "Phone", href: "/phone" },
    { icon: <FileText size={20} />, label: "Forms", href: "/forms" },
    { icon: <StickyNote size={20} />, label: "Note Templates", href: "/note-templates" },
    { icon: <Bot size={20} />, label: "AI Messaging", href: "/ai-messaging" },
    { icon: <Building2 size={20} />, label: "Memberships", href: "/memberships" },
    { icon: <Shield size={20} />, label: "Permissions", href: "/permissions" },
    { icon: <Settings size={20} />, label: "Settings", href: "/settings" },
  ];

  return (
    <>
      {/* Overlay for when sidebar is expanded - Desktop only */}
      {isOpen && !isMobile && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300 hidden lg:block"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
          data-sidebar-overlay="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
          }}
        />
      )}

      {/* Main Sidebar */}
      <div className={`sidebar fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 flex flex-col ${isOpen ? 'w-64' : 'w-16'}`}>
        
        {/* Header Section */}
        <div className={`flex items-center p-4 border-b border-gray-200 dark:border-gray-700 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen && (
            <div className="flex items-center space-x-3">
              <BusinessBrand 
                showLogo={true}
                showName={true}
                size="md"
                className="text-lg font-bold"
              />
            </div>
          )}
          
          {/* Hamburger Menu Button */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
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
            {isOpen && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profilePicture || undefined} />
                  <AvatarFallback className="text-xs">
                    {user ? getInitials(getFullName(user.firstName, user.lastName)) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user ? getFullName(user.firstName, user.lastName) : 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={location === item.href}
              isCollapsed={!isOpen}
            />
          ))}
        </nav>

        {/* Logout Section */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={logout}
            className={`w-full flex items-center ${!isOpen ? 'justify-center' : 'justify-start'} p-3 rounded-lg transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20`}
          >
            <LogOut size={20} />
            {isOpen && <span className="ml-3 text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export const SidebarController = () => {
  return <Sidebar />;
};

export default Sidebar;