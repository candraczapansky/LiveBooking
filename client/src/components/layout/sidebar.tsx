import { useState, useContext, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/App";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCircle, 
  Scissors, 
  CreditCard, 
  BarChart3, 
  Megaphone, 
  Settings, 
  LogOut, 
  X, 
  Menu,
  MapPin,
  Monitor,
  DollarSign
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, getFullName } from "@/lib/utils";

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
};

const SidebarItem = ({ icon, label, href, isActive }: SidebarItemProps) => {
  return (
    <Link href={href}>
      <a className={`sidebar-item ${isActive ? 'active' : ''}`}>
        <span className="w-5 h-5 mr-3 text-primary">{icon}</span>
        {label}
      </a>
    </Link>
  );
};

type SidebarProps = {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
};

const Sidebar = ({ isMobile, isOpen, onClose, onToggle }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logout } = useContext(AuthContext);

  const sidebarClass = `sidebar fixed inset-y-0 left-0 z-30 w-64 bg-sidebar-background shadow-lg transform transition-transform ${
    isOpen ? "translate-x-0" : "-translate-x-full"
  }`;

  const navigationItems = [
    { icon: <LayoutDashboard />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar />, label: "Appointments", href: "/appointments" },
    { icon: <Users />, label: "Clients", href: "/clients" },
    { icon: <UserCircle />, label: "Staff", href: "/staff" },
    { icon: <Scissors />, label: "Services", href: "/services" },
    { icon: <MapPin />, label: "Rooms", href: "/rooms" },
    { icon: <Monitor />, label: "Devices", href: "/devices" },
    { icon: <CreditCard />, label: "Memberships", href: "/memberships" },
    { icon: <BarChart3 />, label: "Reports", href: "/reports" },
    { icon: <Megaphone />, label: "Marketing", href: "/marketing" },
    { icon: <Settings />, label: "Settings", href: "/settings" },
  ];

  return (
    <div className={sidebarClass}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-3 h-8 w-8"
                onClick={onToggle}
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <h1 className="text-xl font-bold text-primary">BeautyBook</h1>
            </div>
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={onClose} className="md:hidden">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="px-4 py-2 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120" />
              <AvatarFallback>
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{getFullName(user?.firstName, user?.lastName)}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role || 'User'}</p>
            </div>
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
              />
            ))}
          </div>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="flex items-center text-sm font-medium text-destructive w-full justify-start"
            onClick={() => logout()}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export const SidebarController = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Export toggle function and state globally so other components can access it
  useEffect(() => {
    (window as any).toggleSidebar = () => setIsOpen(!isOpen);
    (window as any).sidebarIsOpen = isOpen;
  }, [isOpen]);

  return (
    <>
      <Sidebar
        isMobile={isMobile}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onToggle={() => setIsOpen(!isOpen)}
      />
      {/* Overlay for mobile when sidebar is open */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
