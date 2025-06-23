import { useContext, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/App";
import { useSidebar } from "@/contexts/SidebarContext";
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
    <Link href={href} className={`sidebar-item ${isActive ? 'active' : ''}`}>
      <span className="w-5 h-5 mr-3 text-primary">{icon}</span>
      {label}
    </Link>
  );
};

const Sidebar = () => {
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
  const [location, setLocation] = useLocation();
  const { user, logout } = useContext(AuthContext);

  const sidebarClass = `sidebar fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background shadow-lg transform transition-transform ${
    isOpen ? "translate-x-0" : "-translate-x-full"
  } ${isMobile ? "lg:relative lg:translate-x-0" : ""}`;

  const navigationItems = [
    { icon: <LayoutDashboard />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar />, label: "Appointments", href: "/appointments" },
    { icon: <Users />, label: "Clients", href: "/clients" },
    { icon: <UserCircle />, label: "Staff", href: "/staff" },
    { icon: <Scissors />, label: "Services", href: "/services" },
    { icon: <Package />, label: "Products", href: "/products" },
    { icon: <DollarSign />, label: "Point of Sale", href: "/pos" },
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
            onClick={() => {
              console.log("Sign out button clicked");
              console.log("Logout function:", logout);
              console.log("Logout function type:", typeof logout);
              if (logout) {
                logout();
              } else {
                console.error("Logout function is not available");
              }
            }}
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(!isMobile);

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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
