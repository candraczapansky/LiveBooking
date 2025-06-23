import { useState } from "react";
import { X, Menu, LayoutDashboard, Calendar, Users, UserCircle, Scissors, Package, DollarSign, MapPin, Monitor, CreditCard, BarChart3, Megaphone, Zap, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import { AuthContext } from "@/App";

const MobileSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { logout } = useContext(AuthContext);

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
    { icon: <Zap />, label: "Automations", href: "/automations" },
    { icon: <Settings />, label: "Settings", href: "/settings" },
  ];

  const toggleSidebar = () => {
    console.log("Mobile menu toggle clicked, current state:", isOpen);
    const newState = !isOpen;
    setIsOpen(newState);
    console.log("Mobile menu new state:", newState);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  console.log("MobileSidebar render - isOpen:", isOpen);

  return (
    <>
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 99999, 
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            width: "100vw",
            height: "100vh",
            display: "block"
          }}
          onClick={closeSidebar}
        >
          {/* Sidebar */}
          <div 
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "256px",
              height: "100vh",
              zIndex: 100000,
              backgroundColor: "white",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "100vh"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full max-h-screen">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold">BeautyBook</h2>
                <Button variant="ghost" size="icon" onClick={closeSidebar}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 overflow-y-auto min-h-0">
                <div className="space-y-2 pb-4">
                  {navigationItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div 
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          location === item.href || (item.href === "/dashboard" && location === "/")
                            ? "bg-primary text-primary-foreground"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={closeSidebar}
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </div>
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t flex-shrink-0">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-destructive"
                  onClick={() => {
                    logout();
                    closeSidebar();
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileSidebar;