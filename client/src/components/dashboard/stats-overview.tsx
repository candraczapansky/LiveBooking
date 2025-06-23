import { Calendar, DollarSign, UserPlus, CreditCard } from "lucide-react";
import StatsCard from "@/components/ui/stats-card";
import { formatPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const StatsOverview = () => {
  // Fetch real appointment data
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
  });

  const { data: services } = useQuery({
    queryKey: ['/api/services'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Calculate today's metrics from real data
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayAppointments = appointments?.filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= todayStart && aptDate < todayEnd;
  }).length || 0;

  // Calculate today's revenue from paid appointments
  const paidAppointments = appointments?.filter((apt: any) => apt.paymentStatus === 'paid') || [];
  const todayRevenue = paidAppointments.filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= todayStart && aptDate < todayEnd;
  }).reduce((sum: number, apt: any) => {
    const service = services?.find((s: any) => s.id === apt.serviceId);
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
        iconBgColor="bg-primary/10"
        title="Today's Appointments"
        value={todayAppointments}
        linkText="View all"
        linkHref="/appointments"
      />
      
      <StatsCard 
        icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />}
        iconBgColor="bg-secondary/10"
        title="Revenue Today"
        value={formatPrice(todayRevenue)}
        linkText="View report"
        linkHref="/reports"
      />
      
      <StatsCard 
        icon={<UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />}
        iconBgColor="bg-accent/10"
        title="New Clients (Month)"
        value={newClients}
        linkText="View clients"
        linkHref="/clients"
      />
      
      <StatsCard 
        icon={<CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />}
        iconBgColor="bg-pink-100"
        title="Active Memberships"
        value={activeMemberships}
        linkText="Manage memberships"
        linkHref="/memberships"
      />
    </div>
  );
};

export default StatsOverview;
