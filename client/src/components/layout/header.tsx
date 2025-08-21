import { useContext } from "react";
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
import LocationSelector from "@/components/location/location-selector";
import { useSidebar } from "@/contexts/SidebarContext";

export const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-[60] sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center min-w-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              <Menu className="h-6 w-6" strokeWidth={2} data-hamburger="true" />
            </button>
            <div className="lg:hidden ml-3 truncate">
              <Link href="/dashboard" className="truncate hover:opacity-80 transition-opacity cursor-pointer">
                <BusinessBrand size="md" className="text-primary" showName={false} />
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-2">
              <LocationSelector variant="compact" showLabel={false} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg min-w-0">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                      <AvatarImage 
                        src={user?.profilePicture || "/placeholder-avatar.svg"} 
                        alt="User profile"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(user?.firstName, user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getFullName(user?.firstName, user?.lastName)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getFullName(user?.firstName, user?.lastName)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/settings" 
                      className="flex items-center px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4 text-primary" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Profile & Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-600 dark:text-red-400">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;