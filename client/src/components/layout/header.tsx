import { useContext, useState, useEffect } from "react";
import { Settings, User, LogOut, ChevronDown, Menu } from "lucide-react";
import { Link } from "wouter";
import { AuthContext } from "@/App";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, getFullName } from "@/lib/utils";
import SimpleMobileMenu from "./simple-mobile-menu";
import { useSidebar } from "@/contexts/SidebarContext";


const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const { toggleSidebar } = useSidebar();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    const savedProfilePicture = localStorage.getItem('profilePicture');
    setProfilePicture(savedProfilePicture);

    // Listen for profile picture changes via custom event
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      setProfilePicture(event.detail);
    };

    // Listen for storage changes from other tabs
    const handleStorageChange = () => {
      const updatedPicture = localStorage.getItem('profilePicture');
      setProfilePicture(updatedPicture);
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 sticky top-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Hamburger Menu Button for Desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="md:flex hidden h-8 w-8 mr-4"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
          <div className="flex items-center min-w-0">
            <div className="lg:hidden">
              <SimpleMobileMenu />
            </div>
            <div className="lg:hidden ml-2 sm:ml-3 truncate">
              <h1 className="text-lg sm:text-xl font-bold text-primary truncate">BeautyBook</h1>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md min-w-0">
                  <span className="hidden sm:inline-block text-sm font-medium truncate max-w-24 lg:max-w-none" style={{ color: 'hsl(0 0% 0%)' }}>
                    {getFullName(user?.firstName, user?.lastName)}
                  </span>
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage 
                      src={profilePicture || "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120"} 
                      alt="User profile"
                    />
                    <AvatarFallback>
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none" style={{ color: 'hsl(0 0% 0%)' }}>
                      {getFullName(user?.firstName, user?.lastName)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground" style={{ color: 'hsl(0 0% 30%)' }}>
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center w-full cursor-pointer" style={{ color: 'hsl(0 0% 0%)' }}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span style={{ color: 'hsl(0 0% 0%)' }}>Profile & Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span style={{ color: 'hsl(0 84% 60%)' }}>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
