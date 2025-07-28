import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Star,
  User,
  Phone,
  Mail
} from "lucide-react";

interface ClientAnalyticsProps {
  clientId: number;
  clientName: string;
}

interface ClientStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalSpent: number;
  averageAppointmentValue: number;
  lastAppointment: string | null;
  nextAppointment: string | null;
  favoriteService: string | null;
  communicationPreferences: {
    emailAccountManagement: boolean;
    emailAppointmentReminders: boolean;
    emailPromotions: boolean;
    smsAccountManagement: boolean;
    smsAppointmentReminders: boolean;
    smsPromotions: boolean;
  };
}

export default function ClientAnalytics({ clientId, clientName }: ClientAnalyticsProps) {
  const { data: stats, isLoading } = useQuery<ClientStats>({
    queryKey: ['/api/clients', clientId, 'analytics'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch client analytics');
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'None';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Client Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Client Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = stats.totalAppointments > 0 
    ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Client Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Appointment Stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Appointments</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalAppointments}
            </div>
          </div>

          {/* Spending Stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total Spent</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(stats.totalSpent)}
            </div>
          </div>

          {/* Completion Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Completion Rate</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {completionRate}%
            </div>
          </div>

          {/* Average Value */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Avg. Appointment</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(stats.averageAppointmentValue)}
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Appointment Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {stats.completedAppointments}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cancelled:</span>
                <Badge variant="destructive">
                  {stats.cancelledAppointments}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Appointment:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(stats.lastAppointment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Next Appointment:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(stats.nextAppointment)}
                </span>
              </div>
              {stats.favoriteService && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Favorite Service:</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {stats.favoriteService}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Communication Preferences */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Communication Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">Email Notifications:</span>
                <div className="flex gap-1">
                  <Badge variant={stats.communicationPreferences.emailAccountManagement ? "default" : "secondary"}>
                    Account
                  </Badge>
                  <Badge variant={stats.communicationPreferences.emailAppointmentReminders ? "default" : "secondary"}>
                    Reminders
                  </Badge>
                  <Badge variant={stats.communicationPreferences.emailPromotions ? "default" : "secondary"}>
                    Promotions
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">SMS Notifications:</span>
                <div className="flex gap-1">
                  <Badge variant={stats.communicationPreferences.smsAccountManagement ? "default" : "secondary"}>
                    Account
                  </Badge>
                  <Badge variant={stats.communicationPreferences.smsAppointmentReminders ? "default" : "secondary"}>
                    Reminders
                  </Badge>
                  <Badge variant={stats.communicationPreferences.smsPromotions ? "default" : "secondary"}>
                    Promotions
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 