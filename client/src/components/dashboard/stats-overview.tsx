import { Calendar, DollarSign, UserPlus, CreditCard } from "lucide-react";
import StatsCard from "@/components/ui/stats-card";
import { formatPrice } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const StatsOverview = () => {
  // In a real app, we would fetch this data from the API
  // For demo purposes, we'll use static data
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: () => {
      return Promise.resolve([
        /* Would be filled with appointment data */
      ]);
    }
  });

  const todayAppointments = 24;
  const revenue = 1284.50;
  const newClients = 18;
  const activeMemberships = 156;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatsCard 
        icon={<Calendar className="h-5 w-5 text-primary" />}
        iconBgColor="bg-primary/10"
        title="Today's Appointments"
        value={todayAppointments}
        linkText="View all"
        linkHref="/appointments"
      />
      
      <StatsCard 
        icon={<DollarSign className="h-5 w-5 text-secondary" />}
        iconBgColor="bg-secondary/10"
        title="Revenue Today"
        value={formatPrice(revenue)}
        linkText="View report"
        linkHref="/reports"
      />
      
      <StatsCard 
        icon={<UserPlus className="h-5 w-5 text-accent" />}
        iconBgColor="bg-accent/10"
        title="New Clients (Month)"
        value={newClients}
        linkText="View clients"
        linkHref="/clients"
      />
      
      <StatsCard 
        icon={<CreditCard className="h-5 w-5 text-purple-600" />}
        iconBgColor="bg-purple-100"
        title="Active Memberships"
        value={activeMemberships}
        linkText="Manage memberships"
        linkHref="/memberships"
      />
    </div>
  );
};

export default StatsOverview;
