import { Calendar, DollarSign, UserPlus } from "lucide-react";
import StatsCard from "@/components/ui/stats-card";
import { formatPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// Custom Membership Icon Component
const MembershipIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const StatsOverview = () => {
  // Fetch real appointment data
  const { data: appointments = [] as any[], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ['/api/services'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Calculate today's metrics from real data
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayAppointments = (appointments as any[])?.filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= todayStart && aptDate < todayEnd;
  }).length || 0;

  // Calculate today's revenue from paid appointments
  const paidAppointments = (appointments as any[])?.filter((apt: any) => apt.paymentStatus === 'paid') || [];
  const todayRevenue = paidAppointments.filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= todayStart && aptDate < todayEnd;
  }).reduce((sum: number, apt: any) => {
    const service = (services as any[])?.find((s: any) => s.id === apt.serviceId);
    return sum + (service?.price || 0);
  }, 0);

  // Calculate new clients this month from paid appointments
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthPaidAppointments = paidAppointments.filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate.getMonth() === thisMonth && aptDate.getFullYear() === thisYear;
  });
  const newClients = new Set(thisMonthPaidAppointments.map((apt: any) => apt.clientId)).size;

  // Active memberships placeholder (would need actual membership data)
  const activeMemberships = 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6 mb-6">
      <StatsCard 
        icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
        title="Today's Appointments"
        value={todayAppointments}
        linkText="View all"
        linkHref="/appointments"
      />
      
      <StatsCard 
        icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />}
        title="Revenue Today"
        value={formatPrice(todayRevenue)}
        linkText="View report"
        linkHref="/reports"
      />
      
      <StatsCard 
        icon={<UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />}
        title="New Clients (Month)"
        value={newClients}
        linkText="View clients"
        linkHref="/clients"
      />
      
      <StatsCard 
        icon={<MembershipIcon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />}
        title="Active Memberships"
        value={activeMemberships}
        linkText="Manage memberships"
        linkHref="/memberships"
      />
    </div>
  );
};

export default StatsOverview;
