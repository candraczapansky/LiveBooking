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

// Normalize any known misspellings at render time
const normalizeLabel = (label: string) => {
  if (!label) return label;
  return label.replace(/\bisights\b/gi, 'insights');
};

// Capitalize words for display without affecting logic checks
const formatDisplayLabel = (label: string) => {
  const normalized = normalizeLabel(label || "");
  return normalized.replace(/\b([a-z])(\w*)/g, (_: any, first: string, rest: string) => first.toUpperCase() + rest);
};

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

const SidebarItem = ({ icon, label, href, isActive, isOpen: _isOpen, onClick }: SidebarItemProps) => {
  const [, navigate] = useLocation();
  if (href === '/booking') {
    return (
      <a 
        href={href}
        className={`
        flex items-center px-4 py-3 text-sm font-medium rounded-lg
        transition-all duration-200
        ${isActive
          ? 'border-2 border-primary text-primary bg-transparent'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }
      `}
        onClick={(e) => {
          // Prefer SPA navigation; fallback to hard reload if it doesn't take effect
          e.preventDefault();
          try {
            navigate(href);
          } finally {
            setTimeout(() => {
              if (window.location.pathname !== href) {
                window.location.replace(href);
              }
            }, 100);
          }
        }}
      >
        <span className={`
        flex-shrink-0 transition-transform duration-200
        text-primary
      `}>
          {icon}
        </span>
        <span className="ml-3">{formatDisplayLabel(label)}</span>
      </a>
    );
  }

  return (
    <a 
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick();
        // Use client-side navigation to avoid full page reloads and 404s behind proxies
        navigate(href);
      }}
      className={`
        flex items-center px-4 py-3 text-sm font-medium rounded-lg
        transition-all duration-200
        ${isActive
          ? 'border-2 border-primary text-primary bg-transparent'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }
      `}
    >
      <span className={`
        flex-shrink-0 transition-transform duration-200
        text-primary
      `}>
        {icon}
      </span>
      <span className="ml-3">{formatDisplayLabel(label)}</span>
    </a>
  );
};

