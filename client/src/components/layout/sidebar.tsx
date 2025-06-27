import { useContext, useEffect, useState } from "react";
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
  DollarSign,
  Zap,
  CalendarDays,
  Gift
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
    <Link href={href} className={`sidebar-item ${isActive ? 'active' : ''}`} style={{ color: 'hsl(0 0% 0%)' }}>
      <span className="w-5 h-5 mr-3 text-primary" style={{ color: 'hsl(330 81% 60%)' }}>{icon}</span>
      <span style={{ color: 'hsl(0 0% 0%)' }}>{label}</span>
    </Link>
  );
};

const Sidebar = () => {
  const { isOpen, isMobile, closeSidebar, toggleSidebar } = useSidebar();
  const [location, setLocation] = useLocation();
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {

  }, [isOpen, isMobile]);

  // Don't render original sidebar on mobile - SimpleMobileMenu handles mobile navigation
  if (isMobile) {
    return null;
  }

  // For both mobile and desktop, show/hide based on isOpen state
  const sidebarClass = `sidebar fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ${
    isOpen ? "translate-x-0" : "-translate-x-full"
  }`;

  const navigationItems = [
    { icon: <LayoutDashboard />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar />, label: "Appointments", href: "/appointments" },
    { icon: <CalendarDays />, label: "Staff Schedule", href: "/staff-schedule" },
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
    { icon: <Settings />, label: "Settings", href: "/settings" },
  ];

  console.log('Sidebar DOM element about to render:', { isOpen, isMobile });

  return (
    <div 
      className={sidebarClass}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-3 h-8 w-8"
                onClick={toggleSidebar}
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <h1 className="text-xl font-bold text-primary">BeautyBook</h1>
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
              />
            ))}
          </div>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="flex items-center text-sm font-medium text-destructive w-full justify-center text-center min-h-[48px] px-4"
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
  return <Sidebar />;
};

export default Sidebar;
