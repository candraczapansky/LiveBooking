import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useSidebar } from '@/contexts/SidebarContext';
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
  ChevronDown,
  Mail,
  ShoppingBag,
  Shield
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, href, isActive, isOpen, onClick }: SidebarItemProps) => {
  return (
    <a 
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick();
        window.location.href = href; // Use window.location for proper page reload
      }}
      className={`
        flex items-center px-4 py-3 text-sm font-medium rounded-lg
        transition-all duration-200
        ${isActive
          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }
      `}
    >
      <span className={`
        flex-shrink-0 transition-transform duration-200
        ${isActive ? 'text-white' : 'text-primary'}
      `}>
        {icon}
      </span>
      <span className="ml-3">{label}</span>
    </a>
  );
};

export function Sidebar({ isOpen, isMobile }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toggleSidebar, closeSidebar } = useSidebar();
  const isInStaffSection = location === '/staff' || location === '/schedule' || location.startsWith('/staff-schedule');
  const [isStaffExpanded, setIsStaffExpanded] = useState<boolean>(isInStaffSection);
  const isInCommunicationsSection = location === '/automations' || location === '/marketing' || location === '/ai-messaging';
  const [isCommsExpanded, setIsCommsExpanded] = useState<boolean>(isInCommunicationsSection);
  const isInRetailSection = location === '/pos' || location === '/products' || location === '/gift-certificates';
  const [isRetailExpanded, setIsRetailExpanded] = useState<boolean>(isInRetailSection);
  const isInInsightsSection = location === '/reports' || location === '/payroll';
  const [isInsightsExpanded, setIsInsightsExpanded] = useState<boolean>(isInInsightsSection);
  const isInBusinessSection = location === '/locations' || location === '/settings' || location === '/permissions';
  const [isBusinessExpanded, setIsBusinessExpanded] = useState<boolean>(isInBusinessSection);
  const isInClientsSection = location === '/clients' || location === '/forms' || location === '/note-templates' || location === '/memberships';
  const [isClientsExpanded, setIsClientsExpanded] = useState<boolean>(isInClientsSection);
  const isInServicesSection = location === '/services' || location === '/devices' || location === '/rooms';
  const [isServicesExpanded, setIsServicesExpanded] = useState<boolean>(isInServicesSection);

  useEffect(() => {
    if (isInStaffSection) {
      setIsStaffExpanded(true);
    }
  }, [location]);
  useEffect(() => {
    if (isInCommunicationsSection) {
      setIsCommsExpanded(true);
    }
  }, [location]);
  useEffect(() => {
    if (isInRetailSection) {
      setIsRetailExpanded(true);
    }
  }, [location]);
  useEffect(() => {
    if (isInInsightsSection) {
      setIsInsightsExpanded(true);
    }
  }, [location]);
  useEffect(() => {
    if (isInBusinessSection) {
      setIsBusinessExpanded(true);
    }
  }, [location]);
  useEffect(() => {
    if (isInClientsSection) {
      setIsClientsExpanded(true);
    }
  }, [location]);
  useEffect(() => {
    if (isInServicesSection) {
      setIsServicesExpanded(true);
    }
  }, [location]);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar size={20} />, label: "Appointments", href: "/appointments" },
    { icon: <Users size={20} />, label: "clients", href: "#" },
    { icon: <UserCircle size={20} fill="none" />, label: "Staff", href: "/staff" },
    { icon: <Scissors size={20} />, label: "services", href: "#" },
    { icon: <ShoppingBag size={20} />, label: "Retail", href: "#" },
    { icon: <BarChart3 size={20} />, label: "isights", href: "#" },
    { icon: <Building2 size={20} />, label: "business", href: "#" },
    
    { icon: <Mail size={20} fill="none" />, label: "SMS & Email", href: "#" },
    { icon: <Phone size={20} />, label: "Phone", href: "/phone" },
    
    
  ];

  // Always render; on mobile it slides in with an overlay

  const handleItemClick = () => {
    if (window.innerWidth < 768) { // Close sidebar on mobile
      closeSidebar();
    }
  };

  return (
    <>
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'}
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      `}>
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {menuItems.map((item) => {
              if (item.label === 'Staff') {
                const isActive = isInStaffSection;
                return (
                  <div key={item.href} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsStaffExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isStaffExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isStaffExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<UserCircle size={18} />}
                          label="Staff"
                          href="/staff"
                          isActive={location === "/staff"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<CalendarDays size={18} />}
                            label="Schedule"
                            href="/schedule"
                            isActive={location === "/schedule"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (item.label === 'clients') {
                const isActive = isInClientsSection;
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsClientsExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isClientsExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isClientsExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<Users size={18} />}
                          label="Client Profiles"
                          href="/clients"
                          isActive={location === "/clients"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<FileText size={18} />}
                            label="Forms"
                            href="/forms"
                            isActive={location === "/forms"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<StickyNote size={18} />}
                            label="Note Templates"
                            href="/note-templates"
                            isActive={location === "/note-templates"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Building2 size={18} />}
                            label="Memberships"
                            href="/memberships"
                            isActive={location === "/memberships"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (item.label === 'SMS & Email') {
                const isActive = isInCommunicationsSection;
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsCommsExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isCommsExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isCommsExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<Zap size={18} />}
                          label="Automations"
                          href="/automations"
                          isActive={location === "/automations"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Megaphone size={18} />}
                            label="Marketing"
                            href="/marketing"
                            isActive={location === "/marketing"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Bot size={18} />}
                            label="AI Messaging"
                            href="/ai-messaging"
                            isActive={location === "/ai-messaging"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (item.label === 'Retail') {
                const isActive = isInRetailSection;
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsRetailExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isRetailExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isRetailExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<CreditCard size={18} />}
                          label="POS"
                          href="/pos"
                          isActive={location === "/pos"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Gift size={18} />}
                            label="Gift Certificates"
                            href="/gift-certificates"
                            isActive={location === "/gift-certificates"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Package size={18} />}
                            label="Products"
                            href="/products"
                            isActive={location === "/products"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (item.label === 'services') {
                const isActive = isInServicesSection;
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsServicesExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isServicesExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isServicesExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<Scissors size={18} />}
                          label="Services"
                          href="/services"
                          isActive={location === "/services"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Monitor size={18} />}
                            label="Devices"
                            href="/devices"
                            isActive={location === "/devices"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<MapPin size={18} />}
                            label="Rooms"
                            href="/rooms"
                            isActive={location === "/rooms"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (item.label === 'isights') {
                const isActive = isInInsightsSection;
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsInsightsExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isInsightsExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isInsightsExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<BarChart3 size={18} />}
                          label="Reports"
                          href="/reports"
                          isActive={location === "/reports"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<DollarSign size={18} />}
                            label="Payroll"
                            href="/payroll"
                            isActive={location === "/payroll"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (item.label === 'business') {
                const isActive = isInBusinessSection;
                return (
                  <div key={item.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setIsBusinessExpanded((prev) => !prev)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? (isOpen ? 'bg-primary text-white' : 'text-primary')
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isActive ? 'text-white' : 'text-primary'}
                     `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.label}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isBusinessExpanded ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </span>
                    </button>

                    {isBusinessExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<MapPin size={18} />}
                          label="Locations"
                          href="/locations"
                          isActive={location === "/locations"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Settings size={18} />}
                            label="Settings"
                            href="/settings"
                            isActive={location === "/settings"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        {user?.role === 'admin' && (
                          <div className="mt-1">
                            <SidebarItem
                              icon={<Shield size={18} />}
                              label="Permissions"
                              href="/permissions"
                              isActive={location === "/permissions"}
                              isOpen={isOpen}
                              onClick={handleItemClick}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.href} className="mb-1">
                  <SidebarItem
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={location === item.href}
                    isOpen={isOpen}
                    onClick={handleItemClick}
                  />
                </div>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${
          isOpen ? 'bg-black/50 pointer-events-auto' : 'bg-transparent pointer-events-none'
        }`}
        onClick={isOpen ? toggleSidebar : undefined}
      />
    </>
  );
}

// Add the SidebarController alias
export { Sidebar as SidebarController };
export default Sidebar;