export function Sidebar({ isOpen, isMobile: _isMobile }: SidebarProps) {
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
  const isInClientsSection = location === '/clients' || location === '/forms' || location === '/note-templates' || location === '/memberships' || location === '/booking-test';
  const [isClientsExpanded, setIsClientsExpanded] = useState<boolean>(isInClientsSection);
  const isInServicesSection = location === '/services' || location === '/devices' || location === '/rooms' || location === '/classes';
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
    { icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} />, label: "Dashboard", href: "/dashboard" },
    { icon: <Calendar className="w-5 h-5" strokeWidth={1.75} />, label: "Appointments", href: "/appointments" },
    { icon: <Users className="w-5 h-5" strokeWidth={1.75} />, label: "clients", href: "#" },
    { icon: <UserCircle className="w-5 h-5" strokeWidth={1.75} />, label: "Staff", href: "/staff" },
    { icon: <Scissors className="w-5 h-5" strokeWidth={1.75} />, label: "services", href: "#" },
    { icon: <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />, label: "Retail", href: "#" },
    { icon: <BarChart3 className="w-5 h-5" strokeWidth={1.75} />, label: "insights", href: "#" },
    { icon: <Building2 className="w-5 h-5" strokeWidth={1.75} />, label: "business", href: "#" },
    { icon: <Mail className="w-5 h-5" strokeWidth={1.75} />, label: "SMS & Email", href: "#" },
    { icon: <Phone className="w-5 h-5" strokeWidth={1.75} />, label: "Phone", href: "/phone" },
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
        overflow-x-hidden
      `}>
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {menuItems.map((originalItem) => {
              const item = { ...originalItem, label: normalizeLabel(originalItem.label) };
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
                          ? 'border-2 border-primary text-primary bg-transparent'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        text-primary
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isStaffExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isStaffExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<UserCircle className="w-5 h-5" strokeWidth={1.75} />}
                          label="Staff"
                          href="/staff"
                          isActive={location === "/staff"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<CalendarDays className="w-5 h-5" strokeWidth={1.75} />}
                            label="Schedule"
                            href="/schedule"
                            isActive={location === "/schedule"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<DollarSign className="w-5 h-5" strokeWidth={1.75} />}
                            label="Time Clock"
                            href="/time-clock"
                            isActive={location === "/time-clock"}
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
                          ? 'border-2 border-primary text-primary bg-transparent'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        text-primary
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isClientsExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isClientsExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<Users className="w-5 h-5" strokeWidth={1.75} />}
                          label="Client Profiles"
                          href="/clients"
                          isActive={location === "/clients"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<FileText className="w-5 h-5" strokeWidth={1.75} />}
                            label="Forms"
                            href="/forms"
                            isActive={location === "/forms"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<StickyNote className="w-5 h-5" strokeWidth={1.75} />}
                            label="Documents"
                            href="/documents"
                            isActive={location === "/documents"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<StickyNote className="w-5 h-5" strokeWidth={1.75} />}
                            label="Note Templates"
                            href="/note-templates"
                            isActive={location === "/note-templates"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Calendar className="w-5 h-5" strokeWidth={1.75} />}
                            label="Client Booking"
                            href="/booking-test"
                            isActive={location === "/booking-test"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Building2 className="w-5 h-5" strokeWidth={1.75} />}
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
                          ? 'border-2 border-primary text-primary bg-transparent'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        text-primary
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isCommsExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isCommsExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<Zap className="w-5 h-5" strokeWidth={1.75} />}
                          label="Automations"
                          href="/automations"
                          isActive={location === "/automations"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Megaphone className="w-5 h-5" strokeWidth={1.75} />}
                            label="Marketing"
                            href="/marketing"
                            isActive={location === "/marketing"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Bot className="w-5 h-5" strokeWidth={1.75} />}
                            label="AI Messaging"
                            href="/ai-messaging"
                            isActive={location === "/ai-messaging"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Mail className="w-5 h-5" strokeWidth={1.75} />}
                            label="SMS Inbox"
                            href="/sms-inbox"
                            isActive={location === "/sms-inbox"}
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
                          ? 'border-2 border-primary text-primary bg-transparent'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        text-primary
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isRetailExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isRetailExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<CreditCard className="w-5 h-5" strokeWidth={1.75} />}
                          label="POS"
                          href="/pos"
                          isActive={location === "/pos"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Gift className="w-5 h-5" strokeWidth={1.75} />}
                            label="Gift Certificates"
                            href="/gift-certificates"
                            isActive={location === "/gift-certificates"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Package className="w-5 h-5" strokeWidth={1.75} />}
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
                          ? 'border-2 border-primary text-primary bg-transparent'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        text-primary
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isServicesExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isServicesExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<Scissors className="w-5 h-5" strokeWidth={1.75} />}
                          label="Services"
                          href="/services"
                          isActive={location === "/services"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<CalendarDays className="w-5 h-5" strokeWidth={1.75} />}
                            label="Classes"
                            href="/classes"
                            isActive={location === "/classes"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Monitor className="w-5 h-5" strokeWidth={1.75} />}
                            label="Devices"
                            href="/devices"
                            isActive={location === "/devices"}
                            isOpen={isOpen}
                            onClick={handleItemClick}
                          />
                        </div>
                        <div className="mt-1">
                          <SidebarItem
                            icon={<MapPin className="w-5 h-5" strokeWidth={1.75} />}
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
              if (item.label === 'insights') {
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
                          ? 'border-2 border-primary text-primary bg-transparent'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className={`
                        flex-shrink-0 transition-transform duration-200
                        text-primary
                      `}>
                        {item.icon}
                      </span>
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isInsightsExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isInsightsExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<BarChart3 className="w-5 h-5" strokeWidth={1.75} />}
                          label="Reports"
                          href="/reports"
                          isActive={location === "/reports"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<DollarSign className="w-5 h-5" strokeWidth={1.75} />}
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
                      <span className="ml-3">{formatDisplayLabel(item.label)}</span>
                      <span className="ml-auto text-gray-500 dark:text-gray-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isBusinessExpanded ? 'rotate-180' : 'rotate-0'}`}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    {isBusinessExpanded && (
                      <div className="ml-6 mt-1">
                        <SidebarItem
                          icon={<MapPin className="w-5 h-5" strokeWidth={1.75} />}
                          label="Locations"
                          href="/locations"
                          isActive={location === "/locations"}
                          isOpen={isOpen}
                          onClick={handleItemClick}
                        />
                        <div className="mt-1">
                          <SidebarItem
                            icon={<Settings className="w-5 h-5" strokeWidth={1.75} />}
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
                              icon={<Shield className="w-5 h-5" strokeWidth={1.75} />}
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