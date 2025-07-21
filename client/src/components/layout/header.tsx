import { useContext, useState, useEffect } from "react";
import { Settings, User, LogOut, ChevronDown, Menu } from "lucide-react";
import { Link } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { BusinessBrand } from "@/components/BusinessBrand";
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

import { useSidebar } from "@/contexts/SidebarContext";


const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const { toggleSidebar } = useSidebar();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  
  // Use context user or fallback to localStorage user
  const currentUser = user || localUser;

  useEffect(() => {
    // Prioritize database profile picture from user context
    if (user && user.profilePicture) {
      setProfilePicture(user.profilePicture);
      // Also sync to localStorage as backup
      localStorage.setItem('profilePicture', user.profilePicture);
    } else {
      // Fallback to localStorage if no database profile picture
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
          console.error('Error parsing stored user data:', e);
        }
      }
    } else {
      setLocalUser(user);
    }

    // Listen for user data updates (includes profile picture updates)
    const handleUserDataUpdate = (event: CustomEvent) => {
      console.log('Header received user data update:', event.detail);
      setLocalUser(event.detail);
      // Update profile picture if included in the event
      if (event.detail && event.detail.profilePicture) {
        setProfilePicture(event.detail.profilePicture);
        localStorage.setItem('profilePicture', event.detail.profilePicture);
      }
    };

    // Listen for storage changes from other tabs
    const handleStorageChange = () => {
      const updatedPicture = localStorage.getItem('profilePicture');
      setProfilePicture(updatedPicture);
      
      // Also update user data from localStorage
      const updatedUser = localStorage.getItem('user');
      if (updatedUser) {
        try {
          const userData = JSON.parse(updatedUser);
          setLocalUser(userData);
        } catch (e) {
          console.error('Error parsing updated user data:', e);
        }
      }
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 sticky top-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center min-w-0">
            <div className="lg:hidden ml-2 sm:ml-3 truncate">
              <Link href="/dashboard" className="truncate hover:opacity-80 transition-opacity cursor-pointer">
                <BusinessBrand size="md" className="text-primary" showName={false} />
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md min-w-0">
                  <span className="hidden sm:inline-block text-sm font-medium truncate max-w-24 lg:max-w-none" style={{ color: 'hsl(0 0% 0%)' }}>
                    {getFullName(currentUser?.firstName, currentUser?.lastName)}
                  </span>
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage 
                      src={profilePicture || currentUser?.profilePicture || "/placeholder-avatar.svg"} 
                      alt="User profile"
                    />
                    <AvatarFallback>
                      {getInitials(currentUser?.firstName, currentUser?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none" style={{ color: 'hsl(0 0% 0%)' }}>
                      {getFullName(currentUser?.firstName, currentUser?.lastName)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground" style={{ color: 'hsl(0 0% 30%)' }}>
                      {currentUser?.email}
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
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-600 border border-red-500 bg-transparent hover:border-2 hover:border-red-600 hover:text-red-700 focus:border-2 focus:border-red-600 focus:text-red-700 rounded-md transition-colors"
                  style={{ color: 'hsl(0 84% 60%)', background: 'transparent' }}
                >
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
